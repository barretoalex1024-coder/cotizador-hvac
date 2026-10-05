# OmniRoute + Claude Code + BSAM HVAC

```
Claude Code ─┐
             ├──► OmniRoute (Railway) ──► Anthropic / otros proveedores (con fallback)
BSAM HVAC ───┘        /v1/messages  (Claude Code)
(estimados)           /v1/chat/completions  (cotizador)
```

> `bsam-hvac-production.up.railway.app` es **la plataforma**, no OmniRoute.
> OmniRoute es un servicio aparte con su propia URL.

## 1. Desplegar OmniRoute en Railway (una sola vez)

1. Railway → proyecto **bsam-hvac** → **+ Create** → **GitHub Repo** → `cotizador-hvac`.
2. En el servicio nuevo: **Settings → Source → Root Directory** = `/omniroute`.
   Railway usará `omniroute/Dockerfile` y `omniroute/railway.json` (healthcheck en `/healthz`).
3. **Settings → Volumes → Add Volume** con mount path `/app/data`
   (sin volumen se pierden proveedores, combos y API keys en cada reinicio).
4. **Variables → Raw Editor**: pega lo que imprime `bash omniroute/generar-secretos.sh`.
   `REQUIRE_API_KEY=true` es obligatorio: sin eso cualquiera en internet puede usar tus créditos.
5. **Settings → Networking → Generate Domain** (puerto 20128). Esa es tu `OMNIROUTE_URL`.
6. Entra a esa URL con `INITIAL_PASSWORD` y:
   - **Providers**: conecta Anthropic (tu API key o suscripción) y un respaldo barato.
   - **Combos**: crea los dos combos de la sección 3.
   - **API Keys**: crea una key → esa es tu `OMNIROUTE_API_KEY`.

Railway aplica límites de memoria; si el servicio se reinicia con sesiones largas de
Claude Code, sube `OMNIROUTE_MEMORY_MB` y la memoria del servicio juntos.

## 2. Configurar Claude Code

```bash
npm run omniroute:configurar            # pide URL y key, verifica /healthz y /v1/models
npm run omniroute:claude                # abre Claude Code por OmniRoute (recomendado)
```

- `omniroute:claude` comprueba OmniRoute antes de abrir. Si está caído:
  `OMNIROUTE_FALLBACK=abortar` (por defecto) no abre; `directo` abre contra Anthropic.
- `bash scripts/configurar-omniroute.sh --permanente` escribe `.claude/settings.local.json`
  para que **todas** las sesiones de este proyecto usen OmniRoute sin el script.
  Desventaja: si OmniRoute cae, Claude Code falla hasta que borres ese archivo.
- Para usarlo en **todos** tus proyectos, copia el bloque `env` de
  `.claude/settings.local.example.json` a `~/.claude/settings.json`.
- `ANTHROPIC_BASE_URL` va **sin `/v1`**. Las variables se leen al arrancar: reinicia Claude Code.
- Las sesiones de Claude Code en la nube (claude.ai/code) no pasan por OmniRoute; esto aplica
  a Claude Code en tu computadora.

## 3. Estrategia de enrutamiento

| Combo | Estrategia | Modelos (orden) | Por qué |
|---|---|---|---|
| `bsam-claude-code` | `priority` | Claude (Anthropic) → Claude por otra cuenta/proveedor → modelo de código barato | Calidad primero; solo cambia de modelo si el primero falla o se queda sin cuota. |
| `bsam-estimados` | `priority` | Claude Sonnet/Haiku → GPT/Gemini barato | Resultados consistentes en las listas de materiales; el respaldo mantiene el servicio vivo. |

Evita `random`, `round-robin` y `fusion` para estimados: cambian el modelo entre solicitudes y
la misma obra daría listas distintas. Si el costo de Claude Code sube, prueba `cache-optimized`
(reaprovecha el caché de prompts). Cada respuesta trae el header `X-OmniRoute-Decision` con el
proveedor que atendió; el cotizador lo guarda en `decision`.

## 4. Integración con estimados y listas de materiales

- `src/omniroute/cliente.ts` — cliente para `/v1/chat/completions`.
- `src/cotizador/materiales.ts` — `generarListaMateriales(proyecto)`: la IA ajusta una lista
  base según las notas de la visita.
- `src/cotizador/estimado.ts` — `calcularEstimado(materiales, catalogo, parametros)`:
  precios, margen, mano de obra e impuesto **en código**, nunca por la IA. Lo que no está en
  el catálogo queda en `sinPrecio` para revisión manual.

Variables en el servicio **bsam-hvac** de Railway: `OMNIROUTE_URL`, `OMNIROUTE_API_KEY`,
`OMNIROUTE_MODELO_COTIZADOR=bsam-estimados`. Mejor aún: usa la URL privada de Railway
(`http://<servicio>.railway.internal:20128`) si ambos servicios están en el mismo proyecto.

## 5. Errores si OmniRoute no está disponible

| Situación | Qué hace el cliente | Qué ve el usuario |
|---|---|---|
| Red caída, 5xx, Railway reiniciando | 2 reintentos con espera creciente | Lista de la plantilla + aviso "no disponible" |
| 429 sin cuota en todo el combo | Reintenta respetando `Retry-After` | Plantilla + aviso |
| Timeout (30 s) | Reintenta | Plantilla + aviso |
| 3 fallos seguidos | Circuito abierto 60 s: no llama a OmniRoute | Plantilla inmediata, sin esperas |
| 401/403 (API key) o 400/404 (combo no existe) | No reintenta; `console.error` | Plantilla + "avisar a administración" |
| JSON inválido de la IA | No reintenta | Plantilla |

El cotizador **nunca se bloquea** por la IA: siempre puede emitir el estimado.

## Pruebas

```bash
npm test
```
