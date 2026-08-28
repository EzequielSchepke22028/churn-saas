"""Punto de entrada de la API churn-saas."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # <-- Importamos el middleware de CORS

from app.database import close_pool, init_pool
from app.logging_config import logger
from app.routers import auth, configuracion, predicciones

app = FastAPI(title="Churn SaaS API")

# --- Configuración de CORS para permitir que tu React en 5173/5174 se conecte ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(configuracion.router)
app.include_router(predicciones.router)


@app.on_event("startup")
def startup():
    init_pool()
    logger.info("API churn-saas iniciada.")


@app.on_event("shutdown")
def shutdown():
    close_pool()


@app.get("/health")
def health():
    return {"status": "ok"}

"""Punto de entrada de la API churn-saas."""

"""from fastapi import FastAPI

from app.database import close_pool, init_pool
from app.logging_config import logger
from app.routers import auth, configuracion, predicciones

app = FastAPI(title="Churn SaaS API")
app.include_router(auth.router)
app.include_router(configuracion.router)
app.include_router(predicciones.router)


@app.on_event("startup")
def startup():
    init_pool()
    logger.info("API churn-saas iniciada.")


@app.on_event("shutdown")
def shutdown():
    close_pool()


@app.get("/health")
def health():
    return {"status": "ok"}"""

