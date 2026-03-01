# Application settings — Pydantic BaseSettings for 12-factor config.
# All infra connection strings, feature flags, and detection thresholds in one place.
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Central configuration pulled from environment variables with sensible defaults."""

    # --- Application ---
    app_name: str = "FraudGraph"
    debug: bool = False
    api_prefix: str = "/api"

    # --- PostgreSQL ---
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_user: str = "fraudgraph"
    postgres_password: str = "fraudgraph"
    postgres_db: str = "fraudgraph"

    @property
    def postgres_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def postgres_sync_url(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # --- Neo4j ---
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "fraudgraph"

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"

    # --- Detection thresholds ---
    addr_reuse_threshold: int = 3
    ein_reuse_threshold: int = 1
    straw_co_max_employees: int = 0
    straw_co_max_age_months: int = 6
    straw_co_min_amount: float = 100_000.0
    threshold_game_min: float = 145_000.0
    threshold_game_max: float = 149_999.99
    account_share_threshold: int = 2
    new_ein_days: int = 30

    # --- Risk score weights (must sum to 1.0) ---
    weight_rules: float = 0.40
    weight_ml: float = 0.35
    weight_graph: float = 0.25

    # --- Pagination ---
    default_page_size: int = 50
    max_page_size: int = 200

    # --- Active fraud schema ---
    active_schema: str = "ppp_loans"

    model_config = {"env_prefix": "FG_", "env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
