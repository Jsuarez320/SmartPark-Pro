from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
  """
  Clase base para todos los modelos de SQLAlchemy.
  Permite registrar automáticamente los modelos en el metadata para Alembic.
  """
  pass


# Inicializa el motor asíncrono usando la URL de configuración
engine = create_async_engine(settings.database_url, echo=False)
async_session = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
  """
  Inyecta la sesión de base de datos asíncrona en las peticiones HTTP.
  Maneja automáticamente el cierre de la conexión al terminar el Request.
  """
  async with async_session() as session:
    yield session
