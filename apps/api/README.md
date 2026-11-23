# API de Cajathon

La API usa FastAPI, SQLModel y Psycopg para conectarse a PostgreSQL en Neon.

## Desarrollo local

Desde `apps/api`, ejecuta `uv sync` y copia `.env.example` a `.env`.
En el panel de Neon, abre **Connect** y copia la cadena con **Connection
pooling** habilitado en `DATABASE_URL`. Conserva sus parámetros de TLS y no
subas `.env` al repositorio.

```sh
uv run --env-file .env fastapi dev
```

Verifica la conexión con `curl -f http://127.0.0.1:8000/health/db`. La ruta
ejecuta `SELECT 1` y devuelve `503` si falta la configuración o no puede
conectarse.

## Vercel

Configura `DATABASE_URL` en el proyecto que despliega `apps/api`. Si conectas
Neon desde el Marketplace y Vercel ya inyecta esa variable, no la dupliques.
Usa una rama de Neon separada para desarrollo y previews si necesitas datos
aislados de producción.

Para las rutas que usen la base de datos, inyecta `SessionDep` desde `api.db`.
La sesión se cierra al terminar la petición; llama a `session.commit()`
explícitamente al escribir. Esta configuración no crea tablas automáticamente.
