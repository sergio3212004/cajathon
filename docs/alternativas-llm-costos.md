# CajaEscudo · Alternativas LLM y control de costos

Fecha de consulta: **2026-11-26**.
Estado: **investigación y recomendación provisional; ningún proveedor conectado**.
Precios en USD; tarifas y cuotas pueden cambiar. Revisar consola y documentación
antes de contratar. No se ejecutaron benchmarks ni llamadas autenticadas.

## 1. Respuesta a «igual potencia con menor costo o gratis»

No hay evidencia en este proyecto para garantizar equivalencia con un modelo de
OpenAI no especificado. Hay alternativas con razonamiento, herramientas y JSON
que pueden cubrir nuestras tareas por menos dinero o dentro de cuotas gratuitas.
La equivalencia debe evaluarse en español, con nuestros documentos y herramientas.

El LLM no predice pérdidas por sí solo: extracción, coordinación y explicación
son sus tareas. La estadística, simulación y optimización permanecen en código.
Esto permite cambiar de proveedor sin cambiar la matemática ni depender de un
modelo de frontera para cada operación.

La demo actual ya funciona sin LLM y sin costo de inferencia. Conservarla como
fallback determinista; no afirmar que ese fallback tiene inteligencia equivalente.

## 2. Alternativas documentadas

Tarifas de texto por **un millón de tokens**, entrada sin caché y salida.

| Proveedor/modelo candidato | Entrada | Salida | ¿Gratuito? | Uso propuesto |
|---|---:|---:|---|---|
| Groq `openai/gpt-oss-20b` | $0.075 | $0.30 | Cuota Free con límites | Extracción y explicaciones sencillas |
| Groq `openai/gpt-oss-120b` | $0.15 | $0.60 | Cuota Free con límites | Primer candidato para herramientas y explicaciones complejas |
| Gemini `gemini-3.5-flash-lite` | $0.30 | $2.50 | Free según modelo/cuenta/región | Extracción y clasificación; probar calidad antes |
| Gemini `gemini-3.8-flash` | $0.75 | $3.75 | Free según modelo/cuenta/región | Alternativa para análisis documental; tarifas pagadas hasta 2026-12-31 |
| DeepSeek `deepseek-flash` | $0.15–$0.30 | $0.60–$1.20 | No cuota permanente gratuita verificada | Alternativa económica de razonamiento/herramientas |
| Ollama local + modelo con herramientas, p. ej. Qwen3 | Sin tarifa por token | Sin tarifa por token | Inferencia local, no hardware gratuito | Privacidad/offline, condicionado a recursos y evaluación |

Los GPT-OSS son modelos originados por OpenAI, pero **Groq es el proveedor de
inferencia** en esta propuesta: no se necesita una suscripción a la API de OpenAI.
Si se prefiere también otro origen de modelo, evaluar Gemini, DeepSeek o Qwen.

La página de modelos Groq consultada marca GPT-OSS como producción y presenta
Llama 3.1/3.3 como Enterprise con precio a consultar; no recomendar antiguas
tarifas gratuitas de Llama tomadas de artículos desactualizados.
Groq documenta herramientas para GPT-OSS; no asumir herramientas paralelas ni
soporte estricto de todos los esquemas sin probar el modelo concreto.

La página Gemini consultada indica para `gemini-3.8-flash` $1.50/$7.50 a partir
de 2027-01-01. Sus modelos más avanzados no necesariamente tienen nivel gratuito.
Confirmar disponibilidad de cada ID en la cuenta antes de fijarlo.

DeepSeek aplica tarifas punta/valle. Para Flash, punta es entrada $0.30 y salida
$1.20; valle $0.15/$0.60. La documentación consultada fija punta de lunes a viernes
01:00–04:00 y 06:00–10:00 UTC, excepto festivos chinos. No basar el presupuesto
en descuentos de caché ni créditos promocionales.

## 3. Cuotas gratuitas y privacidad

### Groq

La documentación Free consultada para ambos GPT-OSS lista como base:

- 30 solicitudes/minuto.
- 1,000 solicitudes/día.
- 8,000 tokens/minuto.
- 200,000 tokens/día.

