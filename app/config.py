import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL_APP_USER = os.getenv(
    "DATABASE_URL_APP_USER",
    "postgresql://app_user:changeme@localhost:5433/churn_saas"
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "clave-insegura-solo-para-dev-cambiar-en-produccion")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL")
CHURN_ALERT_THRESHOLD = float(os.getenv("CHURN_ALERT_THRESHOLD", "0.80"))
