# CajaEscudo · Diseño y motor demostrativo RIE-01

## Público, marca e intención

**Usuario principal:** analista de riesgos que decide dónde verificar
vulnerabilidad y qué intervenciones proponer. **Usuario secundario:** asesor
que necesita una explicación de la afectación del negocio. Los jueces deben
poder distinguir una interfaz visual de una ejecución real y reproducible.

El elemento protagonista es una **mesa de anticipación territorial**: mapa,
capa de calor y lectura financiera acoplada; no una fila de tarjetas genéricas.
El expediente traduce el territorio a interrupción, ingresos y obligaciones.
La distribución de pérdidas y el puente financiero explican incertidumbre y
prevención en lugar de un semáforo opaco.

### Tokens y composición

- Rojo institucional observado `#FF0901`, amarillo `#FFC200`.
- Acción accesible oscura `#B8292B`, tinta `#23343E`.
- Mapa/marca de producto `#20333D`, fondo `#F3F5F6`, prevención `#327968`.
- Títulos **Chakra Petch**, presente en el sitio de Cajathon.
- Cuerpo **Manrope**, continuidad con el producto anterior y lectura de cifras.
- Navegación superior, controles compactos, mapa amplio y expediente lateral.
- Estados con palabras y color; reducción de movimiento; controles nativos
  y lista accesible alternativa al mapa.

```text
Marca de producto / Caja Trujillo                  Cajathon / recorrido
Territorio | Cartera y pérdidas | Plan preventivo | Agentes | Modelos
Amenaza / territorio / segmento / intensidad / ventana
┌───────────────────────────┬──────────────────────┐
│ Mapa real + calor         │ Daño / presión /      │
│ Dos variables distinguibles│ pérdida / prevención │
└───────────────────────────┴──────────────────────┘
Lista priorizada                     Expediente explicable
```

La propuesta previa tenía sidebar, seis marcos estáticos y métricas manuales.
Esta versión cambia a una herramienta operativa: menos chrome, mapa dominante,
resultados calculados y trazabilidad. Se conservan las advertencias dentro
del flujo, no escondidas exclusivamente en metodología.

### Logos y procedencia

Verificado el 25 de noviembre de 2026:

- https://cajathon.cajatrujillo.com.pe/
- Cajathon: `/assets/img-44c52451f8.png`
- Caja Trujillo: `/assets/img-a0fb541b2d.png`
- Declaración de fuente del sitio: Chakra Petch, Inter y Space Mono.
- Colores institucionales públicos:
  https://www.cajatrujillo.com.pe/estilos/cssOutFit.css

Los logos se descargaron sin redibujarlos; no implica patrocinio ni aprobación.
Se añade un símbolo de escudo propio al nombre del producto. El fondo oscuro
del header y los tonos semánticos son decisiones UI, no una paleta corporativa
oficial atribuida a Caja Trujillo.

## Evaluación de modelos

| Método | Decisión | Motivo y limitación |
|---|---|---|
| Beta–Bernoulli | Implementado | Incertidumbre de frecuencia con pocos datos; requiere históricos reales y evaluación del prior |
| Monte Carlo con choques comunes | Implementado | Propaga incertidumbre y dependencia entre negocios de un mismo evento |
| Enlace logístico | Implementado con coeficientes supuestos | Explicable y monotónico; no se denomina regresión entrenada ni PD calibrada |
| Mochila 0/1 | Implementada | Optimización exacta para una medida por cliente y costo discretizado |
| Boosting | Diferido | Requiere etiquetas, volumen, calibración y prevención de fuga temporal |
| Supervivencia | Diferida | Útil para tiempo hasta deterioro; necesita fecha de evento y censura |
| Agente LLM | No conectado | No aporta validez estadística; podría redactar explicaciones exclusivamente sobre herramientas verificadas |

Las referencias explican los métodos, no acreditan calibración de los
parámetros elegidos:

