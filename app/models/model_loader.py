"""
Carga del pipeline entrenado. Se carga una sola vez al importar este
módulo (no en cada request) -- el archivo .pkl no cambia durante la
vida del proceso, cargarlo por request sería carísimo sin ganancia.
"""

from pathlib import Path

import joblib

from app.logging_config import logger

PIPELINE_PATH = Path(__file__).resolve().parent / "assets" / "churn_pipeline.pkl"

try:
    pipeline = joblib.load(PIPELINE_PATH)
    logger.info(f"Pipeline cargado OK desde {PIPELINE_PATH}")
except Exception as e:
    logger.critical(f"FALLO carga de pipeline al iniciar: {e}")
    raise