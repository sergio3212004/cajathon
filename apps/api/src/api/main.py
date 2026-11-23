from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from api.db import DatabaseConfigurationError, SessionDep

app = FastAPI()


@app.exception_handler(DatabaseConfigurationError)
async def database_configuration_error(
    _request: Request, _exc: DatabaseConfigurationError
) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": "Database unavailable"})


@app.get("/health/db")
def database_health(session: SessionDep) -> dict[str, str]:
    try:
        session.execute(text("SELECT 1"))
    except OperationalError:
        raise HTTPException(status_code=503, detail="Database unavailable") from None
    return {"status": "ok"}
