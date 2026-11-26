SHELL := /bin/bash
.DEFAULT_GOAL := dev

API_DIR := apps/api
WEB_DIR := apps/web
API_HOST ?= 127.0.0.1
API_PORT ?= 8000
WEB_HOST ?= 127.0.0.1
WEB_PORT ?= 5173

.PHONY: help dev api web install test build

help:
	@echo "CajaEscudo · Comandos disponibles:"
	@echo "  make dev      Ejecuta API (FastAPI) y Web (Vite) en paralelo"
	@echo "  make api      Ejecuta solo el backend FastAPI ($(API_HOST):$(API_PORT))"
	@echo "  make web      Ejecuta solo el frontend Vite ($(WEB_HOST):$(WEB_PORT))"
	@echo "  make install  Instala dependencias de apps/api (uv) y apps/web (bun)"
	@echo "  make test     Ejecuta pruebas de backend y frontend"
	@echo "  make build    Compila frontend y verifica tipos TypeScript"

dev:
	@echo "Iniciando CajaEscudo (API http://$(API_HOST):$(API_PORT) | Web http://$(WEB_HOST):$(WEB_PORT))"
	@trap 'kill 0' EXIT INT TERM; \
	$(MAKE) api & \
	$(MAKE) web & \
	wait

api:
	@cd $(API_DIR) && if [ -f .env ]; then \
		uv run --env-file .env fastapi dev --host $(API_HOST) --port $(API_PORT); \
	else \
		uv run fastapi dev --host $(API_HOST) --port $(API_PORT); \
	fi

web:
	@cd $(WEB_DIR) && VITE_API_URL="http://$(API_HOST):$(API_PORT)" bun run dev -- --host $(WEB_HOST) --port $(WEB_PORT)

install:
	@cd $(API_DIR) && uv sync
	@cd $(WEB_DIR) && bun install --frozen-lockfile

test:
	@cd $(API_DIR) && uv run python -m unittest discover -s tests
	@cd $(WEB_DIR) && bun run test

build:
	@cd $(WEB_DIR) && bun run build
