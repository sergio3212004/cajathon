# Cajathon · CajaEscudo

Prototipo funcional del desafío **RIE-01: inteligencia predictiva de riesgo
climático y crediticio para microfinanzas**.

CajaEscudo explora la cadena amenaza → negocio → flujo → presión de pago →
impacto en cartera → prevención. Está pensado para analistas de riesgos y para
una demostración explicable ante los jueces de Cajathon.

## Ejecutar

Requiere Bun:

```sh
cd apps/web
bun install --frozen-lockfile
bun run dev
```

Abre la URL que muestra Vite (normalmente `http://localhost:5173`).

```sh
bun run test
bun run build
```

## Qué funciona

- 60 clientes sintéticos, cinco segmentos y cinco amenazas.
- Mapa real OpenStreetMap, puntos ficticios y capa de calor calculada.
- Actualización Beta–Bernoulli y Monte Carlo con choques compartidos.
- Función logística de estrés **no entrenada**, pérdida crediticia supuesta,
  histograma y comparación base/estrés/prevención.
- Planificación preventiva mediante mochila 0/1 bajo presupuesto.
- Agentes locales deterministas con trazas de herramientas.
- Revisión humana almacenada en el navegador y exportación CSV.
- Análisis automático al cambiar condiciones, filtros o presupuesto.

No necesita API, credenciales ni Neon. Fuentes y logos se sirven localmente;
el mapa base necesita internet. Las simulaciones funcionan sin mosaicos externos.

## Documentación

| Archivo | Contenido |
|---|---|
| [`docs/cajaescudo-rie01.md`](docs/cajaescudo-rie01.md) | Diseño, evaluación de modelos, fórmulas, límites y guion de demo |
| [`apps/web/README.md`](apps/web/README.md) | Aplicación y estructura |
| [`apps/api/README.md`](apps/api/README.md) | API FastAPI existente, no conectada a esta demo |
| [`design/cajaescudo/README.md`](design/cajaescudo/README.md) | Mockups SVG anteriores; no son la aplicación actual |
| [`docs/prototipo-cauce.md`](docs/prototipo-cauce.md) | Entrega histórica NEG-01 |

## Límites

**Datos y escenarios sintéticos.** No se integran avisos oficiales ni datos
financieros reales. No hay predicción calibrada, provisión regulatoria,
contacto a clientes ni modificación automática de créditos. Los agentes
son software determinista local, **no LLM conectados**.

Figma: el archivo anterior se conserva, pero la cuenta MCP actualmente
conectada no tiene acceso de edición. Esta versión funcional vive en código;
no se afirma haberla sincronizado a Figma.
