import asyncio
import sys

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings


async def test_connection():
    print("=" * 50)
    print("  VERIFICACION DE CONEXION - SmartPark Pro Backend")
    print("=" * 50)

    print("\n[1/4] Verificando dependencias instaladas...")
    import fastapi
    import uvicorn
    import sqlalchemy
    import pydantic
    import asyncpg

    print(f"  [+] FastAPI:     {fastapi.__version__}")
    print(f"  [+] Uvicorn:     {uvicorn.__version__}")
    print(f"  [+] SQLAlchemy:  {sqlalchemy.__version__}")
    print(f"  [+] Pydantic:    {pydantic.__version__}")
    print(f"  [+] Asyncpg:     {asyncpg.__version__}")

    print(f"\n[2/4] Verificando modelos importados...")
    from app.models import (
        Cliente, TipoVehiculo, Vehiculo, Plan, Tarifa,
        Usuario, TurnoCaja, Membresia, Ingreso, Salida,
        Pago, Factura, CajaTransaccion,
    )

    models = [
        Cliente, TipoVehiculo, Vehiculo, Plan, Tarifa,
        Usuario, TurnoCaja, Membresia, Ingreso, Salida,
        Pago, Factura, CajaTransaccion,
    ]
    for m in models:
        print(f"  [+] {m.__name__:20s} -> tabla: {m.__tablename__}")

    print(f"\n[3/4] Conectando a PostgreSQL...")
    db_url = settings.database_url
    print(f"  URL: {db_url}")

    engine = create_async_engine(db_url, echo=False)
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"  [+] Conexion exitosa")
            print(f"  [+] PostgreSQL: {version.split(',')[0]}")

        print(f"\n[4/4] Listando tablas existentes...")
        async with engine.begin() as conn:
            result = await conn.execute(
                text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = 'public' ORDER BY table_name"
                )
            )
            tables = result.fetchall()
            if tables:
                for t in tables:
                    print(f"  [+] {t[0]}")

        print("\n" + "=" * 50)
        print("  [TODO CORRECTO] Backend listo para trabajar.")
        print("=" * 50)

    except Exception as e:
        print(f"\n  [x] Error al conectar a la base de datos: {e}")
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(test_connection())
