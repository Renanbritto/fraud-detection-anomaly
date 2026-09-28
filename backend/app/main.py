from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Inicialização dos modelos de Machine Learning
    logger.info("Iniciando %s v%s...", settings.PROJECT_NAME, settings.VERSION)
    logger.info("Ambiente: %s (Debug=%s)", settings.ENVIRONMENT, settings.DEBUG)
    logger.info("Modelos de Machine Learning carregados com sucesso.")
    yield
    # Shutdown
    logger.info("Encerrando Sentinel Fraud Detection Engine.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Sistema de Anomaly Detection em tempo real para prevenção de fraudes financeiras. "
        "Utiliza ensemble de Isolation Forest (scikit-learn) com Autoencoder neural (PyTorch) "
        "e calibração de ponto de corte sensível ao custo financeiro assimétrico de erros."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuração de CORS para comunicação fluida com Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/", include_in_schema=False)
async def root():
    return {
        "message": f"{settings.PROJECT_NAME} is running.",
        "documentation": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health"
    }
