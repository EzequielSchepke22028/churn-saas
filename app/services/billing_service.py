"""
Integración con Mercado Pago: creación de suscripciones recurrentes (Preapproval),
el producto correcto de MP para cobros mensuales automáticos -- a diferencia de
Checkout Pro (pensado para cobros únicos), Preapproval es quien recurrentemente
factura y avisa por webhook.
"""

import mercadopago
from app.config import MERCADOPAGO_ACCESS_TOKEN
from app.logging_config import logger

_sdk: mercadopago.SDK | None = None

def _get_sdk() -> mercadopago.SDK:
    """
    Lazy init del cliente del SDK -- se crea una sola vez, reusado en cada llamada.
    Falla ruidoso si falta el access token: sin credenciales, ninguna operación de
    billing puede funcionar, mejor que el error aparezca temprano y claro.
    """
    global _sdk
    if _sdk is None:
        if not MERCADOPAGO_ACCESS_TOKEN:
            raise RuntimeError("MERCADOPAGO_ACCESS_TOKEN no configurado en .env")
        _sdk = mercadopago.SDK(MERCADOPAGO_ACCESS_TOKEN)
    return _sdk

class MercadoPagoError(Exception):
    """La API de Mercado Pago devolvió un error al crear/consultar algo."""
    def __init__(self, status: int, respuesta: dict):
        self.status = status
        self.respuesta = respuesta
        super().__init__(f"Mercado Pago devolvió status {status}: {respuesta}")

def crear_suscripcion(
    tenant_id: str,
    email_pagador: str,
    monto_mensual: float,
    razon: str,
    back_url: str,
) -> dict:
    """
    Crea un Preapproval (suscripción recurrente) en Mercado Pago, en estado inicial 'pending'.
    Devuelve el diccionario completo de respuesta de MP -- el llamador (el router, en la
    próxima micro-tarea) es quien decide qué guardar en la tabla 'suscripciones' y qué devolver al frontend.
    """
    sdk = _get_sdk()
    preapproval_data = {
        "payer_email": email_pagador,
        "back_url": back_url,
        "reason": razon,
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": monto_mensual,
            "currency_id": "ARS"
        },
        "external_reference": tenant_id,
        "status": "pending"
    }

    logger.info(f"Creando suscripción en MP para tenant_id={tenant_id} con email={email_pagador}")
    resultado = sdk.preapproval().create(preapproval_data)

    status = resultado.get("status")
    response = resultado.get("response")

    if status not in (200, 201):
        raise MercadoPagoError(status, response)

    return response

def obtener_suscripcion_mp(preapproval_id: str) -> dict:
    """
    Consulta el estado actual de un preapproval directo desde MP (no desde nuestra tabla local)
    -- útil para reconciliar si sospechamos que un webhook se perdió.
    """
    sdk = _get_sdk()
    logger.info(f"Consultando estado de suscripción preapproval_id={preapproval_id} en MP")
    resultado = sdk.preapproval().get(preapproval_id)

    status = resultado.get("status")
    response = resultado.get("response")

    if status not in (200, 201):
        raise MercadoPagoError(status, response)

    return response
