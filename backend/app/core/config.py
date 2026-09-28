from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sentinel Fraud Detection Engine"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    # Redis Configuration
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""
    REDIS_TIMEOUT_SEC: float = 1.0

    # ML Hyperparameters
    ISOLATION_FOREST_WEIGHT: float = 0.55
    AUTOENCODER_WEIGHT: float = 0.45
    DEFAULT_THRESHOLD: float = 0.65
    REVIEW_THRESHOLD: float = 0.45

    # Cost-Sensitive Decision Loss (BRL)
    COST_FALSE_POSITIVE: float = 15.00
    COST_FALSE_NEGATIVE: float = 3500.00

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
