// Cliente mínimo para OmniRoute (endpoint OpenAI-compatible /v1/chat/completions).
// Sin dependencias: usa fetch nativo de Node 22.

export type TipoErrorOmniRoute =
  | "no_disponible" // red caída, 5xx, Railway dormido o circuito abierto → usar respaldo
  | "timeout"
  | "limite" // 429: todos los proveedores del combo sin cuota
  | "autenticacion" // 401/403: API key inválida → no reintentar, avisar
  | "solicitud_invalida" // 400/404/422: modelo o combo inexistente, payload mal formado
  | "respuesta_invalida"; // llegó 200 pero el contenido no sirve

export class OmniRouteError extends Error {
  readonly tipo: TipoErrorOmniRoute;
  readonly status?: number;
  /** Espera sugerida por el header Retry-After (429). */
  retryAfterMs?: number;

  constructor(tipo: TipoErrorOmniRoute, mensaje: string, status?: number) {
    super(mensaje);
    this.name = "OmniRouteError";
    this.tipo = tipo;
    this.status = status;
  }

  /** ¿Tiene sentido caer al cálculo local en vez de mostrar error al usuario? */
  get usarRespaldo(): boolean {
    return this.tipo !== "autenticacion" && this.tipo !== "solicitud_invalida";
  }
}

export interface MensajeChat {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpcionesChat {
  modelo?: string;
  temperatura?: number;
  maxTokens?: number;
  /** Pide JSON estricto al modelo (response_format json_object). */
  json?: boolean;
  /** Etiqueta para agrupar costos por estimado en el dashboard de OmniRoute. */
  sesionId?: string;
}

export interface RespuestaChat {
  texto: string;
  modelo: string;
  /** Header X-OmniRoute-Decision: estrategia/proveedor que atendió la solicitud. */
  decision: string | null;
}

export interface ConfigOmniRoute {
  url: string;
  apiKey: string;
  modelo: string;
  timeoutMs?: number;
  reintentos?: number;
  /** Fallos seguidos antes de abrir el circuito. */
  umbralCircuito?: number;
  /** Tiempo que el circuito queda abierto antes de volver a probar. */
  enfriamientoMs?: number;
  fetch?: typeof fetch;
  esperar?: (ms: number) => Promise<void>;
}

export class OmniRouteCliente {
  private readonly cfg: Required<Omit<ConfigOmniRoute, "fetch" | "esperar">>;
  private readonly fetchFn: typeof fetch;
  private readonly esperar: (ms: number) => Promise<void>;
  private fallosSeguidos = 0;
  private circuitoAbiertoHasta = 0;

  constructor(config: ConfigOmniRoute) {
    this.cfg = {
      timeoutMs: 30_000,
      reintentos: 2,
      umbralCircuito: 3,
      enfriamientoMs: 60_000,
      ...config,
      url: config.url.replace(/\/+$/, "").replace(/\/v1$/, ""),
    };
    this.fetchFn = config.fetch ?? fetch;
    this.esperar = config.esperar ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  static desdeEntorno(env: NodeJS.ProcessEnv = process.env): OmniRouteCliente {
    const { OMNIROUTE_URL, OMNIROUTE_API_KEY } = env;
    if (!OMNIROUTE_URL || !OMNIROUTE_API_KEY) {
      throw new OmniRouteError("autenticacion", "Faltan OMNIROUTE_URL u OMNIROUTE_API_KEY.");
    }
    return new OmniRouteCliente({
      url: OMNIROUTE_URL,
      apiKey: OMNIROUTE_API_KEY,
      modelo: env.OMNIROUTE_MODELO_COTIZADOR ?? "bsam-estimados",
    });
  }

  async disponible(): Promise<boolean> {
    try {
      const res = await this.fetchFn(`${this.cfg.url}/healthz`, { signal: AbortSignal.timeout(5_000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  async chat(mensajes: MensajeChat[], opciones: OpcionesChat = {}): Promise<RespuestaChat> {
    if (Date.now() < this.circuitoAbiertoHasta) {
      throw new OmniRouteError("no_disponible", "OmniRoute marcado como caído; se reintentará más tarde.");
    }

    let ultimoError: OmniRouteError | undefined;
    for (let intento = 0; intento <= this.cfg.reintentos; intento++) {
      try {
        const respuesta = await this.intentar(mensajes, opciones);
        this.fallosSeguidos = 0;
        return respuesta;
      } catch (e) {
        ultimoError = e as OmniRouteError;
        if (!ultimoError.usarRespaldo || ultimoError.tipo === "respuesta_invalida") throw ultimoError;
        if (intento < this.cfg.reintentos) {
          await this.esperar(ultimoError.retryAfterMs ?? backoff(intento));
        }
      }
    }

    if (++this.fallosSeguidos >= this.cfg.umbralCircuito) {
      this.circuitoAbiertoHasta = Date.now() + this.cfg.enfriamientoMs;
      this.fallosSeguidos = 0;
    }
    throw ultimoError!;
  }

  private async intentar(mensajes: MensajeChat[], op: OpcionesChat): Promise<RespuestaChat> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.cfg.apiKey}`,
      "Content-Type": "application/json",
    };
    if (op.sesionId) headers["X-OmniRoute-Session-Id"] = op.sesionId;

    let res: Response;
    try {
      res = await this.fetchFn(`${this.cfg.url}/v1/chat/completions`, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(this.cfg.timeoutMs),
        body: JSON.stringify({
          model: op.modelo ?? this.cfg.modelo,
          messages: mensajes,
          temperature: op.temperatura ?? 0.2,
          max_tokens: op.maxTokens ?? 2_000,
          ...(op.json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
    } catch (e) {
      const esTimeout = (e as Error).name === "TimeoutError";
      throw new OmniRouteError(esTimeout ? "timeout" : "no_disponible", (e as Error).message);
    }

    if (!res.ok) {
      const detalle = (await res.text().catch(() => "")).slice(0, 300);
      const err = new OmniRouteError(clasificar(res.status), `OmniRoute ${res.status}: ${detalle}`, res.status);
      const retryAfter = Number(res.headers.get("retry-after"));
      if (retryAfter > 0) err.retryAfterMs = Math.min(retryAfter * 1000, 30_000);
      throw err;
    }

    const cuerpo = (await res.json().catch(() => null)) as {
      model?: string;
      choices?: { message?: { content?: string } }[];
    } | null;
    const texto = cuerpo?.choices?.[0]?.message?.content;
    if (!texto) throw new OmniRouteError("respuesta_invalida", "Respuesta sin contenido.", res.status);

    return {
      texto,
      modelo: cuerpo?.model ?? op.modelo ?? this.cfg.modelo,
      decision: res.headers.get("x-omniroute-decision"),
    };
  }
}

function clasificar(status: number): TipoErrorOmniRoute {
  if (status === 401 || status === 403) return "autenticacion";
  if (status === 429) return "limite";
  if (status === 408 || status === 504) return "timeout";
  if (status >= 500) return "no_disponible";
  return "solicitud_invalida";
}

function backoff(intento: number): number {
  const base = 500 * 2 ** intento;
  return base + Math.random() * base * 0.3; // jitter para no golpear todos a la vez
}
