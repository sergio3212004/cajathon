# CajaEscudo · RIE-01

Vue 3 + Vite + TypeScript + Nuxt UI para Vue, Leaflet y motor estadístico en
Web Worker. No requiere el framework Nuxt, una API ni credenciales.

```sh
bun install --frozen-lockfile
bun run dev
bun run test
bun run build
```

## Estructura activa

- `src/EscudoApp.vue`: cinco vistas, controles, revisiones locales, CSV y tour.
- `src/escudo.css`: identidad y layouts adaptables.
- `src/domain/escudo.ts`: cartera sintética, Beta, Monte Carlo, logit,
  optimizador y coordinación de agentes locales.
- `src/domain/escudo.test.ts`: pruebas del nuevo motor.
- `src/workers/risk.worker.ts`: ejecución fuera del hilo de interfaz,
  propagación de errores y descarte de respuestas obsoletas por ID.
- `src/components/ExposureMap.vue`: Leaflet, mosaicos OpenStreetMap y calor.
- `src/components/LossDistribution.vue`: histograma de resultados calculados.
- `src/components/LossBridge.vue`: puente base/estrés/prevención.
- `public/brand`: logos descargados del sitio oficial de Cajathon.

`src/App.vue`, `src/style.css`, `src/components/RiskMap.vue` y el dominio
`risk.ts` se conservan como implementación anterior de Cauce. `main.ts`
monta `EscudoApp.vue`; no monta la interfaz histórica.

## Persistencia y red

Solo se guardan revisiones sintéticas en `localStorage` bajo
`cajaescudo-reviews-v1`, con máximo 100 registros. La clave de revisión incluye
versión, parámetros y clientes analizados. No hay auditoría institucional,
autenticación ni envíos. Si se bloquea almacenamiento, se informa que la
revisión dura solo en memoria.

El único recurso externo de la aplicación es el mapa base OpenStreetMap.
Recibe solicitudes de mosaicos según la zona visible; no se envía la cartera
ni se consulta un LLM. Cumplir la política de uso de mosaicos antes de escalar
el prototipo. Si no cargan, la lista de clientes sigue disponible.

Los parámetros cambiados invalidan exportación y revisión hasta ejecutar.
Cambiar distrito o segmento recalcula la cartera y todas sus métricas.
La búsqueda por texto solo filtra la lista, no altera el universo del escenario.

## Demostración

1. Abrir Territorio y observar el calor por daño relativo o presión de pago.
2. Seleccionar un cliente en el mapa o en la lista accesible.
3. Ejecutar con intensidad cero: el daño desaparece, el riesgo crediticio base no.
4. Restaurar 75% y abrir Cartera y pérdidas: revisar histograma y puente.
5. Cambiar presupuesto, recalcular y comparar intervenciones.
6. Abrir Agentes, registrar evidencia sintética y comprobar el historial local.
7. Exportar CSV; contrastar valores, semilla y supuestos.

Consulta [`../../docs/cajaescudo-rie01.md`](../../docs/cajaescudo-rie01.md)
para fórmulas, criterios estadísticos y advertencias.
