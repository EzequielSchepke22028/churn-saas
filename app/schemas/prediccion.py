"""Schemas de request/response para el endpoint de predicciones."""

from pydantic import BaseModel


class PrediccionItem(BaseModel):
    fila_indice: int
    cliente_identificador: str | None = None
    churn_probability: float


class PrediccionBatchResponse(BaseModel):
    tenant_id: str
    total_filas: int
    predicciones: list[PrediccionItem]