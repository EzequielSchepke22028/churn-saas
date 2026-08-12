"""
Conexión a Postgres para churn-saas, con aislamiento por tenant vía
Row Level Security.

Patrón: un pool de conexiones autenticado como 'app_user' (no
superuser, RLS aplica siempre). Cada operación de un tenant se
ejecuta dentro de una transacción donde primero se hace
SET LOCAL app.current_workspace_id -- ese SET LOCAL solo vive
dentro de esa transacción, así que al devolver la conexión al pool
no queda "pegado" el tenant de un request anterior en la próxima
conexión que se reuse.
"""

import uuid
from contextlib import contextmanager

import psycopg2
from psycopg2 import pool as pg_pool

from app.config import DATABASE_URL_APP_USER
from app.logging_config import logger

_pool: pg_pool.SimpleConnectionPool | None = None


def init_pool(minconn: int = 1, maxconn: int = 10) -> None:
    """
    Crea el pool de conexiones. Se llama una sola vez, típicamente en
    el startup de FastAPI (ver app/main.py). Si ya existe un pool,
    no hace nada -- evita crear pools duplicados en hot-reload.
    """
    global _pool
    if _pool is not None:
        return
    _pool = pg_pool.SimpleConnectionPool(minconn, maxconn, DATABASE_URL_APP_USER)
    logger.info(f"Pool de conexiones a Postgres inicializado (min={minconn}, max={maxconn}).")


def close_pool() -> None:
    """Cierra todas las conexiones del pool. Llamar en el shutdown de FastAPI."""
    global _pool
    if _pool is not None:
        _pool.closeall()
        _pool = None
        logger.info("Pool de conexiones a Postgres cerrado.")


def _get_pool() -> pg_pool.SimpleConnectionPool:
    if _pool is None:
        # Fallback por si algo usa la conexión antes del startup formal
        # (por ejemplo, un script standalone) -- inicializa con
        # valores por defecto en vez de fallar.
        init_pool()
    return _pool


@contextmanager
def get_tenant_connection(tenant_id: str):
    """
    Context manager que entrega una conexión con el tenant ya seteado
    para RLS, dentro de una transacción. Al salir del bloque 'with'
    sin excepciones, hace commit; si hubo excepción, hace rollback.
    En cualquier caso, devuelve la conexión al pool al final.

    Uso:
        with get_tenant_connection(tenant_id) as conn:
            mapeo = obtener_mapeo_tenant(conn, tenant_id)
            ...

    Valida el UUID ANTES de interpolarlo en el SQL -- psycopg2 no
    soporta parámetros %s en sentencias SET, así que la interpolación
    manual es necesaria, pero solo es segura si el valor ya se probó
    que es un UUID válido (mismo patrón usado en el CRM).
    """
    tenant_uuid = str(uuid.UUID(tenant_id))  # tira ValueError si no es un UUID válido

    pool_ = _get_pool()
    conn = pool_.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(f"SET LOCAL app.current_workspace_id = '{tenant_uuid}';")
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool_.putconn(conn)


def get_db_dependency(tenant_id: str):
    """
    Generador pensado para usarse como dependencia de FastAPI
    (Depends). tenant_id normalmente vendría de otra dependencia que
    lo extraiga del JWT -- por ahora, hasta que auth esté armado, se
    pasa explícito.

    Uso futuro en un router:
        def endpoint(conn = Depends(lambda: get_db_dependency(tenant_id_del_jwt))):
            ...
    """
    with get_tenant_connection(tenant_id) as conn:
        yield conn

@contextmanager
def get_connection():
    """
    Conexión simple del pool, SIN SET LOCAL de tenant. Usar solo para
    consultas sobre tablas sin RLS (ej. 'tenants' -- buscar un tenant
    por slug antes de saber su tenant_id, como en login/registro).
    """
    pool_ = _get_pool()
    conn = pool_.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool_.putconn(conn)