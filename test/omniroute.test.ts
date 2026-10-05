import { test } from "node:test";
import assert from "node:assert/strict";
import { OmniRouteCliente, OmniRouteError } from "../src/omniroute/cliente.ts";
import { generarListaMateriales, plantillaMateriales, validarMateriales } from "../src/cotizador/materiales.ts";
import { calcularEstimado } from "../src/cotizador/estimado.ts";

const sinEspera = async () => {};

function respuesta(status: number, cuerpo: unknown, headers: Record<string, string> = {}) {
  return new Response(typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo), { status, headers });
}

function clienteCon(respuestas: (() => Response | Promise<Response>)[], extra = {}) {
  const llamadas: RequestInit[] = [];
  const fetchFalso = (async (_url: string, init: RequestInit) => {
    llamadas.push(init);
    const siguiente = respuestas.shift();
    if (!siguiente) throw new Error("sin más respuestas");
    return siguiente();
  }) as unknown as typeof fetch;
  const cliente = new OmniRouteCliente({
    url: "https://omni.example.app/v1/",
    apiKey: "k",
    modelo: "bsam-estimados",
    fetch: fetchFalso,
    esperar: sinEspera,
    ...extra,
  });
  return { cliente, llamadas };
}

const ok = (contenido: string) => () =>
  respuesta(200, { model: "x", choices: [{ message: { content: contenido } }] }, {
    "x-omniroute-decision": "strategy=priority; provider=anthropic; latency_ms=900",
  });

test("reintenta 503 y devuelve la respuesta y la decisión de ruteo", async () => {
  const { cliente, llamadas } = clienteCon([() => respuesta(503, "caído"), ok("hola")]);
  const r = await cliente.chat([{ role: "user", content: "hola" }]);
  assert.equal(r.texto, "hola");
  assert.match(r.decision!, /strategy=priority/);
  assert.equal(llamadas.length, 2);
  assert.equal((llamadas[0].headers as Record<string, string>).Authorization, "Bearer k");
});

test("401 no se reintenta y no usa respaldo", async () => {
  const { cliente, llamadas } = clienteCon([() => respuesta(401, "no")]);
  await assert.rejects(cliente.chat([{ role: "user", content: "x" }]), (e: OmniRouteError) => {
    assert.equal(e.tipo, "autenticacion");
    assert.equal(e.usarRespaldo, false);
    return true;
  });
  assert.equal(llamadas.length, 1);
});

test("abre el circuito tras fallos seguidos y deja de llamar", async () => {
  const caido = () => { throw new TypeError("fetch failed"); };
  const { cliente, llamadas } = clienteCon(Array(10).fill(caido), { reintentos: 0, umbralCircuito: 2 });
  await assert.rejects(cliente.chat([{ role: "user", content: "x" }]));
  await assert.rejects(cliente.chat([{ role: "user", content: "x" }]));
  const antes = llamadas.length;
  await assert.rejects(cliente.chat([{ role: "user", content: "x" }]), /marcado como caído/);
  assert.equal(llamadas.length, antes);
});

const proyecto = { tipoSistema: "minisplit" as const, toneladas: 1.5, distanciaTuberiaPies: 20 };

test("usa la lista de la IA cuando es válida", async () => {
  const json = JSON.stringify({ materiales: [{ codigo: "TUB-COBRE-SET", descripcion: "Cobre", unidad: "pie", cantidad: 25 }] });
  const { cliente } = clienteCon([ok(json)]);
  const lista = await generarListaMateriales(proyecto, { cliente });
  assert.equal(lista.origen, "ia");
  assert.equal(lista.materiales[0].cantidad, 25);
});

test("cae a la plantilla si OmniRoute no está disponible", async () => {
  const caido = () => { throw new TypeError("fetch failed"); };
  const { cliente } = clienteCon([caido, caido, caido]);
  const lista = await generarListaMateriales(proyecto, { cliente });
  assert.equal(lista.origen, "plantilla");
  assert.deepEqual(lista.materiales, plantillaMateriales(proyecto));
  assert.match(lista.aviso!, /no disponible/);
});

test("cae a la plantilla si la IA devuelve JSON inválido", async () => {
  const { cliente } = clienteCon([ok('{"materiales":[{"codigo":"X","cantidad":-1}]}')]);
  const lista = await generarListaMateriales(proyecto, { cliente });
  assert.equal(lista.origen, "plantilla");
});

test("validarMateriales acepta JSON envuelto en ```json", () => {
  const m = validarMateriales('```json\n{"materiales":[{"codigo":"A","descripcion":"a","unidad":"u","cantidad":1}]}\n```');
  assert.equal(m?.length, 1);
});

test("calcularEstimado aplica margen, mano de obra e impuesto y separa lo que no tiene precio", () => {
  const e = calcularEstimado(
    [
      { codigo: "A", descripcion: "a", unidad: "u", cantidad: 2 },
      { codigo: "NUEVO-X", descripcion: "x", unidad: "u", cantidad: 1 },
    ],
    { A: 100 },
    { horasManoObra: 4, tarifaHora: 25, margenMateriales: 0.25, impuesto: 0.15 },
  );
  assert.equal(e.materiales, 250);
  assert.equal(e.manoObra, 100);
  assert.equal(e.subtotal, 350);
  assert.equal(e.impuesto, 52.5);
  assert.equal(e.total, 402.5);
  assert.equal(e.sinPrecio[0].codigo, "NUEVO-X");
});