- [Enlace logístico y regularización, scikit-learn](https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression).
- [Distribución beta, SciPy](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.beta.html).
- [Nota explicativa IRB, BIS](https://www.bis.org/bcbs/irbriskweight.htm):
  referencia conceptual para componentes de riesgo, no implementación de IRB.
- [Mosaicos de OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).

## Datos y horizontes

60 registros sintéticos creados a partir de los 12 negocios ficticios de
Cauce. Incluyen saldo, ingresos, costos, liquidez, otras deudas, atrasos,
activos, sensibilidad y 24 observaciones binarias sintéticas.

Los cinco segmentos tienen 12 registros cada uno: consumo, microempresa,
pequeña empresa, hipotecario y mediana empresa. Esta muestra no representa
la composición real de Caja Trujillo. El flujo del negocio es un proxy de
ingreso para la demo, también en consumo/hipotecario; producción necesita
modelos de ingreso y vulnerabilidad diferenciados por segmento.

Las ubicaciones son ficticias, desplazadas alrededor de centros distritales.
La base del mapa es geográfica; los clientes y la amenaza **no son datos reales**.
La capa no tiene geometrías oficiales de inundación.

- Ventana de amenaza configurable: 7/30/90 días.
- Ingreso, obligaciones y presión de pago: mes de 30 días.
- PD del logit: supuesto de estrés a 30 días, no tasa anual convertida.
- Cambiar la ventana de amenaza modifica la probabilidad de ocurrencia,
  sin multiplicar ingresos mensuales ni fingir una predicción de 90 días.

## Implementación estadística

### 1. Frecuencia de evento

Con prior Beta(2,8) y `k` ocurrencias en `n` observaciones:

```text
alpha = 2 + k
beta = 8 + n − k
p_mensual ~ Beta(alpha, beta)
p_ventana = 1 − (1 − p_mensual)^(días/30)
```

La distribución beta se muestrea por dos gamma con Marsaglia–Tsang;
normales por Box–Muller. La conversión de ventana asume hazard constante,
una simplificación explícita. No incorpora un pronóstico meteorológico.

### 2. Choques, daño y flujo

Cada trayectoria alterna un uniforme global compartido o uno por distrito.
Compararlo con la probabilidad de cada cliente produce dependencia.
No es una cópula calibrada ni reproduce correlaciones empíricas conocidas.
La severidad global es compartida en cada trayectoria.

```text
severidad = clamp(intensidad × exposición × sensibilidad_sector × choque)
daño_relativo = ocurre × severidad^1.6 × vulnerabilidad × (1 − protección)
daño = activos × daño_relativo
días_cierre = ocurre × min(30, severidad × 16 × (1 − protección))
caída_ingreso = min(0.9, días_cierre/30 + daño_relativo × 0.25)
ruido_ingreso = exp(0.10 × Normal(0,1) − 0.005)
flujo = ingreso × ruido × (1 − caída)
        − gastos × (1 − caída × 0.25) + liquidez − daño × 0.035
cobertura = flujo / (cuota_caja + otras_obligaciones)
P(flujo insuficiente) = fracción de trayectorias con cobertura < 1
```

Cada amenaza tiene sensibilidad sectorial: sequía/friaje/calor no se tratan
como inundación. Son supuestos, no curvas de daño medidas.

La prioridad alta corresponde a insuficiencia de flujo en al menos 25% de
trayectorias; moderada desde 10% hasta menos de 25%; baja por debajo de 10%.
Son umbrales ilustrativos y no políticas de Caja Trujillo.

### 3. Crédito y resultados institucionales

```text
z = −3.8 + 2.1 × max(0, 1 − cobertura)
    + 2.4 × daño_relativo + 1.1 × atraso/30
    + 0.7 × otras_obligaciones/obligaciones_totales
PD_supuesta = 1 / (1 + exp(−z))
EL_condicional = PD_supuesta × LGD × saldo
```

Los coeficientes están fijados, no estimados con etiquetas sintéticas.
No se reportan AUC, precisión ni supuestos resultados de entrenamiento.
La geografía no es un predictor directo del logit, pero sí influye en el
escenario climático: esto no garantiza ausencia de sesgos.

La base usa el mismo ruido de ingresos sin daño climático.
Las pérdidas agregadas se concilian como suma de EL por cliente.
El histograma presenta **EL condicional por trayectoria**, no pérdidas
realizadas: no se sortean impagos Bernoulli ni recuperaciones.
P10/P90 miden dispersión bajo supuestos, no confianza estadística empírica.
Los cuantiles de esa EL tampoco equivalen a VaR de crédito regulatorio.

La diferencia estrés–base solo representa sensibilidad del resultado antes
de impuestos si se reconociera como gasto. No calcula provisiones, estados
financieros completos, suficiencia patrimonial o capital regulatorio.

### 4. Planificación

Se evalúa un contrafactual de protección del 38% por cliente.
Se usan las mismas semillas y draws para evitar confundir ruido y medidas.
La reducción supuesta aplica al daño y la interrupción; necesita validación
causal y factibilidad antes de uso real.

Beneficio por cliente = daño base − daño contrafactual.
La programación dinámica resuelve mochila 0/1 en unidades de S/100,
maximizando beneficio total dentro del presupuesto. No combina medidas
incompatibles porque solo hay una intervención sintética por cliente.
El costo se muestra separado; no se resta del daño ni se financia.

No se garantiza cobertura mínima ni equidad; se muestran distritos y
segmentos cubiertos y se advierte la preferencia por activos de mayor valor.
Producción requiere restricciones explícitas y supervisión.

## Agentes y revisión humana

`analyze()` coordina:

1. Vigía: validación de escenario y posterior.
2. Analista: Monte Carlo y función de estrés.
3. Planificador: contrafactual y optimización.
4. Revisor: advertencias y límites de acción.

Son agentes deterministas locales basados en herramientas, sin LLM.
Sus trazas se construyen a partir de resultados reales de las herramientas;
no se finge una conversación, búsqueda oficial o razonamiento de un modelo.
Futuro LLM: solo explicaciones y solicitudes de información con salidas
estructuradas, sin alterar los cálculos ni decisiones crediticias.

Los Web Workers separan cálculo y UI. Al cambiar los controles se espera
250 ms sin nuevas entradas y se cancela el worker anterior si seguía trabajando.
Las respuestas obsoletas se ignoran. Durante la actualización, los resultados
anteriores se atenúan y se bloquean guardado y exportación. El CSV incluye
semilla, parámetros y versión.

La interfaz operativa no contiene botones de ejecución ni recorridos para
jueces. Los detalles técnicos se presentan en secciones desplegables;
la metodología mantiene explícitos los datos ficticios y las limitaciones.

La revisión requiere evidencia, se guarda en el navegador y se vincula
a versión, parámetros y cartera mediante una huella reproducible.
No es autenticación, autorización institucional ni auditoría inviolable.
No hay comunicaciones ni cambios contractuales.

## Validación

`bun run test` incluye los tests históricos y los del nuevo motor:
reproducibilidad, conjugación beta, intensidad cero, monotonicidad,
comparaciones emparejadas, conciliación, LGD, amenazas, cuantiles,
histograma, mochila, huella de cartera y trazas.

`bun run build` verifica Vite, el worker y TypeScript.

Para validación empírica: separar temporalmente entrenamiento/validación,
calibrar PD con Brier y curvas de confiabilidad, evaluar sensibilidad y
errores por amenaza/sector/zona/segmento, comparar contra reglas base,
calibrar curvas de daño y contrastar intervenciones con evidencia real.
Evitar entrenar sobre los mismos supuestos y presentar ese resultado como
desempeño predictivo de producción.

## Guion de demostración (3–5 minutos)

1. Territorio, inundación 75%: recorrer calor y expediente.
2. Cambiar a intensidad cero: desaparece daño, queda riesgo base.
3. Restaurar el escenario y comparar sequía/agricultura.
4. Cartera y pérdidas: mostrar histograma, rango y puente de prevención.
5. Presupuesto cero frente a S/15,000: cambia la combinación de medidas.
6. Agentes: verificar trazas y registrar revisión sintética.
7. Exportar el escenario para reproducirlo con semilla y parámetros.

## Figma

La cuenta MCP conectada devolvió “no edit access” para el archivo histórico.
No se sobrescribieron sus pantallas ni se afirma sincronización de esta
implementación. Para continuar, compartir el archivo con esa cuenta como editor.
