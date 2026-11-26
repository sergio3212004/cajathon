# CajaEscudo CE-2.0 · Simulación de riesgo climático en red

Fecha: **2026-11-26**. Estado: **implementado en el prototipo local**.
Complementa el [plan objetivo](plan-evolucion-rie01.md); no implica integraciones
oficiales, calibración crediticia ni un sistema de producción.

La navegación actual y los criterios de interfaz están documentados en
[diseño operativo del MVP](diseno-mvp-operativo.md).

## 1. Qué se implementó

- 60 negocios sintéticos, manteniendo cinco segmentos: 48 en La Libertad y
  12 ejemplos distantes en Lima, Arequipa y Junín.
- Tres cadenas de prueba, cada una con origen, corredor, distribuidor y
  proveedor alternativo: alimentos/Piura, textiles/Ica e insumos productivos/Junín.
- Asignación explícita de fixtures por actividad y nombre del negocio;
  no transacciones ni proveedores verificados.
- Inventario diario normalizado y equivalente analítico para Monte Carlo.
- Un choque de origen compartido entre dependientes, pérdida operativa,
  sobrecostos, efecto en caja y función crediticia supuesta.
- Separación de impacto directo, indirecto y combinado.
- Comparaciones directas/indirectas aisladas con las mismas semillas.
- Paquete preventivo hipotético y mochila 0/1 bajo presupuesto.
- Presets de pruebas y controles de origen, duración, inventario, sustitución
  y calidad de datos.
- Revisión humana y seguimiento local: aprobación, fallo de entrega,
  reintento confirmado, ejecución y cierre.
- CSV con región, cadena, partidas, faltantes, parámetros, versión y checksum.
- Catálogo visual de fuentes **previstas, no consultadas**.

La pantalla presenta una red serial simplificada. No calcula rutas geográficas,
capacidad de carreteras, precios observados, competencia por inventario,
multinivel arbitrario, efectos de equilibrio ni todos los sectores del país.
Los corredores y proveedores tienen nombres ficticios. No es un modelo
insumo-producto nacional ni una integración de NetworkX/CLIMADA.

## 2. Arquitectura conservada

Se reutilizan Vue, TypeScript y el Web Worker existente; no se añaden dependencias
ni se traslada el motor a Python en esta entrega. FastAPI/PostGIS, Prefect,
LangGraph y proveedores LLM siguen como arquitectura futura.

El motor sigue ejecutándose sin claves ni llamadas de inferencia.
El único recurso externo es el mapa base OpenStreetMap.
No hay predicción meteorológica real ni acceso a la cartera de Caja Trujillo.

Archivos:

- `apps/web/src/domain/supply.ts`: red, perfiles e inventario.
- `apps/web/src/domain/escudo.ts`: integración en Monte Carlo, caja y planificación.
- `apps/web/src/domain/workflow.ts`: transiciones supervisadas.
- `apps/web/src/components/SupplyWorkbench.vue`: controles y explicación de la cadena.
- `apps/web/src/components/PreventiveFollowup.vue`: seguimiento local.
- `apps/web/src/components/EvidenceCatalog.vue`: catálogo de fuentes previstas.

## 3. Fórmulas y supuestos

### Evento upstream

Cada trayectoria comparte un uniforme global y una severidad `U(0.65, 1.35)`.
La frecuencia mensual upstream es **65% supuesta**, no estimada:

```text
p_upstream = 1 − (1 − 0.65)^(ventana_días / 30)
ocurre = uniforme_global < p_upstream
duración = min(30, interrupción_nominal × intensidad/100 × severidad)
```

Solo los clientes de la cadena cuyo origen se seleccionó reciben ese choque.
Se desactiva en modo directo, red deshabilitada o cuando no ocurre.
Con intensidad cero, duración e impacto son cero.

Es una traducción ilustrativa de ventana de amenaza; la caja siempre representa
30 días y la interrupción comienza al inicio del mes simulado.
No se usa para afirmar que una sequía o inundación real tiene esa probabilidad.
Las amenazas no cuentan todavía con curvas upstream específicas por producto.

