import asyncio
import bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

async def set_password():
    engine = create_async_engine(settings.database_url)
    hashed = bcrypt.hashpw("1234".encode(), bcrypt.gensalt()).decode()
    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE usuarios SET password_hash = :hash WHERE username = 'admin'"),
            {"hash": hashed}
        )
        print(f"Password hasheado: {hashed}")
        print("Contrasena '1234' asignada al usuario 'admin'")
    await engine.dispose()

asyncio.run(set_password())
