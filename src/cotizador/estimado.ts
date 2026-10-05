// Cálculo del estimado: 100% determinista. La IA nunca pone precios ni totales;
// solo propone materiales. Los precios salen del catálogo de BSAM HVAC.
import type { Material } from "./materiales.ts";

export interface ParametrosEstimado {
  horasManoObra: number;
  tarifaHora: number;
  /** Margen sobre costo de materiales, p. ej. 0.25 = 25%. */
  margenMateriales: number;
  /** Impuesto sobre el subtotal, p. ej. 0.15. */
  impuesto: number;
}

export interface LineaEstimado extends Material {
  precioUnitario: number;
  total: number;
}

export interface Estimado {
  lineas: LineaEstimado[];
  /** Materiales sin precio en catálogo: requieren revisión manual antes de enviar al cliente. */
  sinPrecio: Material[];
  materiales: number;
  manoObra: number;
  subtotal: number;
  impuesto: number;
  total: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcularEstimado(
  materiales: Material[],
  catalogo: Record<string, number>,
  p: ParametrosEstimado,
): Estimado {
  const lineas: LineaEstimado[] = [];
  const sinPrecio: Material[] = [];

  for (const m of materiales) {
    const costo = catalogo[m.codigo];
    if (costo === undefined) {
      sinPrecio.push(m);
      continue;
    }
    const precioUnitario = r2(costo * (1 + p.margenMateriales));
    lineas.push({ ...m, precioUnitario, total: r2(precioUnitario * m.cantidad) });
  }

  const totalMateriales = r2(lineas.reduce((s, l) => s + l.total, 0));
  const manoObra = r2(p.horasManoObra * p.tarifaHora);
  const subtotal = r2(totalMateriales + manoObra);
  const impuesto = r2(subtotal * p.impuesto);

  return {
    lineas,
    sinPrecio,
    materiales: totalMateriales,
    manoObra,
    subtotal,
    impuesto,
    total: r2(subtotal + impuesto),
  };
}
