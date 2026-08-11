import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL_APP_USER = os.getenv(
    "DATABASE_URL_APP_USER",
    "postgresql://app_user:changeme@localhost:5433/churn_saas"
)