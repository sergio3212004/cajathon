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

- `src/EscudoApp.vue`: seis vistas, análisis automático, revisiones locales y CSV.
- `src/escudo.css`: identidad y layouts adaptables.
- `src/domain/escudo.ts`: cartera sintética, Beta, Monte Carlo, logit,
  optimizador y coordinación de agentes locales.
- `src/domain/escudo.test.ts`: pruebas del nuevo motor.
- `src/domain/supply.ts`: tres cadenas ficticias y balance diario de inventario;
  sustitución, sobrecostos y escenarios de prueba.
- `src/domain/workflow.ts`: transiciones de seguimiento con revisión obligatoria.
- `src/domain/supply.test.ts`: conservación, propagación, filtros, calidad de datos
  y aprobación/entrega/cierre.
- `src/components/SupplyWorkbench.vue`: cadena de impacto, controles de red,
  inventario, comparación de canales y clientes dependientes.
- `src/components/PreventiveFollowup.vue`: seguimiento local simulado.
- `src/components/EvidenceCatalog.vue`: fuentes previstas y límites de acceso,
  sin presentar consultas oficiales como ejecutadas.
- `src/domain/workspace.ts`: secciones operativas y enlaces estables.
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

Se guardan revisiones sintéticas en `localStorage` bajo
`cajaescudo-reviews-v1`, con máximo 100 registros. La clave de revisión incluye
versión, parámetros de red y contenido de los clientes analizados.
El seguimiento usa `cajaescudo-followup-v1`, máximo 100 casos. La huella es un
checksum local, no firma criptográfica. No hay auditoría institucional,
autenticación ni envíos. Si se bloquea almacenamiento, se informa que los
registros duran solo en memoria.

El único recurso externo de la aplicación es el mapa base OpenStreetMap.
Recibe solicitudes de mosaicos según la zona visible; no se envía la cartera
ni se consulta un LLM. Cumplir la política de uso de mosaicos antes de escalar
el prototipo. Si no cargan, la lista de clientes sigue disponible.

Los parámetros se aplican automáticamente tras 250 ms sin cambios. Se cancela
el cálculo anterior para no encolar trabajo obsoleto. Durante la actualización,
los resultados anteriores se atenúan y exportación/revisión permanecen bloqueadas.
Cambiar distrito o segmento recalcula la cartera y todas sus métricas.
La búsqueda por texto solo filtra la lista, no altera el universo del escenario.

## Demostración

1. Abrir Monitoreo y observar el calor por daño relativo o presión de pago.
2. Seleccionar un cliente en el mapa o en la lista accesible.
3. Cambiar a intensidad cero: el daño desaparece, el riesgo crediticio base no.
4. Restaurar 75% y abrir Riesgo de cartera: revisar histograma y puente.
5. Cambiar presupuesto y comparar las intervenciones actualizadas automáticamente.
6. Abrir Seguimiento, guardar revisión y comprobar el historial local.
7. Exportar CSV; contrastar valores, semilla y supuestos.

### Recorrido interregional CE-2.0

1. Abrir **Abastecimiento** y seleccionar **Desastre distante** en Escenario guardado.
2. Revisar que el daño físico sea cero, pero aparezcan pérdidas operativas
   indirectas y presión de pago en clientes fuera del origen.
3. Seleccionar **Proveedor alternativo** y **Reserva de inventario**: mantienen
   semilla, horizonte y cartera; modifican abastecimiento o inventario.
4. Cambiar origen a Ica o Junín para analizar otras dependencias de prueba.
5. En **Configuración → Calidad de datos de la red**, elegir **Insuficientes**:
   la última salida se marca no vigente y se bloquea exportación/revisión.
   Restaurar **Completos**.
6. Desde un cliente dependiente, abrir **Revisar caso**. Registrar evidencia
   sintética, aprobar tarea, simular fallo/entrega, ejecución y cierre.
7. Cambiar parámetros: la revisión y el seguimiento no se reutilizan para una
   huella distinta.

Consulta [`../../docs/simulacion-red-ce2.md`](../../docs/simulacion-red-ce2.md)
para la metodología y los límites actuales.

La interfaz usa títulos operativos, enlaces por sección y detalles técnicos
desplegables. Ver [`../../docs/diseno-mvp-operativo.md`](../../docs/diseno-mvp-operativo.md).

Consulta [`../../docs/cajaescudo-rie01.md`](../../docs/cajaescudo-rie01.md)
para el registro metodológico de la versión inicial.
