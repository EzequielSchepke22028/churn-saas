"""
Generación y validación de JWT. El token lleva user_id, tenant_id y
role -- suficiente para que cualquier endpoint sepa quién es el
usuario y a qué tenant pertenece sin volver a consultar la DB por
esa información en cada request.
"""

from datetime import datetime, timedelta, timezone

import jwt

from app.config import JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET_KEY


class TokenInvalidoError(Exception):
    """El token es inválido, está mal formado, o expiró."""
    pass


def create_access_token(user_id: str, tenant_id: str, role: str) -> str:
    """
    Genera un JWT firmado con los datos mínimos necesarios para
    identificar al usuario y su tenant en requests futuros.
    """
    ahora = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "iat": ahora,
        "exp": ahora + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    Decodifica y valida un JWT. Tira TokenInvalidoError si el token
    expiró, tiene firma inválida, o está mal formado -- nunca deja
    pasar un token sin verificar la firma.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise TokenInvalidoError("El token expiró.")
    except jwt.InvalidTokenError:
        raise TokenInvalidoError("Token inválido.")