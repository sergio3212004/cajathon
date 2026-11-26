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
- 48 negocios en La Libertad y 12 ejemplos distantes en Lima, Arequipa y Junín.
- Tres cadenas interregionales ficticias: alimentos, textiles e insumos productivos.
- Simulación de inventario, sustitución y sobrecostos con choque de origen compartido.
- Escenarios de prueba: desastre distante, proveedor alternativo, reserva,
  intensidad cero y datos insuficientes; separación de canales directo/indirecto.
- Mapa real OpenStreetMap, puntos ficticios y capa de calor calculada.
- Actualización Beta–Bernoulli y Monte Carlo con choques compartidos.
- Función logística de estrés **no entrenada**, pérdida crediticia supuesta,
  histograma y comparación base/estrés/prevención.
- Planificación mediante mochila 0/1 sobre daño físico y pérdida operativa evitados.
- Agentes locales deterministas con trazas de herramientas.
- Revisión humana, seguimiento simulado hasta cierre y exportación CSV ampliada.
- Bloqueo de nuevas estimaciones y acciones cuando faltan/vencen datos de red.
- Análisis automático al cambiar condiciones, filtros o presupuesto.

No necesita API, credenciales ni Neon. Fuentes y logos se sirven localmente;
el mapa base necesita internet. Las simulaciones funcionan sin mosaicos externos.

## Documentación

| Archivo | Contenido |
|---|---|
| [`docs/simulacion-red-ce2.md`](docs/simulacion-red-ce2.md) | Versión actual CE-2.0: cadenas, fórmulas, escenarios de prueba y seguimiento |
| [`docs/diseno-mvp-operativo.md`](docs/diseno-mvp-operativo.md) | Navegación por tareas, jerarquía de información y criterios de interfaz |
| [`docs/cajaescudo-rie01.md`](docs/cajaescudo-rie01.md) | Diseño y metodología de la versión inicial CE-1.0; registro histórico |
| [`docs/plan-evolucion-rie01.md`](docs/plan-evolucion-rie01.md) | Plan futuro: automatización, cadenas de suministro, modelos, interfaz y entregables |
| [`docs/fuentes-integraciones-rie01.md`](docs/fuentes-integraciones-rie01.md) | Fuentes oficiales, APIs, restricciones de acceso y contratos de datos propuestos |
| [`docs/alternativas-llm-costos.md`](docs/alternativas-llm-costos.md) | Alternativas gratuitas/económicas a la API de OpenAI, costos y evaluación pendiente |
| [`apps/web/README.md`](apps/web/README.md) | Aplicación y estructura |
| [`apps/api/README.md`](apps/api/README.md) | API FastAPI existente, no conectada a esta demo |
| [`design/cajaescudo/README.md`](design/cajaescudo/README.md) | Mockups SVG anteriores; no son la aplicación actual |
| [`docs/prototipo-cauce.md`](docs/prototipo-cauce.md) | Entrega histórica NEG-01 |

## Límites

El plan de evolución distingue el objetivo futuro de lo implementado en la
simulación CE-2.0. Las APIs oficiales y los proveedores LLM siguen **pendientes**.
Esta versión no activa suscripciones ni servicios de pago.

**Datos y escenarios sintéticos.** No se integran avisos oficiales ni datos
financieros reales. No hay predicción calibrada, provisión regulatoria,
contacto a clientes ni modificación automática de créditos. Los agentes
son software determinista local, **no LLM conectados**.

Figma: el archivo anterior se conserva, pero la cuenta MCP actualmente
conectada no tiene acceso de edición. Esta versión funcional vive en código;
no se afirma haberla sincronizado a Figma.
