"""
Servicio de mapeo de columnas: traduce un DataFrame con las columnas
y valores propios de un tenant al formato exacto que espera el
pipeline entrenado (19 columnas: 3 numéricas + 16 categóricas,
con los valores categóricos idénticos a los vistos en entrenamiento).

Incluye conversión de escala monetaria por tenant (factor_conversion),
porque el pipeline fue entrenado con montos en USD (dataset Telco) y
un tenant real puede facturar en otra moneda o escala.
"""

import pandas as pd
import psycopg2.extras

COLUMNAS_NUMERICAS_PIPELINE = ["tenure", "MonthlyCharges", "TotalCharges"]
COLUMNAS_CATEGORICAS_PIPELINE = [
    "gender", "SeniorCitizen", "Partner", "Dependents", "PhoneService",
    "MultipleLines", "InternetService", "OnlineSecurity", "OnlineBackup",
    "DeviceProtection", "TechSupport", "StreamingTV", "StreamingMovies",
    "Contract", "PaperlessBilling", "PaymentMethod",
]
COLUMNAS_PIPELINE = COLUMNAS_NUMERICAS_PIPELINE + COLUMNAS_CATEGORICAS_PIPELINE

# Solo las columnas de monto se dividen por el factor de conversión.
# 'tenure' es una cantidad de meses, no un monto -- dividirla por el
# factor la rompería (12 meses / 1000 no tiene ningún sentido).
COLUMNAS_MONETARIAS = ["MonthlyCharges", "TotalCharges"]


class MapeoIncompletoError(Exception):
    """El tenant no configuró mapeo para una o más columnas requeridas."""
    def __init__(self, columnas_faltantes: list[str]):
        self.columnas_faltantes = columnas_faltantes
        super().__init__(
            f"Faltan mapear {len(columnas_faltantes)} columna(s): "
            f"{', '.join(columnas_faltantes)}"
        )


class ColumnaOrigenNoEncontradaError(Exception):
    """El CSV subido no tiene la columna que el mapeo dice que debería tener."""
    def __init__(self, columna_pipeline: str, columna_origen: str):
        self.columna_pipeline = columna_pipeline
        self.columna_origen = columna_origen
        super().__init__(
            f"El mapeo de '{columna_pipeline}' espera la columna "
            f"'{columna_origen}' en el archivo, pero no está presente."
        )


class TenantNoEncontradoError(Exception):
    """No existe un tenant con ese id (o no está activo)."""
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        super().__init__(f"Tenant '{tenant_id}' no encontrado.")


def obtener_mapeo_tenant(conn, tenant_id: str) -> dict:
    """
    Trae la configuración de mapeo de un tenant desde la DB.

    Devuelve un dict: {columna_pipeline: {"columna_origen": str, "mapeo_valores": dict | None}}

    La conexión 'conn' ya debe tener seteado app.current_workspace_id
    (vía SET LOCAL) antes de llamar a esta función, para que RLS filtre
    correctamente por tenant en la tabla mapeo_columnas.
    """
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT columna_pipeline, columna_origen, mapeo_valores
            FROM mapeo_columnas
            WHERE tenant_id = %s
            """,
            (tenant_id,),
        )
        filas = cur.fetchall()

    mapeo = {}
    for fila in filas:
        mapeo[fila["columna_pipeline"]] = {
            "columna_origen": fila["columna_origen"],
            "mapeo_valores": fila["mapeo_valores"],
        }
    return mapeo


def obtener_factor_conversion(conn, tenant_id: str) -> float:
    """
    Trae el factor_conversion del tenant desde la tabla 'tenants'.

    NOTA: 'tenants' no tiene RLS (es la tabla raíz, ver 001_init.sql),
    así que acá el filtro por id es manual -- no hay que confiar en
    RLS para esta consulta en particular.
    """
    with conn.cursor() as cur:
        cur.execute(
            "SELECT factor_conversion FROM tenants WHERE id = %s",
            (tenant_id,),
        )
        fila = cur.fetchone()

    if fila is None:
        raise TenantNoEncontradoError(tenant_id)

    return float(fila[0])


def validar_mapeo_completo(mapeo: dict) -> None:
    """
    Confirma que el tenant configuró mapeo para las 19 columnas que
    el pipeline necesita. Si falta alguna, corta acá con un error
    legible en vez de dejar que explote más adelante en sklearn.
    """
    faltantes = [col for col in COLUMNAS_PIPELINE if col not in mapeo]
    if faltantes:
        raise MapeoIncompletoError(faltantes)


def aplicar_mapeo(df_origen: pd.DataFrame, mapeo: dict) -> pd.DataFrame:
    """
    Toma el DataFrame tal como lo subió el tenant (con SUS nombres de
    columna y SUS valores) y devuelve un DataFrame con exactamente las
    columnas y valores que el pipeline espera. Los montos NO se
    convierten acá todavía -- eso lo hace aplicar_factor_conversion
    en un paso separado, después de este.

    Se asume que validar_mapeo_completo() ya se corrió antes y no tiró
    error -- esta función no vuelve a chequear eso.
    """
    columnas_resultado = {}

    for columna_pipeline in COLUMNAS_PIPELINE:
        config = mapeo[columna_pipeline]
        columna_origen = config["columna_origen"]
        mapeo_valores = config["mapeo_valores"]

        if columna_origen not in df_origen.columns:
            raise ColumnaOrigenNoEncontradaError(columna_pipeline, columna_origen)

        serie = df_origen[columna_origen]

        if mapeo_valores:
            serie = serie.map(lambda v: mapeo_valores.get(str(v), v))

        columnas_resultado[columna_pipeline] = serie

    return pd.DataFrame(columnas_resultado)


def aplicar_factor_conversion(df_mapeado: pd.DataFrame, factor: float) -> pd.DataFrame:
    """
    Divide las columnas monetarias por el factor de conversión del
    tenant, para acercar su escala de precios a la que vio el
    StandardScaler en entrenamiento (dataset Telco, en USD).

    factor=1.0 (el default) deja los valores intactos -- un tenant
    que ya factura en una escala similar a Telco no necesita tocar
    nada.
    """
    df_convertido = df_mapeado.copy()
    for columna in COLUMNAS_MONETARIAS:
        df_convertido[columna] = df_convertido[columna] / factor
    return df_convertido


def preparar_dataframe_para_pipeline(
    conn, tenant_id: str, df_origen: pd.DataFrame
) -> pd.DataFrame:
    """
    Punto de entrada único del servicio: dado el CSV crudo de un
    tenant, devuelve el DataFrame listo para pipeline.predict_proba().

    Orden de operaciones: mapear columnas/valores -> validar
    completitud -> convertir escala monetaria. La conversión va al
    final a propósito, para que trabaje siempre sobre nombres de
    columna ya normalizados (MonthlyCharges/TotalCharges), sin
    importar cómo se llamaban en el archivo original del tenant.

    Uso típico en un router:
        df_listo = preparar_dataframe_para_pipeline(conn, tenant_id, df_subido)
        probs = pipeline.predict_proba(df_listo)
    """
    mapeo = obtener_mapeo_tenant(conn, tenant_id)
    validar_mapeo_completo(mapeo)
    df_mapeado = aplicar_mapeo(df_origen, mapeo)

    factor = obtener_factor_conversion(conn, tenant_id)
    df_final = aplicar_factor_conversion(df_mapeado, factor)

    return df_final