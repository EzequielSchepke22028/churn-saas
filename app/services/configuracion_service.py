"""
Servicio de configuracion por tenant: lectura y escritura del mapeo
de columnas y del factor de conversion monetaria, respetando RLS.

Todas las funciones reciben una conexion ya abierta (via
get_tenant_connection en database.py), con SET LOCAL
app.current_workspace_id ya aplicado -- este servicio nunca abre su
propia conexion, para no romper el aislamiento por tenant que ya
resuelve database.py.
"""

import psycopg2.extras

from app.schemas.configuracion import MapeoColumnaItem
from app.services.mapeo_service import COLUMNAS_PIPELINE


def obtener_mapeo(conn, tenant_id: str) -> list[MapeoColumnaItem]:
    """
    Lee el mapeo completo actual del tenant. Devuelve lista vacia si
    el tenant todavia no configuro nada (no es un error -- un tenant
    recien creado legitimamente no tiene mapeo todavia).
    """
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT columna_pipeline, columna_origen, mapeo_valores
            FROM mapeo_columnas
            WHERE tenant_id = %s
            ORDER BY columna_pipeline
            """,
            (tenant_id,),
        )
        filas = cur.fetchall()

    return [
        MapeoColumnaItem(
            columna_pipeline=fila["columna_pipeline"],
            columna_origen=fila["columna_origen"],
            mapeo_valores=fila["mapeo_valores"],
        )
        for fila in filas
    ]


def reemplazar_mapeo(conn, tenant_id: str, mapeo: list[MapeoColumnaItem]) -> None:
    """
    Reemplaza el mapeo completo del tenant: borra todas sus filas
    actuales en mapeo_columnas e inserta las nuevas, todo dentro de
    la misma transaccion (el commit/rollback lo maneja
    get_tenant_connection, no esta funcion).

    No valida aca que las 19 columnas del pipeline esten cubiertas --
    esa validacion vive en mapeo_service.validar_mapeo_completo() y
    se corre en tiempo de PREDICCION, no de configuracion. Se permite
    guardar un mapeo incompleto a proposito (el tenant puede estar
    configurando de a poco); el error recien aparece si intenta
    predecir sin haber completado las 19.
    """
    with conn.cursor() as cur:
        cur.execute("DELETE FROM mapeo_columnas WHERE tenant_id = %s", (tenant_id,))

        for item in mapeo:
            cur.execute(
                """
                INSERT INTO mapeo_columnas
                    (tenant_id, columna_pipeline, columna_origen, mapeo_valores)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    tenant_id,
                    item.columna_pipeline,
                    item.columna_origen,
                    psycopg2.extras.Json(item.mapeo_valores) if item.mapeo_valores else None,
                ),
            )


def validar_columnas_pipeline(mapeo: list[MapeoColumnaItem]) -> list[str]:
    """
    Chequeo de sanidad ANTES de guardar: confirma que las
    columna_pipeline mandadas son nombres reales que el pipeline
    reconoce (no typos como 'gendr' en vez de 'gender'). Devuelve la
    lista de nombres invalidos -- vacia si todo esta bien.

    No exige que esten las 19 -- eso es responsabilidad de
    mapeo_service en tiempo de prediccion, como se explico arriba.
    """
    columnas_recibidas = {item.columna_pipeline for item in mapeo}
    columnas_validas = set(COLUMNAS_PIPELINE)
    return sorted(columnas_recibidas - columnas_validas)


def obtener_factor_conversion(conn, tenant_id: str) -> float:
    """
    Lee el factor_conversion actual del tenant desde la tabla
    'tenants'. Esta tabla NO tiene RLS (es la tabla raiz, ver
    001_init.sql) -- el filtro por id es manual aca, no se apoya en
    RLS para esta consulta en particular. Reutiliza el mismo patron
    que ya existe en mapeo_service.obtener_factor_conversion.
    """
    with conn.cursor() as cur:
        cur.execute("SELECT factor_conversion FROM tenants WHERE id = %s", (tenant_id,))
        fila = cur.fetchone()

    if fila is None:
        raise ValueError(f"Tenant '{tenant_id}' no encontrado.")

    return float(fila[0])


def actualizar_factor_conversion(conn, tenant_id: str, factor: float) -> None:
    """
    Actualiza el factor_conversion del tenant. La validacion gt=0 ya
    la hizo Pydantic en el schema (FactorConversionUpdateRequest)
    antes de que este codigo se ejecute -- esta funcion no repite esa
    validacion, confia en que el router ya filtro el input.
    """
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE tenants SET factor_conversion = %s WHERE id = %s",
            (factor, tenant_id),
        )