import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

async def check():
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT id, username, email, nombre, apellido, es_admin, activo FROM usuarios"))
        rows = result.fetchall()
        if rows:
            for r in rows:
                print(f"  {r.id} | {r.username} | {r.email} | {r.nombre} {r.apellido} | admin={r.es_admin} | activo={r.activo}")
        else:
            print("  No hay usuarios en la BD")
    await engine.dispose()

asyncio.run(check())