Los límites reales pertenecen a la organización y pueden variar. Con 3,800
tokens por llamada, el límite diario teórico ronda 52 llamadas, no 1,000;
el límite por minuto y los bucles pueden reducirlo aún más.
Manejar `429`, respetar `retry-after` y detenerse al agotar cuota.
No pasar automáticamente a un plan de pago.

Groq documenta retención excepcional por fiabilidad/abuso y funciones persistentes,
y controles de Zero Data Retention. Datos retenidos se ubican en EE. UU.
Revisar configuración, términos y autorización institucional; ZDR no elimina
la transferencia al proveedor ni constituye aprobación legal bancaria.

### Gemini Free

La tabla oficial indica que el contenido del nivel gratuito puede usarse para
mejorar productos, sujeto a sus términos. Para la evaluación usar exclusivamente
documentos públicos y datos sintéticos; no enviar expedientes reales.
Las cuotas dependen del modelo/proyecto; confirmar en AI Studio.

### DeepSeek

Tratar como API pagada. No asumir que un chat web gratuito implica API gratuita.
Antes de datos reales, verificar contrato, ubicación, retención, entrenamiento
y transferencias internacionales; no se considera aprobado por este documento.

### Ollama local

Ollama documenta ejecución local y herramientas; no es un modelo por sí mismo.
Puede desactivarse la nube con `OLLAMA_NO_CLOUD=1`.
Mantener servicio en loopback/red privada y no usar variantes cloud para afirmar
ejecución local. Elegir versión, licencia, cuantización y contexto explícitos.

La memoria de pesos es solo parte del consumo: añadir KV cache, contexto,
concurrencia y runtime. Medir RAM/VRAM, latencia y calidad antes de elegir tamaño.
No se inspeccionó ni probó el hardware de este proyecto. CPU puede servir para
pruebas, pero no se promete una demo fluida. Energía/GPU/hosting no son gratuitos.

## 4. Presupuesto ilustrativo y comparación

Supuesto homogéneo: **1,000 llamadas**, cada una con **3,000 tokens de entrada
y 800 de salida facturable**; total 3 millones de entrada y 0.8 de salida.
No es costo medido por cliente ni por caso.

`Costo = tokens_entrada/1e6 × tarifa_entrada + tokens_salida/1e6 × tarifa_salida`

| Opción pagada | Costo estimado del volumen |
|---|---:|
| Groq GPT-OSS 20B | $0.465 |
| Groq GPT-OSS 120B | $0.93 |
| DeepSeek Flash, valle/punta | $0.93–$1.86 |
| Gemini 3.5 Flash-Lite | $2.90 |
| Gemini 3.8 Flash, tarifa hasta 2026-12-31 | $5.25 |
| OpenAI `gpt-5.4-mini`, referencia estándar publicada | $5.85 |

El modelo OpenAI es un punto de comparación de precio, **no evidencia de igual
calidad ni el más barato de OpenAI**. Sin definir modelo y carga no existe un
porcentaje universal de ahorro por cambiar de proveedor.

Excluir de estas cifras: búsquedas, OCR, almacenamiento, hosting, impuestos y
tokens adicionales de razonamiento o reintentos. Distintos tokenizadores generan
distintos consumos; medir también costo por caso aprobado.
Si cuatro agentes realizan una llamada equivalente cada uno, un caso cuesta
aproximadamente cuatro veces una llamada; bucles o contextos mayores lo aumentan.
No extrapolar cuota Free a 1,000 llamadas en un día.

## 5. Recomendación provisional

1. Mantener el motor determinista como base obligatoria y sin dependencia LLM.
2. Evaluar **Groq GPT-OSS 120B Free** como primera opción de demo con datos
   sintéticos/públicos. Probar 20B para tareas simples.
3. Evaluar **Gemini Free** como alternativa independiente si cuotas y privacidad
   son compatibles; no reenviar datos silenciosamente entre proveedores.
4. Evaluar **Ollama local + Qwen3** si el hardware lo permite y se busca operación
   sin API externa. No descargar modelos ni configurar servidores en esta tarea.
5. Dejar **DeepSeek Flash** como candidato pagado económico, solo con presupuesto
   y condiciones aprobados. No activar saldo ni facturación.
6. Seleccionar por resultados propios, no por marketing o tamaño de parámetros.

No elegir ahora un proveedor definitivo para información bancaria real.

## 6. Contrato del adaptador por implementar

Diseñar una interfaz independiente de LangGraph y del proveedor:

