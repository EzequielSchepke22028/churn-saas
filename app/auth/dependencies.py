"""
Dependencia de FastAPI que extrae y valida el JWT del header
Authorization, y expone user_id/tenant_id/role al endpoint sin que
el endpoint tenga que manejar la lógica de tokens directamente.
"""

from fastapi import Header, HTTPException
from pydantic import BaseModel

from app.auth.jwt_handler import TokenInvalidoError, decode_access_token


class UsuarioActual(BaseModel):
    user_id: str
    tenant_id: str
    role: str


def get_current_user(authorization: str = Header(...)) -> UsuarioActual:
    """
    Dependencia para usar con Depends() en cualquier endpoint
    protegido. Espera el header:
        Authorization: Bearer <token>

    Devuelve un UsuarioActual con tenant_id ya validado -- el
    endpoint nunca recibe tenant_id como parámetro de URL/body, lo
    saca de acá, así no hay forma de que alguien pida datos de un
    tenant que no es el suyo con solo cambiar un UUID en la URL.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Header Authorization debe tener formato 'Bearer <token>'.",
        )

    token = authorization.removeprefix("Bearer ").strip()

    try:
        payload = decode_access_token(token)
    except TokenInvalidoError as e:
        raise HTTPException(status_code=401, detail=str(e))

    return UsuarioActual(
        user_id=payload["sub"],
        tenant_id=payload["tenant_id"],
        role=payload["role"],
    )