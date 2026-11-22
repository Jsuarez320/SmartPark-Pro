from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy import create_engine
from sqlalchemy.dialects import postgresql

from app import models  # noqa: F401  # Importa todos los modelos para registrar la metadata
from app.core.config import settings
from app.core.database import Base, DATABASE_URL

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def compare_type(context, inspected_column, metadata_column, inspected_type, metadata_type):
    """Ignora el dominio `metodo_pago` (la BD lo refleja como DOMAIN y el modelo como String(20));
    sin esto autogenerate propondría convertirlo a VARCHAR y perder su CHECK."""
    if isinstance(inspected_type, postgresql.DOMAIN):
        return False
    return None  # comparación por defecto


def run_migrations_offline() -> None:
    """Genera las migraciones en modo offline (sin conectar a la BD)."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=compare_type)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Ejecuta las migraciones online usando el engine síncrono de la app."""
    connectable = create_engine(
        DATABASE_URL,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        do_run_migrations(connection)

    connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
