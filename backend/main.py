# FraudGraph Backend — FastAPI application entry point.
# Serves the fraud detection REST API with CORS support, health checks,
# and router registrations for alerts, entities, graph, and cases.
# In production this runs behind uvicorn inside the Docker container.

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.alerts import router as alerts_router
from backend.api.entities import router as entities_router
from backend.api.graph import router as graph_router
from backend.api.cases import router as cases_router
from backend.api.investigate import router as investigate_router
from backend.api.rings import router as rings_router
from backend.config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle — setup and teardown."""
    logger.info("FraudGraph starting up — schema: %s", settings.active_schema)

    # Seed demo data into in-memory stores on startup
    from data.seed_demo import seed_demo_data
    summary = seed_demo_data()
    logger.info(
        "Demo data seeded: %d rings, %d entities, %d alerts, %d graph nodes",
        summary["rings"], summary["entities"], summary["alerts"], summary["graph_nodes"],
    )

    yield
    logger.info("FraudGraph shutting down")


app = FastAPI(
    title=settings.app_name,
    description="Palantir-class fraud detection platform — ontology-based entity resolution, "
                "deterministic rules, ML scoring, and graph analytics for government fraud investigation.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(alerts_router, prefix=settings.api_prefix)
app.include_router(entities_router, prefix=settings.api_prefix)
app.include_router(graph_router, prefix=settings.api_prefix)
app.include_router(cases_router, prefix=settings.api_prefix)
app.include_router(investigate_router, prefix=settings.api_prefix)
app.include_router(rings_router, prefix=settings.api_prefix)


@app.get("/")
async def root():
    """Root endpoint — basic API info."""
    return {
        "service": settings.app_name,
        "version": "0.1.0",
        "schema": settings.active_schema,
        "status": "operational",
    }


@app.get("/health")
async def health():
    """Health check endpoint for Docker and load balancers."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "schema": settings.active_schema,
    }


@app.get("/api/config")
async def get_config():
    """Return active schema configuration and detection thresholds."""
    return {
        "active_schema": settings.active_schema,
        "thresholds": {
            "addr_reuse": settings.addr_reuse_threshold,
            "ein_reuse": settings.ein_reuse_threshold,
            "straw_co_max_employees": settings.straw_co_max_employees,
            "straw_co_max_age_months": settings.straw_co_max_age_months,
            "straw_co_min_amount": settings.straw_co_min_amount,
            "threshold_game_band": [settings.threshold_game_min, settings.threshold_game_max],
            "account_share": settings.account_share_threshold,
            "new_ein_days": settings.new_ein_days,
        },
        "risk_weights": {
            "rules": settings.weight_rules,
            "ml": settings.weight_ml,
            "graph": settings.weight_graph,
        },
    }
