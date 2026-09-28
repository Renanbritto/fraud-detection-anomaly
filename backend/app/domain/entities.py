from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class DecisionType(str, Enum):
    APPROVE = "APPROVE"
    REVIEW = "REVIEW"
    BLOCK = "BLOCK"

class PaymentChannel(str, Enum):
    ECOMMERCE = "ecommerce"
    POS = "pos"
    CONTACTLESS = "contactless"
    PIX = "pix"

class TransactionInput(BaseModel):
    transaction_id: str = Field(..., description="Identificador único da transação", example="tx_89123")
    user_id: str = Field(..., description="ID do portador/cliente", example="usr_1042")
    card_id: str = Field(..., description="Token/ID do cartão", example="crd_9941")
    amount: float = Field(..., gt=0, description="Valor da transação em BRL", example=2850.00)
    merchant_mcc: str = Field(..., description="Merchant Category Code", example="5732")
    merchant_risk_score: float = Field(default=0.15, ge=0.0, le=1.0, description="Risco prévio do estabelecimento")
    latitude: float = Field(..., description="Latitude da transação", example=-23.5505)
    longitude: float = Field(..., description="Longitude da transação", example=-46.6333)
    channel: PaymentChannel = Field(default=PaymentChannel.ECOMMERCE, description="Canal de captura")
    user_historical_mean: float = Field(default=120.00, gt=0, description="Ticket médio histórico de 90 dias")
    user_historical_std: float = Field(default=45.00, gt=0, description="Desvio padrão histórico de 90 dias")
    last_tx_latitude: Optional[float] = Field(default=None, description="Latitude da última transação")
    last_tx_longitude: Optional[float] = Field(default=None, description="Longitude da última transação")
    last_tx_timestamp: Optional[datetime] = Field(default=None, description="Data/hora da última transação")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Timestamp da transação atual")

class FeatureVector(BaseModel):
    amount_zscore: float
    velocity_1h: float
    geo_distance_km: float
    merchant_risk: float
    hour_pattern_risk: float
    channel_risk: float
    amount_normalized: float
    night_trans_flag: float

class TransactionScoreResponse(BaseModel):
    transaction_id: str
    decision: DecisionType
    risk_level: RiskLevel
    ensemble_score: float = Field(..., ge=0.0, le=1.0, description="Score ponderado de anomalia")
    if_score: float = Field(..., ge=0.0, le=1.0, description="Score Isolation Forest")
    ae_reconstruction_error: float = Field(..., ge=0.0, description="Erro MSE Autoencoder")
    threshold_used: float
    triggered_rules: List[str]
    features: FeatureVector
    latency_ms: float
    timestamp: datetime

class BatchScoreRequest(BaseModel):
    transactions: List[TransactionInput]

class BatchScoreResponse(BaseModel):
    total_processed: int
    approved_count: int
    reviewed_count: int
    blocked_count: int
    total_prevented_fraud_amount: float
    results: List[TransactionScoreResponse]
    processing_time_ms: float

class SimulationRequest(BaseModel):
    cost_fp: float = Field(default=15.0, gt=0, description="Custo operacional de falso positivo (BRL)")
    cost_fn: float = Field(default=3500.0, gt=0, description="Custo médio de fraude não capturada (BRL)")
    threshold: float = Field(default=0.65, ge=0.10, le=0.95, description="Ponto de corte para bloqueio")
    monthly_transactions: int = Field(default=488000, gt=1000)

class SimulationResponse(BaseModel):
    cost_fp: float
    cost_fn: float
    threshold: float
    precision_pct: float
    recall_pct: float
    f1_pct: float
    false_positives: int
    false_negatives: int
    frauds_caught: int
    frauds_missed: int
    total_operational_cost: float
    total_fraud_loss: float
    total_loss: float
    money_saved_brl: float
    roi_ratio: float
