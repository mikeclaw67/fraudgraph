# Alembic migration environment — configures async SQLAlchemy engine
# for schema migrations. Run: alembic upgrade head

from __future__ import annotations

from logging.config import fileConfig

from alembic import context

# Import models so Alembic can detect them
from backend.db.models import Base
from backend.config.settings import get_settings

config = context.config
settings = get_settings()

# Set SQLAlchemy URL from settings
config.set_main_option("sqlalchemy.url", settings.postgres_sync_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    from sqlalchemy import engine_from_config, pool

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
