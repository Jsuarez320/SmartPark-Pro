import asyncio
import sys

from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

async def test_connection():
    print("Verificando requerimientos del backend...")
    import fastapi
    import uvicorn
    import sqlalchemy
    import pydantic
    
    print(f"FastAPI: {fastapi.__version__}")
    print(f"Uvicorn: {uvicorn.__version__}")
    print(f"SQLAlchemy: {sqlalchemy.__version__}")
    print(f"Pydantic: {pydantic.__version__}")
    print("-" * 40)
    
    print(f"Intentando conectar a la base de datos...")
    print(f"URL: {settings.database_url}")
    
    try:
        engine = create_async_engine(settings.database_url, echo=False)
        async with engine.begin() as conn:
            # Ejecutar un simple SELECT 1 para verificar conexión
            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))
        print("¡Conexión a la base de datos exitosa! El backend está listo.")
    except Exception as e:
        print("Error al conectar a la base de datos:", e)
        print("\nAsegúrate de que PostgreSQL esté en ejecución y la configuración en .env o config.py sea correcta.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_connection())
