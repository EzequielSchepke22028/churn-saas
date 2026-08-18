"""
Schemas de request/response para la configuracion de un tenant:
mapeo de columnas (traduccion CSV del cliente -> pipeline) y factor
de conversion monetaria.
"""

from pydantic import BaseModel, Field


class MapeoColumnaItem(BaseModel):
    """
    Una fila de configuracion: como se traduce UNA columna del
    pipeline (ej. 'gender') a la columna que el tenant usa en su
    propio CSV (ej. 'Sexo'), mas la traduccion de sus valores
    categoricos si corresponde.
    """
    columna_pipeline: str = Field(..., description="Nombre de columna que espera el modelo, ej. 'gender'")
    columna_origen: str = Field(..., description="Nombre de columna en el CSV del tenant, ej. 'Sexo'")
    mapeo_valores: dict | None = Field(
        default=None,
        description="Traduccion de valores categoricos, ej. {'M': 'Male', 'F': 'Female'}. None para columnas numericas.",
    )


class MapeoResponse(BaseModel):
    """Respuesta de GET /configuracion/mapeo -- el mapeo completo actual del tenant."""
    tenant_id: str
    mapeo: list[MapeoColumnaItem]


class MapeoUpdateRequest(BaseModel):
    """
    Body de PUT /configuracion/mapeo -- reemplaza el mapeo completo.
    Se espera la lista entera (las 19 filas), no updates parciales:
    el service borra el mapeo viejo del tenant e inserta este de cero,
    dentro de una misma transaccion.
    """
    mapeo: list[MapeoColumnaItem]


class FactorConversionResponse(BaseModel):
    """Respuesta de GET /configuracion/factor-conversion."""
    tenant_id: str
    factor_conversion: float


class FactorConversionUpdateRequest(BaseModel):
    """Body de PUT /configuracion/factor-conversion."""
    factor_conversion: float = Field(..., gt=0, description="Debe ser mayor a 0 -- un factor 0 o negativo rompe la division en mapeo_service.")