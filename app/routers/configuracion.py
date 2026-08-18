"""
Endpoints de configuracion por tenant: mapeo de columnas y factor de
conversion monetaria. GET disponible para cualquier rol autenticado
del tenant; PUT restringido a owner/admin.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.auth.dependencies import UsuarioActual, get_current_user, requerir_roles
from app.database import get_tenant_connection
from app.logging_config import logger
from app.schemas.configuracion import (
    FactorConversionResponse,
    FactorConversionUpdateRequest,
    MapeoResponse,
    MapeoUpdateRequest,
)
from app.services.configuracion_service import (
    actualizar_factor_conversion,
    obtener_factor_conversion,
    obtener_mapeo,
    reemplazar_mapeo,
    validar_columnas_pipeline,
)

router = APIRouter(prefix="/configuracion", tags=["configuracion"])


@router.get("/mapeo", response_model=MapeoResponse)
def get_mapeo(usuario: UsuarioActual = Depends(get_current_user)):
    with get_tenant_connection(usuario.tenant_id) as conn:
        mapeo = obtener_mapeo(conn, usuario.tenant_id)

    return MapeoResponse(tenant_id=usuario.tenant_id, mapeo=mapeo)


@router.put("/mapeo", response_model=MapeoResponse)
def put_mapeo(
    datos: MapeoUpdateRequest,
    usuario: UsuarioActual = Depends(requerir_roles("owner", "admin")),
):
    columnas_invalidas = validar_columnas_pipeline(datos.mapeo)
    if columnas_invalidas:
        raise HTTPException(
            status_code=422,
            detail=f"Columnas de pipeline no reconocidas: {columnas_invalidas}",
        )

    try:
        with get_tenant_connection(usuario.tenant_id) as conn:
            reemplazar_mapeo(conn, usuario.tenant_id, datos.mapeo)
            mapeo_actualizado = obtener_mapeo(conn, usuario.tenant_id)
    except Exception as e:
        logger.error(f"ERROR actualizando mapeo | tenant={usuario.tenant_id} | detalle={e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno actualizando el mapeo.")

    logger.info(f"MAPEO_ACTUALIZADO | tenant={usuario.tenant_id} | usuario={usuario.user_id} | filas={len(datos.mapeo)}")
    return MapeoResponse(tenant_id=usuario.tenant_id, mapeo=mapeo_actualizado)


@router.get("/factor-conversion", response_model=FactorConversionResponse)
def get_factor_conversion(usuario: UsuarioActual = Depends(get_current_user)):
    with get_tenant_connection(usuario.tenant_id) as conn:
        factor = obtener_factor_conversion(conn, usuario.tenant_id)

    return FactorConversionResponse(tenant_id=usuario.tenant_id, factor_conversion=factor)


@router.put("/factor-conversion", response_model=FactorConversionResponse)
def put_factor_conversion(
    datos: FactorConversionUpdateRequest,
    usuario: UsuarioActual = Depends(requerir_roles("owner", "admin")),
):
    try:
        with get_tenant_connection(usuario.tenant_id) as conn:
            actualizar_factor_conversion(conn, usuario.tenant_id, datos.factor_conversion)
    except Exception as e:
        logger.error(f"ERROR actualizando factor_conversion | tenant={usuario.tenant_id} | detalle={e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno actualizando el factor de conversion.")

    logger.info(f"FACTOR_ACTUALIZADO | tenant={usuario.tenant_id} | usuario={usuario.user_id} | factor={datos.factor_conversion}")
    return FactorConversionResponse(tenant_id=usuario.tenant_id, factor_conversion=datos.factor_conversion)