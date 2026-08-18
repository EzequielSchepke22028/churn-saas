"""
Dependencia de FastAPI que extrae y valida el JWT del header
Authorization, y expone user_id/tenant_id/role al endpoint sin que
el endpoint tenga que manejar la lógica de tokens directamente.
"""

from fastapi import Depends, Header, HTTPException
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


def requerir_roles(*roles_permitidos: str):
    """
    Fabrica de dependencias: genera una dependencia de FastAPI que
    exige que el usuario autenticado tenga uno de los roles pasados.

    Uso en un router:
        @router.put("/algo")
        def endpoint(usuario: UsuarioActual = Depends(requerir_roles("owner", "admin"))):
            ...

    Reutiliza get_current_user por dentro -- primero valida el JWT
    (igual que cualquier endpoint protegido), y recien despues chequea
    el rol. Si el token es invalido, el error es 401 (no autenticado).
    Si el token es valido pero el rol no alcanza, el error es 403
    (autenticado, pero sin permiso) -- son casos distintos y HTTP los
    distingue por una razon: 401 le dice al cliente "logueate de
    nuevo", 403 le dice "con otro usuario, quiza".
    """
    def dependencia(usuario: UsuarioActual = Depends(get_current_user)) -> UsuarioActual:
        if usuario.role not in roles_permitidos:
            raise HTTPException(
                status_code=403,
                detail=f"Rol '{usuario.role}' no autorizado. Requiere uno de: {roles_permitidos}",
            )
        return usuario

    return dependencia
