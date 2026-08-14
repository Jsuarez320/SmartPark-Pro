from fastapi import FastAPI
from sqlalchemy import text

from app.core.database import engine
from app.routers.auth import router as auth_router

app = FastAPI()

app.include_router(auth_router)
@app.get("/")
def root():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {"message": "Conexión exitosa"}