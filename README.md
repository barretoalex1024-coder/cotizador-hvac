# Cotizador HVAC

Aplicación web para generar cotizaciones de sistemas de aire acondicionado y climatización (HVAC). Permite calcular costos de equipos, instalación y mantenimiento de manera rápida y precisa.

## IA con OmniRoute

El cotizador usa [OmniRoute](https://github.com/diegosouzapw/OmniRoute) (desplegado en Railway) para
generar listas de materiales, y Claude Code puede enrutar todas sus solicitudes por el mismo gateway.
Los precios y totales siempre se calculan en código. Guía completa: [docs/OMNIROUTE.md](docs/OMNIROUTE.md).

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # pruebas del cliente OmniRoute y estimados
```
