# Cauce

Prototipo NEG-01 para asesores de negocios y analistas de riesgo de Caja Trujillo.

## Decisión de experiencia

La señal climática debe llevar a una acción preventiva y, después, a una evaluación
de flujo de caja. El mapa no toma decisiones de crédito.

```
Escenario → mapa + negocios prioritarios → activos + prevención → cuotas + revisión
```

Se descartó un tablero de tarjetas independientes porque oculta la relación entre
territorio, pérdida potencial y actuación del asesor. La atención visual se concentra
en la cartografía. Navegación, controles y cifras mantienen una jerarquía discreta.

## Tokens

| Rol | Valor |
|---|---|
| Superficie | `#FFFFFF` |
| Fondo | `#F3F6F8` |
| Texto | `#183549` |
| Acción / agua | `#087F8C` |
| Riesgo medio | `#C58724` |
| Riesgo alto | `#C44646` |

Manrope, alojada localmente; pesos 400–800. Cifras financieras tabulares. Contenido
alineado a la izquierda. El color de riesgo se acompaña siempre de texto.

## Figma

[Archivo editable con tres pantallas](https://www.figma.com/design/bZiPzO1i7ycKpmi5b43EDw)

- Panorama: `4:439`.
- Prevención de activos: `4:646`.
- Simulador: `4:728`.

Referencias consultadas mediante MCP:

- **Material 3 Design Kit:** estados y acciones explícitas; instancias de Button outline.
- **Simple Design System:** estructura de filtros; instancias de Select Field.

No se encontró una vista compuesta de riesgo territorial. Se diseñó una composición
propia; no se usaron bibliotecas Apple. Las pantallas Figma son propuestas UX con capas
editables y datos ilustrativos, no una captura exacta ni un prototipo interactivo.
La implementación Vue utiliza componentes equivalentes de Nuxt UI.

## Límites

- Cartografía esquemática; no apta para navegación ni análisis espacial real.
- Datos sintéticos; SENAMHI e INDECI son fuentes previstas, no conexiones activas.
- Probabilidad y curvas de vulnerabilidad sin calibración.
- No hay modelo predictivo entrenado ni optimizador de producción.
- Cambios crediticios sujetos a revisión humana, contrato y normativa.
- Planes y propuestas solo existen en la sesión; no se envían a clientes.