### Inventario

Demanda normalizada: una unidad por día. Dependencia `d` según cadena:
0.8 alimentos, 0.7 textiles y 0.85 insumos productivos.
La fracción de sustitución `s` es configurable.

```text
fracción_interrumpida(t) = clamp(duración − (t−1), 0, 1)
entrega(t) = 1 − fracción_interrumpida(t) × d × (1−s)
atendido(t) = min(1, inventario_inicio(t) + entrega(t))
inventario_cierre(t) = inventario_inicio(t) + entrega(t) − atendido(t)
faltante(t) = 1 − atendido(t)
```

No se acumulan pedidos pendientes ni se fabrican unidades. Al terminar el shock,
las entregas vuelven a una unidad diaria, sin reposición extraordinaria.
El equivalente para demanda constante es:

`faltante_equivalente = max(0, duración × d × (1−s) − inventario_inicial)`

Esta equivalencia se prueba contra el balance diario con duraciones fraccionales.
El gráfico muestra una trayectoria **condicional** con severidad 1.0, no el
promedio probabilístico de la cartera.

### Efecto combinado y caja

Se conserva el daño directo supuesto de CE-1.0, pero se anula en modo indirecto.
Los 12 negocios distantes tienen exposición directa cero al escenario local.
La red aplica caída de ventas solo sobre actividad que sobrevivió al daño directo:

```text
caída_indirecta = faltante_equivalente / 30
caída_total = caída_directa + (1−caída_directa) × caída_indirecta
ratio_sobrecosto = 0.45 × d × s × 0.25 × duración/30
sobrecosto = gastos × ratio_sobrecosto × (1−caída_total)
contribución = max(0, ingreso_con_ruido − 0.25 × gastos)
pérdida_indirecta =
    contribución × (1−caída_directa) × caída_indirecta + sobrecosto
pérdida_operativa = contribución × caída_total + sobrecosto
impacto_económico = daño_físico + pérdida_operativa
```

45% de gastos sensibles y prima de sustitución de 25% son supuestos.
La simulación representa pérdida de contribución, no suma todas las ventas
perdidas como si fueran utilidad. El crédito no se suma al impacto económico.
Los días de cierre físico y faltantes equivalentes son variables diferentes.

La caja conserva la formulación demostrativa anterior, restando ahora el
sobrecosto de sustitución. El daño físico se traduce a salida inmediata de caja
mediante el 3.5% supuesto de CE-1.0, no se descuenta otra vez íntegramente.
El saldo se usa como proxy de EAD; el logit y LGD siguen sin calibración.
Consumo e hipotecario mantienen el proxy de ingreso de negocio para la demo;
un piloto real necesita modelos diferenciados por segmento.

### Comparaciones reproducibles

Los streams aleatorios de cada cliente y distrito dependen de semilla e identidad.
El choque global se conserva al filtrar la cartera; el resultado de un cliente
no cambia solo porque se ocultaron otros clientes.
Base/estrés/prevención comparten draws; no confundir ruido con beneficios.

Las pérdidas crediticias de canales aislados incluyen el mismo riesgo base y
no deben sumarse: comparten actividad y el enlace crediticio es no lineal.
El histograma sigue representando EL condicional por trayectoria, no defaults
realizados ni capital regulatorio.

### Plan preventivo

El paquete por cliente supone:

- Protección física de 38%, como en CE-1.0.
- Tres días extra de inventario.
- Hasta 30 puntos porcentuales extra de sustitución, con máximo 100%.

El costo fijo de fixture incluye la reserva; no se financia ni se resta de las
partidas de pérdida. El sobrecosto operativo de sustituir sí se modela.
La mochila maximiza **impacto económico evitado**, no solo daño de activos.
Solo entran candidatos con beneficio neto de impacto positivo.
No supone capacidad ilimitada de un proveedor alternativo real: la capacidad
compartida aún no se modela. No garantiza reducción de PD en todos los casos.

