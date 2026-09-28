from datetime import datetime
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

_START_TIME = datetime.utcnow()

@router.get("/health", summary="Health Check do Sistema")
async def health_check():
    uptime_seconds = (datetime.utcnow() - _START_TIME).total_seconds()
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "uptime_seconds": round(uptime_seconds, 1),
        "models": {
            "isolation_forest": "loaded (300 estimators)",
            "autoencoder_pytorch": "loaded (undercomplete funnel 8->32->16->4)",
            "ensemble_weights": {
                "if": settings.ISOLATION_FOREST_WEIGHT,
                "ae": settings.AUTOENCODER_WEIGHT
            }
        },
        "default_threshold": settings.DEFAULT_THRESHOLD
    }