```text
generate_explanation(verified_result, evidence_ids) -> validated_explanation
extract_fields(document, schema) -> validated_fields
propose_tool_calls(context, allowed_tools) -> validated_calls
```

Campos de respuesta: `provider`, `model`, `model_version_if_available`,
`prompt_version`, `tool_calls`, `evidence_ids`, `input_tokens`, `output_tokens`,
`estimated_cost`, `latency_ms`, `warnings`, `validation_status`.
No almacenar razonamiento interno ni secretos.

Configuración futura, **no variables ya soportadas por la aplicación**:

- `LLM_PROVIDER`: none/groq/gemini/deepseek/ollama.
- `LLM_MODEL`: ID verificado al integrar.
- `LLM_MAX_STEPS`, `LLM_MAX_OUTPUT_TOKENS`, `LLM_TIMEOUT_SECONDS`.
- `LLM_DAILY_BUDGET_USD`, `LLM_ALLOW_PAID=false`.
- Claves por proveedor solo en backend y gestor de secretos.

Un límite local no sustituye límites del proveedor; controlar reservas de costo
antes de despachar solicitudes concurrentes. No activar pagos como fallback.
Ante cuota, error o respuesta inválida, usar plantilla determinista y mostrar
que no hubo generación LLM, sin falsear trazas.

## 7. Evaluación antes de afirmar equivalencia

Preparar 50 casos revisados en español y al menos tres repeticiones por candidato:

| Tarea | Casos | Qué medir |
|---|---:|---|
| Extraer aviso con fechas, zonas y unidades | 15 | Exactitud por campo, omisiones, fuentes y JSON válido |
| Usar herramientas de exposición/suministro | 10 | Herramienta/argumentos correctos y errores manejados |
| Explicar pérdidas calculadas | 10 | Cifras preservadas y distinción exposición/daño/crédito |
| Datos faltantes, conflictos e inyección | 10 | Abstención, no inventar relaciones y resistencia |
| Preparar acción supervisada | 5 | Catálogo permitido y ausencia de ejecución no autorizada |

Mismos documentos, herramientas y rúbrica; no usar respuestas de otro LLM como
única verdad. Registrar precisión por tarea, fallos críticos, latencia p50/p95,
tokens, costo por caso y revisión humana ciega.

Puertas propuestas de aceptación, aún no resultados:

- Cero acciones no autorizadas y cero alteraciones de cifras en el conjunto.
- Al menos 95% de exactitud en campos críticos de extracción.
- Al menos 95% de selección/argumentos de herramientas correctos.
- Reportar y bloquear salidas inválidas antes de usarlas, aunque la tasa sea baja.
- Evidencias trazables y abstención ante datos insuficientes.

Para «igual potencia» definir primero un modelo base y margen de no inferioridad
por tarea; estimar incertidumbre y ampliar la muestra antes de producción.
Un test pequeño no demuestra equivalencia universal ni seguridad absoluta.
No consumir APIs pagadas para el benchmark sin autorización.

## 8. Fuentes oficiales consultadas

- [Groq modelos y precios](https://console.groq.com/docs/models).
- [Groq cuotas](https://console.groq.com/docs/rate-limits).
- [Groq herramientas](https://console.groq.com/docs/tool-use/overview).
- [Groq tratamiento de datos](https://console.groq.com/docs/your-data).
- [Gemini precios y Free/Paid](https://ai.google.dev/gemini-api/docs/pricing).
- [Gemini términos](https://ai.google.dev/gemini-api/terms).
- [DeepSeek modelos, funciones y precios](https://api-docs.deepseek.com/quick_start/pricing).
- [Ollama herramientas](https://docs.ollama.com/capabilities/tool-calling).
- [Ollama FAQ local y nube](https://docs.ollama.com/faq).
- [OpenAI precios de referencia](https://developers.openai.com/api/docs/pricing).
- [LangGraph persistencia](https://docs.langchain.com/oss/python/langgraph/durable-execution).
- [LangGraph revisión humana](https://docs.langchain.com/oss/python/langgraph/interrupts).

La documentación oficial puede cambiar y páginas comerciales pueden discrepar
del catálogo de modelos. Confirmar ID, acceso, condiciones y tarifa en consola
en el momento de integrar; registrar la fecha de cada nueva decisión.