La reducción es un contrafactual bajo supuestos, no eficacia causal demostrada.

## 4. Calidad y trazabilidad

La calidad completa/insuficiente/vencida es un **estado de fixture**.
Si faltan o vencen datos con el canal indirecto activo:

1. Se rechaza la nueva simulación.
2. Se muestra error y se identifica la última salida como no vigente.
3. Se bloquean exportación, revisión y transiciones de seguimiento.
4. Se permite corregir controles o continuar con solo el canal directo.

Las fuentes externas se listan con acceso y límites, pero no se simulan consultas
ni fechas oficiales de emisión.

La huella CE-2.0/RED-1.0 incorpora parámetros completos, presupuesto y contenido
de clientes, no solo IDs. Es un checksum local compacto, no firma de seguridad.
Las revisiones CE-1.0 no se reutilizan para CE-2.0.

## 5. Seguimiento

Requiere revisión del cliente/huella vigente y al menos ocho caracteres de
evidencia sintética para cada transición:

```text
Pendiente → Aprobada → Comunicada → Ejecutada → Cerrada
                   ↘ Entrega fallida → Comunicada
```

No se permite saltar a ejecución, duplicar aprobación ni operar con salida
obsoleta. No se realizan envíos, desembolsos ni cambios contractuales.
Persistencia: máximo 100 revisiones en `cajaescudo-reviews-v1` y 100 casos en
`cajaescudo-followup-v1`; si falla localStorage, se informa uso solo en memoria.
No hay autenticación ni auditoría institucional.

## 6. Escenarios de prueba

En **Abastecimiento → Escenario guardado**, los escenarios conservan cartera,
semilla, trayectorias y ventana actuales. La calidad de datos se prueba desde
**Configuración → Calidad de datos de la red**:

| Preset | Parámetros modificados | Resultado esperado |
|---|---|---|
| Desastre distante | Indirecto, Piura, intensidad 90%, 22 días nominales, reserva 2, sustitución 0% | Daño físico cero e impacto indirecto en dependientes |
| Proveedor alternativo | Mismo choque, sustitución 70% | Menos faltantes; considerar prima de compra |
| Reserva de inventario | Mismo choque, reserva 20 días | Menos pérdida de ventas sin atribuir daño físico evitado |
| Sin choque | Intensidad cero | Impacto climático cero, riesgo crediticio base positivo |
| Configuración: datos insuficientes | Calidad missing | Cálculo nuevo bloqueado y salida anterior no vigente |

También pueden probarse calidad vencida, duración cero, sustitución 100%,
orígenes Ica/Junín, red desactivada, LGD cero y presupuesto cero.
Cambiar origen debe cambiar el conjunto de dependientes, no todos los negocios.

## 7. Validación de esta entrega

Resultado de ejecución tras el ajuste de navegación: `bun run test`,
**52 pruebas aprobadas, cero fallos**;
`bun run build`, compilación Vite y chequeo TypeScript aprobados.

Pruebas automatizadas de dominio:

- Conservación de inventario, límites y recuperación.
- Equivalencia entre recurrencia y fórmula rápida.
- Pérdida sin proximidad física.
- Choque compartido y estabilidad al filtrar.
- Efecto de alternativas y reserva en los presets.
- Aislamiento de canales, intensidad/LGD cero y conciliación de partidas.
- Bloqueo por calidad, cambios de huella y planificación.
- Transiciones válidas y prohibidas del seguimiento.

Validación manual en navegador: carga del worker, controles, comparación
desastre/alternativa, bloqueo de exportación por faltantes y recorrido de
revisión, aprobación, entrega fallida, reintento, ejecución y cierre.
También se verificó el layout dentro de un viewport de 390 px, sin desborde
horizontal del documento en la vista de cadenas.

Estas pruebas demuestran coherencia del software y de los escenarios escogidos;
**no precisión predictiva ni pérdida evitada real**.
