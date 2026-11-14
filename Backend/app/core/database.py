from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings      # Importacion de config.py

DATABASE_URL = (
    f"postgresql+psycopg://"
    f"{settings.DATABASE_USER}:"
    f"{settings.DATABASE_PASSWORD}@"
    f"{settings.DATABASE_HOST}:"
    f"{settings.DATABASE_PORT}/"
    f"{settings.DATABASE_NAME}"
)

engine = create_engine(
    DATABASE_URL,
    echo=settings.DEBUG,
    # Dia/semana/mes de los reportes y CURRENT_DATE se evaluan en hora de Colombia
    connect_args={"options": "-c timezone=America/Bogota"},
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()