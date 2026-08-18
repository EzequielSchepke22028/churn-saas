"""
Envío de alertas a n8n cuando una prediccion de churn supera el
umbral configurado. Se ejecuta como BackgroundTask -- no bloquea la
respuesta HTTP del endpoint de predicciones.
"""

import httpx

from app.config import N8N_WEBHOOK_URL
from app.logging_config import logger


def enviar_alerta_churn(tenant_id: str, cliente_identificador: str, churn_probability: float) -> None:
    """
    POSTea a n8n los datos minimos para que arme la notificacion
    (WhatsApp/Slack/mail). Nunca debe romper el flujo principal: si
    n8n esta caido o no responde, se loguea el error y se sigue --
    la prediccion ya se guardo en predicciones_historial de todos
    modos, no se pierde nada.
    """
    if not N8N_WEBHOOK_URL:
        logger.warning("N8N_WEBHOOK_URL no configurada, alerta no enviada.")
        return

    payload = {
        "tenant_id": tenant_id,
        "cliente_identificador": cliente_identificador,
        "churn_probability": churn_probability,
    }

    try:
        response = httpx.post(N8N_WEBHOOK_URL, json=payload, timeout=5.0)
        response.raise_for_status()
        logger.info(f"ALERTA_ENVIADA | tenant={tenant_id} | cliente={cliente_identificador} | prob={churn_probability}")
    except httpx.HTTPError as e:
        logger.error(f"ERROR enviando alerta a n8n | tenant={tenant_id} | detalle={e}")