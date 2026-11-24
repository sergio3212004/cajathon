# Entrega del prototipo Cauce

## Objetivo

Ayudar al asesor a responder tres preguntas:

- ¿Qué negocios podrían sufrir mayores pérdidas ante un escenario climático?
- ¿Qué activos conviene proteger y cuánto costarían las medidas?
- ¿Cómo cambiarían las cuotas si los ingresos disminuyen temporalmente?

La prevención apoya la continuidad del negocio. La simulación de cuotas conecta
esa continuidad con el desafío NEG-01, sin automatizar decisiones crediticias.

## Alcance implementado

| Espacio | Funciones |
|---|---|
| Panorama de riesgo | Evento, distrito, horizonte e intensidad; métricas; mapa de calor; selección; búsqueda y prioridades |
| Negocios y activos | Valorización referencial, vulnerabilidad, pérdida base y residual, costo de medidas y guardado en sesión |
| Simulador de cuotas | TEA, plazo, caída de ingresos, comparación de cuotas, intereses, saldo y filtro de capacidad |
| Fuentes y metodología | Fuentes previstas, fórmulas, supuestos, límites y uso responsable |

El CSV exporta la cartera filtrada o el cronograma de la simulación, según la
vista activa. Los datos incluyen 12 negocios ficticios y 36 activos.

## Arquitectura

```text
Vue + Nuxt UI
  ├─ App.vue: navegación y estado reactivo en memoria
  ├─ RiskMap.vue: SVG esquemático, calor y selección
  └─ domain/
       ├─ data.ts: negocios, activos y medidas sintéticas
       ├─ risk.ts: evaluación de riesgo y simulación financiera
       └─ risk.test.ts: pruebas unitarias
```

Se mantiene Vue con Vite. Nuxt UI se integra mediante su plugin para Vue,
su plugin de Vite y Tailwind CSS; no se incorpora el framework Nuxt.
Manrope y los iconos Lucide se distribuyen desde dependencias locales.

El prototipo no consume la API existente ni escribe en Neon. No utiliza
almacenamiento persistente: recargar la página reinicia los escenarios y planes.

## Cálculos y supuestos

### Pérdida esperada

```text
Pérdida por activo = valor × probabilidad ilustrativa × vulnerabilidad
Pérdida del negocio = suma de pérdidas de sus activos
Nivel relativo = pérdida del negocio / valor total de sus activos
```

La probabilidad combina exposición sintética, intensidad, horizonte y sector,
con un máximo de 0.95. La sequía usa un factor mayor para agricultura y uno
menor para otros sectores; la inundación tiene otro multiplicador. Son
supuestos de demostración, no relaciones empíricamente calibradas.

- Alto: nivel relativo ≥ 40%.
- Medio: nivel relativo ≥ 20% y < 40%.
- Bajo: nivel relativo < 20%.

La lista se ordena por pérdida monetaria esperada, no por el nivel relativo.
El orden favorece activos de mayor valor; en producción deben añadirse
criticidad operativa, equidad y costo de intervención.

### Medidas preventivas

Las medidas restan puntos a la vulnerabilidad del activo, con mínimo cero.
La pérdida evitada es la diferencia entre pérdida base y residual. El costo
de intervención se muestra por separado y no se financia en el simulador.
Ni las reducciones ni el ahorro son garantías.

### Cuotas adaptables

La tasa efectiva mensual se obtiene de la TEA:

```text
i = (1 + TEA / 100)^(1 / 12) - 1
```

La cuota uniforme sigue la fórmula de anualidad. Para TEA cero se divide
el capital entre los meses.

El flujo disponible descuenta gastos operativos; aplica estacionalidad
sintética, dos meses de caída de ingresos y dos de recuperación parcial.
El primer mes descuenta además una reserva equivalente al 6% de la pérdida
residual del escenario.

Las cuotas adaptables se ponderan por el flujo y se normalizan por valor
presente para amortizar el mismo capital, con igual tasa y plazo. La
simulación muestra costo total y diferencia frente a cuotas uniformes.

Se bloquea la propuesta si alguna cuota:

- supera el 70% del flujo disponible; o
- no cubre los intereses del mes.

El 70% es ilustrativo, **no una política de Caja Trujillo**. No se incluyen
seguros, comisiones, otras obligaciones ni reglas contractuales de redondeo.
El filtro no sustituye una evaluación crediticia ni prueba rentabilidad
ajustada por riesgo.

## Diseño y Figma

[Archivo editable](https://www.figma.com/design/bZiPzO1i7ycKpmi5b43EDw):

- [Panorama territorial](https://www.figma.com/design/bZiPzO1i7ycKpmi5b43EDw?node-id=4-439).
- [Prevención de activos](https://www.figma.com/design/bZiPzO1i7ycKpmi5b43EDw?node-id=4-646).
- [Simulación de cuotas](https://www.figma.com/design/bZiPzO1i7ycKpmi5b43EDw?node-id=4-728).

Las pantallas contienen texto y capas editables, con controles de referencia
de Material 3 y Simple Design System. Son propuestas de UX, no una captura
exacta de la implementación ni un prototipo interactivo en Figma.
Los valores de los mockups son ilustrativos.

## Verificación

Desde `apps/web`:

```sh
bun install --frozen-lockfile
bun run test
bun run build
```

La suite contiene 15 pruebas sobre pérdida esperada, medidas, intensidad,
efecto sectorial, valor presente, amortización con TEA 0/26/60 y plazos
6/12/18, inviabilidad y capacidad de pago.

Comprobaciones manuales realizadas durante la implementación:

- Una medida de protección reduce la pérdida residual y muestra su costo.
- Guardar el plan produce confirmación sin envío al cliente.
- El cronograma presenta 12 filas para un plazo de 12 meses.
- Un escenario con caída inicial de 10% permite demostrar la propuesta.
- El filtro Laredo muestra dos negocios y dos marcadores.
- La selección de la lista actualiza el resumen del negocio.
- Una búsqueda sin coincidencias muestra recuperación mediante limpiar filtros.
- Cambiar el horizonte modifica el cálculo; desactivar calor elimina la capa.
- Las cuatro vistas se revisaron en un contenedor móvil de aproximadamente
  375 px útiles sin desbordamiento horizontal.

Estas comprobaciones manuales no son una suite E2E automatizada ni una
certificación completa de accesibilidad.

## Pendientes para una solución avanzada

1. Integrar avisos y reportes oficiales de SENAMHI/INDECI, con vigencia,
   cobertura, trazabilidad y manejo de indisponibilidad.
2. Georreferenciar negocios y activos con autorización y cartografía real.
3. Calibrar curvas de daño por amenaza y contrastar pérdidas con históricos.
4. Predecir ingresos con escenarios e intervalos de incertidumbre.
5. Optimizar cronogramas bajo restricciones de capacidad, contrato y
   rentabilidad; validar resultados con especialistas.
6. Incorporar autenticación, permisos, persistencia, auditoría y privacidad.
7. Exigir revisión humana y consentimiento antes de ofertas o cambios.

Este MVP funcional no cumple por sí solo todo el requisito de analítica
avanzada del desafío.

## Organización de la entrega en Git

Los cambios se separan por responsabilidad, en este orden:

1. Configuración: Nuxt UI, tipografía, iconos, Bun y TypeScript.
2. Dominio: datos sintéticos, riesgo, cuotas y pruebas.
3. Interfaz: mapa, navegación, prevención, simulador y exportación.
4. Documentación: instalación, diseño, arquitectura, límites y validación.

No se incluyen cambios de la API ni archivos ajenos al prototipo.
