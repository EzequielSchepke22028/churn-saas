from pydantic import BaseModel
from typing import Optional

class SuscribirseRequest(BaseModel):
    plan_slug: str

class SuscripcionResponse(BaseModel):
    suscripcion_id: str
    estado: str
    init_point: str
    plan_slug: str

class DetalleSuscripcionResponse(BaseModel):
    id: Optional[str] = None
    estado: str
    mercadopago_subscription_id: Optional[str] = None
    fecha_inicio: Optional[str] = None
    fecha_proximo_pago: Optional[str] = None
    plan_nombre: str
    precio_mensual: float
    moneda: str
