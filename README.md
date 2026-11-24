# Cajathon · Cauce

Prototipo para el desafío **NEG-01: cuotas que se adaptan al flujo del negocio**.
Cauce relaciona exposición climática, valorización de activos, medidas preventivas
y simulación de cuotas para microempresarios de La Libertad.

## Inicio rápido

Requiere Bun. Comandos desde la raíz del repositorio:

```sh
cd apps/web
bun install --frozen-lockfile
bun run dev
```

La aplicación se sirve en `http://localhost:5173` si el puerto está disponible.
El prototipo web funciona sin levantar la API ni configurar credenciales.

```sh
bun run test
bun run build
```

## Organización

| Directorio | Contenido |
|---|---|
| [`apps/web`](apps/web/README.md) | Vue 3, Vite, TypeScript, Nuxt UI 4 y modelo demostrativo |
| [`apps/api`](apps/api/README.md) | API existente con FastAPI, SQLModel y Neon; no conectada al prototipo |
| [`docs/prototipo-cauce.md`](docs/prototipo-cauce.md) | Alcance, arquitectura, cálculos y guía de validación |
| [`apps/web/DESIGN.md`](apps/web/DESIGN.md) | Decisiones UX/UI y referencias de Figma |

## Diseño

[Ver tres pantallas editables en Figma](https://www.figma.com/design/bZiPzO1i7ycKpmi5b43EDw).

## Estado y límites

**Datos sintéticos y cartografía esquemática.** SENAMHI e INDECI son fuentes
previstas, no integraciones activas. El cálculo no es un pronóstico oficial,
un modelo predictivo calibrado ni una aprobación crediticia. Los planes y las
propuestas solo existen durante la sesión de la página; no se envían a clientes.
