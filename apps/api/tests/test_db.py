import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError
from sqlmodel import Session, create_engine

from api.db import get_engine, get_session
from api.main import app


class DatabaseTests(unittest.TestCase):
    def setUp(self) -> None:
        get_engine.cache_clear()
        self.addCleanup(get_engine.cache_clear)
        self.addCleanup(app.dependency_overrides.pop, get_session, None)

    @patch.dict(
        os.environ,
        {
            "DATABASE_URL": "postgresql://user:placeholder@localhost/db"
            "?sslmode=require&channel_binding=require"
        },
    )
    def test_neon_url_uses_psycopg_and_preserves_tls_options(self) -> None:
        url = get_engine().url
        self.assertEqual(url.drivername, "postgresql+psycopg")
        self.assertEqual(url.query["sslmode"], "require")
        self.assertEqual(url.query["channel_binding"], "require")

    @patch.dict(os.environ, {"DATABASE_URL": ""})
    def test_missing_configuration_returns_503(self) -> None:
        with TestClient(app) as client:
            response = client.get("/health/db")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"detail": "Database unavailable"})

    def test_health_executes_select_one(self) -> None:
        engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
        self.addCleanup(engine.dispose)
        with patch("api.db.get_engine", return_value=engine):
            with TestClient(app) as client:
                response = client.get("/health/db")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_connection_failure_returns_503(self) -> None:
        with patch.object(
            Session, "execute", side_effect=OperationalError(None, None, Exception())
        ):
            app.dependency_overrides[get_session] = lambda: Session()
            with TestClient(app) as client:
                response = client.get("/health/db")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"detail": "Database unavailable"})
