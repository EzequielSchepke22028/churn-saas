"""Endpoint de predicciones, protegido por JWT: tenant_id sale del token, no de la URL."""

import io
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.auth.dependencies import UsuarioActual, get_current_user
from app.database import get_tenant_connection
from app.logging_config import logger
from app.models.model_loader import pipeline
from app.schemas.prediccion import PrediccionBatchResponse, PrediccionItem
from app.services.mapeo_service import (
    ColumnaOrigenNoEncontradaError,
    MapeoIncompletoError,
    TenantNoEncontradoError,
    preparar_dataframe_para_pipeline,
)

router = APIRouter(prefix="/predicciones", tags=["predicciones"])


@router.post("", response_model=PrediccionBatchResponse)
async def crear_predicciones(
    archivo: UploadFile = File(...),
    usuario: UsuarioActual = Depends(get_current_user),
):
    tenant_id = usuario.tenant_id

    if not archivo.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un .csv")

    contenido = await archivo.read()
    try:
        df_origen = pd.read_csv(io.BytesIO(contenido))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo leer el CSV: {e}")

    if df_origen.empty:
        raise HTTPException(status_code=400, detail="El CSV no tiene filas.")

    try:
        with get_tenant_connection(tenant_id) as conn:
            df_listo = preparar_dataframe_para_pipeline(conn, tenant_id, df_origen)
            probs = pipeline.predict_proba(df_listo)[:, 1]

            predicciones = []
            with conn.cursor() as cur:
                for i, prob in enumerate(probs):
                    cur.execute(
                        """
                        INSERT INTO predicciones_historial
                            (tenant_id, cliente_identificador, input_data, churn_probability, creado_por)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (tenant_id, str(i), df_origen.iloc[i].to_json(), round(float(prob), 4), usuario.user_id),
                    )
                    predicciones.append(PrediccionItem(fila_indice=i, churn_probability=round(float(prob), 4)))

        logger.info(f"PREDICCION_BATCH | tenant={tenant_id} | usuario={usuario.user_id} | filas={len(predicciones)}")
        return PrediccionBatchResponse(tenant_id=tenant_id, total_filas=len(predicciones), predicciones=predicciones)

    except TenantNoEncontradoError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except MapeoIncompletoError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ColumnaOrigenNoEncontradaError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"ERROR inesperado | tenant={tenant_id} | detalle={e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error interno procesando las predicciones.")