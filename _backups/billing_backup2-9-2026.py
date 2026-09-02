"""Schemas de request/response para el modulo de billing."""

from pydantic import BaseModel


class SuscribirseRequest(BaseModel):
    plan_slug: str


class SuscripcionResponse(BaseModel):
    suscripcion_id: str
    estado: str
    init_point: str
    plan_slug: str