import asyncio
import bcrypt

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session, engine, Base
from app.models.usuario import Usuario


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        for user in USERS:
            exists = await db.execute(
                text("SELECT id FROM usuarios WHERE username = :username"),
                {"username": user["username"]},
            )
            if exists.fetchone():
                print(f"  Usuario '{user['username']}' ya existe, omitiendo...")
                continue

            hashed = bcrypt.hashpw(user["password"].encode(), bcrypt.gensalt()).decode()
            await db.execute(
                text(
                    "INSERT INTO usuarios (username, password_hash, nombre, apellido, email, es_admin, activo) "
                    "VALUES (:username, :password_hash, :nombre, :apellido, :email, :es_admin, true)"
                ),
                {
                    "username": user["username"],
                    "password_hash": hashed,
                    "nombre": user["nombre"],
                    "apellido": user["apellido"],
                    "email": user["email"],
                    "es_admin": user["es_admin"],
                },
            )
            print(f"  Usuario '{user['username']}' creado correctamente.")

        await db.commit()

    print("\nSeed completado exitosamente.")


USERS = [
    {
        "username": "admin",
        "password": "admin123",
        "nombre": "Admin",
        "apellido": "Principal",
        "email": "admin@smartpark.com",
        "es_admin": True,
    },
    {
        "username": "empleado1",
        "password": "empleado123",
        "nombre": "Empleado",
        "apellido": "Uno",
        "email": "empleado1@smartpark.com",
        "es_admin": False,
    },
    {
        "username": "empleado2",
        "password": "empleado123",
        "nombre": "Empleado",
        "apellido": "Dos",
        "email": "empleado2@smartpark.com",
        "es_admin": False,
    },
]


if __name__ == "__main__":
    asyncio.run(seed())
