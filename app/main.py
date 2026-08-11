"""Punto de entrada de la API churn-saas."""

from fastapi import FastAPI

from app.database import close_pool, init_pool
from app.logging_config import logger
from app.routers import predicciones

app = FastAPI(title="Churn SaaS API")

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