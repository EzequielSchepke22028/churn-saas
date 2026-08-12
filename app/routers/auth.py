"""Endpoints de autenticación: registro y login."""

import bcrypt
from fastapi import APIRouter, HTTPException

from app.auth.jwt_handler import create_access_token
from app.database import get_connection, get_tenant_connection
from app.logging_config import logger
from app.schemas.usuario import LoginRequest, RegistroRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])
ROLES_VALIDOS = ("owner", "admin", "colaborador")


def _obtener_tenant_id_por_slug(slug: str) -> str | None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM tenants WHERE slug = %s AND activo = true", (slug,))
            fila = cur.fetchone()
    return str(fila[0]) if fila else None


@router.post("/register", response_model=TokenResponse, status_code=201)
def registrar_usuario(datos: RegistroRequest):
    if datos.rol not in ROLES_VALIDOS:
        raise HTTPException(status_code=400, detail=f"rol debe ser uno de: {ROLES_VALIDOS}")

    tenant_id = _obtener_tenant_id_por_slug(datos.tenant_slug)
    if tenant_id is None:
        raise HTTPException(status_code=404, detail=f"Tenant '{datos.tenant_slug}' no encontrado.")

    password_hash = bcrypt.hashpw(datos.password.encode(), bcrypt.gensalt()).decode()

    try:
        with get_tenant_connection(tenant_id) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO usuarios_tenant (tenant_id, email, password_hash, rol)
                    VALUES (%s, %s, %s, %s) RETURNING id
                    """,
                    (tenant_id, datos.email, password_hash, datos.rol),
                )
                usuario_id = str(cur.fetchone()[0])
    except Exception as e:
        if "usuarios_tenant_tenant_id_email_key" in str(e):
            raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email en este tenant.")
        logger.error(f"ERROR registrando usuario | tenant={tenant_id} | detalle={e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno registrando el usuario.")

    logger.info(f"USUARIO_REGISTRADO | tenant={tenant_id} | email={datos.email}")
    token = create_access_token(user_id=usuario_id, tenant_id=tenant_id, role=datos.rol)
    return TokenResponse(access_token=token, tenant_id=tenant_id, role=datos.rol)


@router.post("/login", response_model=TokenResponse)
def login(datos: LoginRequest):
    tenant_id = _obtener_tenant_id_por_slug(datos.tenant_slug)
    if tenant_id is None:
        raise HTTPException(status_code=404, detail=f"Tenant '{datos.tenant_slug}' no encontrado.")

    with get_tenant_connection(tenant_id) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, password_hash, rol FROM usuarios_tenant WHERE tenant_id = %s AND email = %s AND activo = true",
                (tenant_id, datos.email),
            )
            fila = cur.fetchone()

    credenciales_invalidas = HTTPException(status_code=401, detail="Email o contraseña incorrectos.")
    if fila is None:
        raise credenciales_invalidas

    usuario_id, password_hash, rol = str(fila[0]), fila[1], fila[2]
    if not bcrypt.checkpw(datos.password.encode(), password_hash.encode()):
        raise credenciales_invalidas

    logger.info(f"LOGIN_OK | tenant={tenant_id} | email={datos.email}")
    token = create_access_token(user_id=usuario_id, tenant_id=tenant_id, role=rol)
    return TokenResponse(access_token=token, tenant_id=tenant_id, role=rol)