import os
from collections.abc import Iterator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.exc import ArgumentError
from sqlmodel import Session, create_engine


class DatabaseConfigurationError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        raise DatabaseConfigurationError("DATABASE_URL is missing")

    try:
        url = make_url(raw_url)
    except (ArgumentError, ValueError):
        raise DatabaseConfigurationError("DATABASE_URL is invalid") from None

    if url.drivername not in {"postgres", "postgresql", "postgresql+psycopg"}:
        raise DatabaseConfigurationError("DATABASE_URL must point to PostgreSQL")

    return create_engine(
        url.set(drivername="postgresql+psycopg"),
        connect_args={"connect_timeout": 5},
        pool_pre_ping=True,
    )


def get_session() -> Iterator[Session]:
    with Session(get_engine()) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
