# Redis + Celery Configuration — async task queue for FraudGraph.
# Detection runs, bulk scoring, and data ingestion jobs are dispatched
# through Celery workers backed by Redis. This module provides the
# Celery app instance and reusable Redis connection helpers.

from __future__ import annotations

import logging

import redis
from celery import Celery

from backend.config.settings import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# ---------------------------------------------------------------------------
# Celery application
# ---------------------------------------------------------------------------

celery_app = Celery(
    "fraudgraph",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Route detection tasks to a dedicated queue
    task_routes={
        "backend.queue.tasks.run_detection": {"queue": "detection"},
        "backend.queue.tasks.run_scoring": {"queue": "scoring"},
        "backend.queue.tasks.ingest_records": {"queue": "ingestion"},
    },
)


# ---------------------------------------------------------------------------
# Redis connection pool (for non-Celery direct Redis access)
# ---------------------------------------------------------------------------

_pool: redis.ConnectionPool | None = None


def get_redis_pool() -> redis.ConnectionPool:
    """Get or create a shared Redis connection pool."""
    global _pool
    if _pool is None:
        _pool = redis.ConnectionPool.from_url(
            settings.redis_url, max_connections=20, decode_responses=True
        )
        logger.info("Redis pool created: %s", settings.redis_url)
    return _pool


def get_redis_client() -> redis.Redis:
    """Get a Redis client from the shared pool."""
    return redis.Redis(connection_pool=get_redis_pool())


def publish_alert(channel: str, message: str) -> None:
    """Publish an alert notification to a Redis pub/sub channel."""
    client = get_redis_client()
    client.publish(channel, message)


def cache_risk_score(entity_id: str, score: float, ttl: int = 3600) -> None:
    """Cache a computed risk score with TTL for fast lookup."""
    client = get_redis_client()
    client.setex(f"riskscore:{entity_id}", ttl, str(score))


def get_cached_risk_score(entity_id: str) -> float | None:
    """Retrieve a cached risk score, or None if expired/missing."""
    client = get_redis_client()
    val = client.get(f"riskscore:{entity_id}")
    return float(val) if val is not None else None
