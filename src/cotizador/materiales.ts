// Listas de materiales: OmniRoute propone/ajusta la lista; si no está disponible,
// se usa una plantilla local determinista para que el cotizador nunca se detenga.
import { OmniRouteCliente, OmniRouteError } from "../omniroute/cliente.ts";

export type TipoSistema = "minisplit" | "split_ducto" | "paquete";

export interface Proyecto {
  tipoSistema: TipoSistema;
  toneladas: number;
  distanciaTuberiaPies: number;
  /** Lo que el técnico observó en la visita (texto libre). */
  notas?: string;
}

export interface Material {
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
}

export interface ListaMateriales {
  materiales: Material[];
  origen: "ia" | "plantilla";
  /** Mensaje para mostrar en la UI cuando se usó la plantilla. */
  aviso?: string;
  /** Proveedor/estrategia de OmniRoute que respondió (para auditoría). */
  decision?: string | null;
}

export function plantillaMateriales(p: Proyecto): Material[] {
  const pies = Math.max(15, Math.ceil(p.distanciaTuberiaPies * 1.1)); // 10% de holgura
  const comunes: Material[] = [
    { codigo: "TUB-COBRE-SET", descripcion: "Juego de tubería de cobre aislada", unidad: "pie", cantidad: pies },
    { codigo: "CABLE-14-3", descripcion: "Cable de control 14/3", unidad: "pie", cantidad: pies },
    { codigo: "DRENAJE-PVC", descripcion: "Tubería PVC 3/4\" para drenaje", unidad: "pie", cantidad: Math.ceil(pies / 2) },
    { codigo: "BREAKER", descripcion: "Breaker/desconectador según amperaje del equipo", unidad: "u", cantidad: 1 },
    { codigo: "SELLADOR", descripcion: "Sellador, cinta y abrazaderas", unidad: "kit", cantidad: 1 },
  ];
  switch (p.tipoSistema) {
    case "minisplit":
      return [
        { codigo: `EQ-MINISPLIT-${p.toneladas}T`, descripcion: `Equipo minisplit ${p.toneladas} TR`, unidad: "u", cantidad: 1 },
        { codigo: "SOPORTE-CONDENSADORA", descripcion: "Soporte de pared para condensadora", unidad: "u", cantidad: 1 },
        ...comunes,
      ];
    case "split_ducto":
      return [
        { codigo: `EQ-SPLIT-${p.toneladas}T`, descripcion: `Condensadora + manejadora ${p.toneladas} TR`, unidad: "u", cantidad: 1 },
        { codigo: "PLENUM", descripcion: "Plenum de suministro y retorno", unidad: "u", cantidad: 2 },
        { codigo: "DUCTO-FLEX-8", descripcion: "Ducto flexible aislado 8\"", unidad: "pie", cantidad: Math.ceil(p.toneladas * 50) },
        { codigo: "REJILLA", descripcion: "Rejilla de suministro", unidad: "u", cantidad: Math.ceil(p.toneladas * 2) },
        { codigo: "TERMOSTATO", descripcion: "Termostato digital", unidad: "u", cantidad: 1 },
        { codigo: "BASE-CONDENSADORA", descripcion: "Base de concreto/plástico para condensadora", unidad: "u", cantidad: 1 },
        ...comunes,
      ];
    case "paquete":
      return [
        { codigo: `EQ-PAQUETE-${p.toneladas}T`, descripcion: `Unidad paquete ${p.toneladas} TR`, unidad: "u", cantidad: 1 },
        { codigo: "DUCTO-FLEX-8", descripcion: "Ducto flexible aislado 8\"", unidad: "pie", cantidad: Math.ceil(p.toneladas * 50) },
        { codigo: "REJILLA", descripcion: "Rejilla de suministro", unidad: "u", cantidad: Math.ceil(p.toneladas * 2) },
        { codigo: "TERMOSTATO", descripcion: "Termostato digital", unidad: "u", cantidad: 1 },
        { codigo: "BREAKER", descripcion: "Breaker/desconectador según amperaje del equipo", unidad: "u", cantidad: 1 },
        { codigo: "SELLADOR", descripcion: "Sellador, cinta y abrazaderas", unidad: "kit", cantidad: 1 },
      ];
  }
}

const SISTEMA = `Eres el asistente de BSAM HVAC Services. Recibes un proyecto de climatización y una
lista base de materiales. Ajusta cantidades y agrega SOLO materiales necesarios según las notas.
Usa los códigos del catálogo cuando existan; si un material no está en el catálogo, usa un código
que empiece por "NUEVO-". No incluyas precios. Responde únicamente JSON:
{"materiales":[{"codigo":string,"descripcion":string,"unidad":string,"cantidad":number}]}`;

export async function generarListaMateriales(
  proyecto: Proyecto,
  opciones: { cliente?: OmniRouteCliente; codigosCatalogo?: string[]; estimadoId?: string } = {},
): Promise<ListaMateriales> {
  const base = plantillaMateriales(proyecto);
  const respaldo = (aviso: string): ListaMateriales => ({ materiales: base, origen: "plantilla", aviso });

  let cliente = opciones.cliente;
  if (!cliente) {
    try {
      cliente = OmniRouteCliente.desdeEntorno();
    } catch {
      return respaldo("Asistente IA no configurado: se usó la plantilla estándar.");
    }
  }

  try {
    const r = await cliente.chat(
      [
        { role: "system", content: SISTEMA },
        {
          role: "user",
          content: JSON.stringify({ proyecto, listaBase: base, catalogo: opciones.codigosCatalogo ?? [] }),
        },
      ],
      { json: true, temperatura: 0, sesionId: opciones.estimadoId },
    );
    const materiales = validarMateriales(r.texto);
    if (!materiales) return respaldo("La IA devolvió una lista inválida: se usó la plantilla estándar.");
    return { materiales, origen: "ia", decision: r.decision };
  } catch (e) {
    if (!(e instanceof OmniRouteError)) throw e;
    if (!e.usarRespaldo) {
      // Error de configuración (API key, combo inexistente): debe verlo quien administra, no solo el usuario.
      console.error(`[omniroute] ${e.tipo}: ${e.message}`);
      return respaldo("Asistente IA mal configurado (avisar a administración): se usó la plantilla estándar.");
    }
    return respaldo("Asistente IA no disponible en este momento: se usó la plantilla estándar.");
  }
}

export function validarMateriales(texto: string): Material[] | null {
  let datos: unknown;
  try {
    datos = JSON.parse(texto.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
  const lista = (datos as { materiales?: unknown })?.materiales;
  if (!Array.isArray(lista) || lista.length === 0) return null;
  const ok = lista.every(
    (m) =>
      typeof m?.codigo === "string" && m.codigo.trim() !== "" &&
      typeof m.descripcion === "string" &&
      typeof m.unidad === "string" &&
      typeof m.cantidad === "number" && Number.isFinite(m.cantidad) && m.cantidad > 0,
  );
  return ok ? (lista as Material[]) : null;
}
