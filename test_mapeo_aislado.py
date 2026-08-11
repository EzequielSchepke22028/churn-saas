"""
Test aislado de app/services/mapeo_service.py, usando el mismo
database.py que va a usar la API real -- no abre su propia conexión
por separado, para que el test valide el camino real de principio a
fin (pool + RLS + mapeo + conversión + modelo), no un atajo aparte.
"""

from pathlib import Path

import joblib
import pandas as pd

from app.database import init_pool, get_tenant_connection
from app.services.mapeo_service import (
    preparar_dataframe_para_pipeline,
    COLUMNAS_PIPELINE,
)

TENANT_ID = "dc2f4eb0-1483-4f1e-8143-dd6ac08e8826"  # tenant-prueba
PIPELINE_PATH = Path(__file__).resolve().parent / "app" / "models" / "assets" / "churn_pipeline.pkl"


def main():
    init_pool()

    df_csv_gimnasio = pd.DataFrame([
        {
            "Meses_Cliente": 12, "Cuota_Mensual": 8500.0, "Total_Pagado": 102000.0,
            "Sexo": "M", "Es_Mayor": "No", "Tiene_Pareja": "Si", "Tiene_Hijos": "No",
            "Tiene_Telefono": "Si", "Lineas_Multiples": "No",
            "Tipo_Internet": "Fibra", "Seguridad_Online": "No", "Backup_Online": "Si",
            "Proteccion_Dispositivo": "No", "Soporte_Tecnico": "No",
            "Streaming_TV": "Si", "Streaming_Peliculas": "Si",
            "Tipo_Contrato": "Mensual", "Factura_Digital": "Si",
            "Metodo_Pago": "Cheque_Electronico",
        },
        {
            "Meses_Cliente": 48, "Cuota_Mensual": 4200.0, "Total_Pagado": 201600.0,
            "Sexo": "F", "Es_Mayor": "Si", "Tiene_Pareja": "No", "Tiene_Hijos": "Si",
            "Tiene_Telefono": "Si", "Lineas_Multiples": "Si",
            "Tipo_Internet": "DSL", "Seguridad_Online": "Si", "Backup_Online": "No",
            "Proteccion_Dispositivo": "Si", "Soporte_Tecnico": "Si",
            "Streaming_TV": "No", "Streaming_Peliculas": "No",
            "Tipo_Contrato": "Bianual", "Factura_Digital": "No",
            "Metodo_Pago": "Transferencia_Bancaria",
        },
        {
            "Meses_Cliente": 3, "Cuota_Mensual": 9800.0, "Total_Pagado": 29400.0,
            "Sexo": "M", "Es_Mayor": "No", "Tiene_Pareja": "No", "Tiene_Hijos": "No",
            "Tiene_Telefono": "No", "Lineas_Multiples": "Sin_Telefono",
            "Tipo_Internet": "No", "Seguridad_Online": "Sin_Internet",
            "Backup_Online": "Sin_Internet", "Proteccion_Dispositivo": "Sin_Internet",
            "Soporte_Tecnico": "Sin_Internet", "Streaming_TV": "Sin_Internet",
            "Streaming_Peliculas": "Sin_Internet",
            "Tipo_Contrato": "Anual", "Factura_Digital": "Si",
            "Metodo_Pago": "Tarjeta_Credito",
        },
    ])

    print(f"CSV simulado: {len(df_csv_gimnasio)} filas, {len(df_csv_gimnasio.columns)} columnas en español.\n")

    with get_tenant_connection(TENANT_ID) as conn:
        df_listo = preparar_dataframe_para_pipeline(conn, TENANT_ID, df_csv_gimnasio)

    print("Mapeo aplicado OK. DataFrame resultante:\n")
    print(df_listo.to_string())

    columnas_ok = list(df_listo.columns) == COLUMNAS_PIPELINE
    print(f"\n¿Columnas coinciden exactamente con las 19 esperadas por el pipeline? {columnas_ok}")
    if not columnas_ok:
        print("Esperadas:", COLUMNAS_PIPELINE)
        print("Obtenidas:", list(df_listo.columns))
        return

    pipeline = joblib.load(PIPELINE_PATH)
    probs = pipeline.predict_proba(df_listo)[:, 1]

    print("\nProbabilidades de churn (mapeo -> encoding -> modelo, de punta a punta):")
    for i, p in enumerate(probs):
        print(f"  Fila {i} (gimnasio, español): churn_probability = {p:.4f}")


if __name__ == "__main__":
    main()