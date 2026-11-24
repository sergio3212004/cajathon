# Cauce · Prevención y resiliencia

Prototipo funcional Vue 3 + Vite + TypeScript + **Nuxt UI 4 para Vue**.
No requiere migración a Nuxt, API, credenciales ni conexión a una base de datos.

## Ejecutar

```sh
bun install
bun run dev
```

## Verificar

```sh
bun run test
bun run build
```

## Flujo de demostración

1. En **Panorama de riesgo**, cambiar evento, distrito, intensidad y horizonte.
2. Seleccionar un negocio en el mapa o en la lista ordenada por pérdida monetaria.
3. Abrir **Preparar prevención** y marcar medidas. Comparar pérdida base,
   pérdida residual y costo de intervención; guardar el plan en la sesión.
4. Abrir **Simulador de cuotas**. Ajustar TEA, plazo y caída de ingresos.
   Con Agroindustrias El Valle, una caída de 10% y plazo de 12 meses permite
   demostrar la propuesta; con 80% de caída, se bloquea por inviabilidad.
5. Revisar el cronograma completo, intereses, costo total y saldo final.
   Exportar un CSV del escenario o del cronograma según la vista.
6. Consultar **Fuentes y metodología** para ver supuestos y límites.

## Estructura

- `src/domain/data.ts`: 12 negocios ficticios y 36 activos.
- `src/domain/risk.ts`: pérdida esperada, prevención y cronograma por valor presente.
- `src/domain/risk.test.ts`: pruebas del cálculo, amortización y restricciones.
- `src/components/RiskMap.vue`: cartografía esquemática, calor, selección y zoom.
- `src/App.vue`: navegación y flujos de la demostración.
- `DESIGN.md`: decisiones visuales, referencias MCP y enlace a Figma.

## Modelo demostrativo

La pérdida por activo es su valor por una probabilidad ilustrativa de amenaza y
su vulnerabilidad. Las medidas reducen vulnerabilidad. La prioridad se ordena por
pérdida absoluta; alto/medio/bajo representa pérdida respecto del valor de activos.

La simulación pondera las cuotas por flujo disponible y normaliza su valor presente
para amortizar el mismo capital con la misma tasa y plazo. Comprueba que cada cuota
cubra intereses y no supere el 70% del flujo disponible. El porcentaje es ilustrativo,
**no una política de Caja Trujillo**. No incluye seguros, comisiones ni otras deudas.

## Qué falta para una solución del desafío

Este MVP no afirma cumplir por sí solo el requisito de analítica avanzada.
Se requiere integración real con avisos y reportes oficiales, georreferenciación
autorizada, curvas de daño calibradas por amenaza, predicción de ingresos con bandas
de incertidumbre y optimización bajo restricciones crediticias y de rentabilidad.
También requiere persistencia, autenticación, auditoría, privacidad, reglas de
redondeo y validación regulatoria. No modifica contratos ni envía comunicaciones.
