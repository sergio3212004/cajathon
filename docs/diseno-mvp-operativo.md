# CajaEscudo · Interfaz operativa del MVP

Fecha: 2026-11-26. Estado: aplicado a la interfaz Vue.

## Objetivo

Conservar la identidad visual y la simulación existentes, pero presentar una
herramienta de gestión, no una landing ni un recorrido explicativo para jueces.
Los modelos, los datos sintéticos y las restricciones de seguridad no cambian.

## Arquitectura de información

| Sección | Objetivo de trabajo | Enlace |
|---|---|---|
| Monitoreo | Revisar exposición y seleccionar clientes prioritarios | `#monitoring` |
| Abastecimiento | Evaluar dependencias, inventario e impacto indirecto | `#supply` |
| Riesgo de cartera | Consultar pérdidas, distribución y concentración | `#portfolio` |
| Intervenciones | Asignar presupuesto y revisar medidas propuestas | `#interventions` |
| Seguimiento | Revisar casos y registrar estado de intervención | `#followup` |
| Configuración | Ajustar simulación y consultar metodología/fuentes | `#settings` |

Las secciones tienen enlaces nativos, título de navegador específico y soporte
para historial, acceso directo y recarga. El cliente seleccionado y los filtros
se conservan durante la navegación dentro de la sesión, no en la URL.

## Reglas de contenido

- Un H1 descriptivo por pantalla, coincidente con la navegación.
- Eliminar lemas y subtítulos genéricos; mostrar alcance concreto de cartera.
- Mantener terminología consistente: cliente, revisión, intervención, seguimiento.
- Botones con verbo y objeto: Guardar revisión, Aprobar intervención, Cerrar caso.
- No presentar usuarios ficticios como sesiones autenticadas.
- Mantener “Entorno de simulación” y “Datos sintéticos · Resultados no calibrados”
  visibles, sin repetir párrafos técnicos en cada panel.
- Usar mensajes que expliquen el bloqueo y permitan revisar configuración.
- Registrar entrega no significa enviar un mensaje; se aclara junto al formulario.

## Divulgación progresiva

- El registro técnico del análisis permanece disponible, cerrado inicialmente.
- El escenario guardado se selecciona en un control compacto; se elimina la
  fila de tarjetas con descripciones de pruebas.
- La calidad simulada de datos se configura en Configuración.
- Supuestos de inventario y criterios financieros se consultan en desplegables.
- En Configuración, parámetros operativos primero; metodología, fuentes y
  privacidad en secciones desplegables. Se elimina el catálogo duplicado.
- En Seguimiento, revisión y estado de intervención son los paneles principales.

## Diseño conservado y ajuste de densidad

Se conservan Manrope/Chakra Petch, rojo de acción, cabecera azul oscuro, mapa,
colores semánticos y visualizaciones. Se reduce la altura del encabezado y el
protagonismo de títulos; se homogeneizan espacios y controles.
Configuración se separa visualmente de las secciones operativas.

No se adopta un nuevo framework ni se copia la apariencia de otra plataforma.
Las referencias orientan nomenclatura, jerarquía y accesibilidad.

## Referencias consultadas

- [GOV.UK: headings](https://design-system.service.gov.uk/styles/headings/):
  jerarquía semántica consistente y títulos en sentence case.
- [IBM Carbon: content](https://carbondesignsystem.com/building-blocks/foundations/content):
  lenguaje claro, útil, consistente y centrado en la tarea.

No se afirma certificación ni cumplimiento integral de estos sistemas.

## Verificación

- Pruebas de identidad, etiquetas y resolución de enlaces de navegación.
- Pruebas existentes del motor y del seguimiento sin modificaciones matemáticas.
- Compilación Vue/TypeScript.
- Verificación en navegador de secciones, controles, historial y composición.
- El modo simulado no se retira ni se presenta como servicio bancario conectado.

Resultado de verificación: 52 pruebas de dominio aprobadas y build Vue/TypeScript
correcto. En navegador, las seis secciones tienen un solo H1, enlace activo y
título específico. Se comprobó navegación mediante historial de la página y
ausencia de desborde horizontal en las seis vistas a 390 px.
