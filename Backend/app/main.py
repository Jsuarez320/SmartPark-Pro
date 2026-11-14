from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.database import engine
from app.core.rate_limit import limiter
from app.core.errors import NegocioError
from app.routers.auth import router as auth_router
from app.routers.caja import router as caja_router
from app.routers.configuracion import router as configuracion_router
from app.routers.dashboard import router as dashboard_router
from app.routers.membresias import router as membresias_router
from app.routers.vehiculos import router as vehiculos_router

app = FastAPI()

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Demasiados intentos de inicio de sesión. Esperá unos minutos e intentá de nuevo."
        },
    )

@app.exception_handler(NegocioError)
def negocio_error_handler(request: Request, exc: NegocioError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(vehiculos_router)
app.include_router(membresias_router)
app.include_router(caja_router)
app.include_router(configuracion_router)
app.include_router(dashboard_router)

@app.get("/")
def root():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {"message": "Conexión exitosa"}