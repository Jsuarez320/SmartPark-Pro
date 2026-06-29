from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth

# Inicialización de la aplicación FastAPI principal
app = FastAPI(
    title="SmartPark Pro API", 
    version="0.1.0",
    description="API RESTful para el sistema de parqueaderos."
)

# Configuración de CORS para permitir conexiones desde el Frontend (React/Electron)
app.add_middleware(
  CORSMiddleware,
  allow_origins=settings.backend_cors_origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


app.include_router(auth.router)


@app.get("/health", tags=["Base"])
async def health_check() -> dict[str, str]:
  return {"status": "ok"}
