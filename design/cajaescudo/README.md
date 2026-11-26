# CajaEscudo · Prototipo de diseño RIE-01

Evolución de Cauce desde NEG-01 hacia inteligencia climática y crediticia.
Estos archivos son **artefactos de diseño**, no una implementación analítica.
La aplicación Vue existente no se modifica con esta entrega.

## Ver y editar

- Abrir `preview.html`: seis vistas conectadas por menú y botones.
- Importar los archivos de `screens/*.svg` en Figma: textos y vectores
  editables. Instalar Manrope si Figma solicita la fuente.
- Los enlaces del HTML no se convierten automáticamente en interacciones
  de Figma; deben enlazarse los marcos después de importar.
- Regenerar: `python design/cajaescudo/generate.py` desde la raíz.

La vista previa está pensada para escritorio. En móvil conserva el ancho mínimo
para revisión con desplazamiento; no representa un diseño móvil terminado.

## Estado del MCP de Figma

Archivo existente: https://www.figma.com/design/bZiPzO1i7ycKpmi5b43EDw

Se creó la página **CajaEscudo · RIE-01** (`8:72`) y seis marcos de
1440 × 1080. El MCP bloqueó la composición al alcanzar el límite del plan
Starter. Los marcos están **vacíos**, y no se pudo verificar visualmente el
resultado en Figma. Las tres pantallas anteriores de Cauce se conservaron.

| Vista | Marco reservado | SVG |
|---|---|---|
| Panorama territorial | `8:73` | `screens/panorama.svg` |
| Vulnerabilidad del cliente | `8:74` | `screens/cliente.svg` |
| Estrés de cartera | `8:75` | `screens/cartera.svg` |
| Prevención priorizada | `8:76` | `screens/prevencion.svg` |
| Alertas y seguimiento | `8:77` | `screens/alertas.svg` |
| Fuentes y metodología | `8:78` | `screens/metodologia.svg` |

Al restablecerse el MCP, componer las vistas en los marcos reservados,
reutilizar componentes disponibles, conectar la navegación y revisar capturas.
No confundir la reserva de marcos con un prototipo completado en Figma.

## Dirección visual

Los colores se verificaron en el CSS público enlazado desde el sitio oficial:

- https://www.cajatrujillo.com.pe/
- https://www.cajatrujillo.com.pe/estilos/cssOutFit.css
- Consulta: 25 de noviembre de 2026.
- `--colorRojoCaja: #ff0901`
- `--colorAmarilloCaja: #ffc200`

Estos valores son evidencia de uso en el sitio, no un manual de marca.
El nombre del archivo CSS no acredita que Outfit sea su tipografía oficial:
el contenido declara Amelia y Roboto. Se conserva **Manrope** del prototipo
anterior como decisión de producto, no como afirmación de fuente corporativa.
La vista previa usa Arial si Manrope no está instalada.

Borgoña `#801D2B`, acción `#A51D24`, tinta `#202C39`, fondo `#F4F7FA`,
azul `#225A86`, verde `#17634C` y ámbar `#805600` son extensiones de interfaz.
El rojo oficial identifica marca; el rojo oscuro mantiene contraste en botones.
Los estados de riesgo llevan etiquetas además de color. El escudo es una
propuesta de símbolo del producto, no el logotipo oficial de Caja Trujillo.

## Correspondencia con RIE-01

- Exposición geográfica, clientes y sectores: panorama esquemático.
- Transmisión de amenaza a negocio, flujo y obligaciones: ficha de cliente.
- Segmentos: consumo, micro, pequeña, hipotecario y mediana empresa.
- Impacto en cartera y sensibilidad del resultado: estrés crediticio.
- Prevención bajo restricciones de presupuesto: propuesta de priorización.
- Alertas explicables, responsable, plazo e historial: seguimiento.
- Privacidad, equidad, fuentes, actualización y calidad: metodología.

El alcance completo debe incorporar también sequía, friaje y temperaturas
extremas. El recorrido ilustrado se concentra en lluvias e inundación;
no se representan sus respuestas como intercambiables entre amenazas.

## Coherencia de las cifras

Todo es sintético. La cartera contiene 2,400 clientes y S/ 48 millones.
Los 384 clientes expuestos representan S/ 7.68 millones, distribuidos así:

| Segmento | Clientes expuestos | Saldo |
|---|---:|---:|
| Consumo | 120 | S/ 1.20 M |
| Microempresa | 180 | S/ 2.88 M |
| Pequeña empresa | 60 | S/ 2.40 M |
| Hipotecario | 20 | S/ 0.80 M |
| Mediana empresa | 4 | S/ 0.40 M |

Con EAD de S/ 7.68 M y LGD 45%, una PD base supuesta de 5% produce
S/ 172,800; una PD de estrés supuesta de 12.2% produce S/ 421,632.
La diferencia es S/ 248,832. El impacto en resultado es una sensibilidad
antes de impuestos, condicionada al reconocimiento del gasto, no una provisión.
No se modela capital regulatorio ni se duplican pérdidas ya reconocidas.

El rango S/ 230–610 mil y las pérdidas con prevención de S/ 310 mil son
salidas estáticas de ejemplo, no percentiles calculados ni efectos validados.
Las tres intervenciones cuestan S/ 45,600 de un presupuesto S/ 48,000 y
representan 78 clientes únicos en el escenario de diseño.

Para C-0142, flujo base S/ 2,000 / obligaciones S/ 1,410 ≈ 1.42×;
flujo estresado S/ 1,170 / S/ 1,410 ≈ 0.83×. La insuficiencia de flujo
no equivale a incumplimiento. El 64% ilustrativo no es una PD calibrada.

## Qué sigue pendiente de implementación

Cruce geoespacial real, ingesta de fuentes con vigencia, curvas de daño,
simulación Monte Carlo, calibración de PD/LGD, optimización, persistencia de
revisiones, autenticación, auditoría, consentimiento y evaluación de sesgos.
No hay avisos oficiales activos, envío de mensajes ni decisiones automáticas.
