import time
from typing import Tuple
from app.core.config import settings
from app.domain.entities import (
    DecisionType,
    FeatureVector,
    RiskLevel,
    TransactionInput,
    TransactionScoreResponse,
)
from app.ml.autoencoder_model import AutoencoderAnomalyDetector
from app.ml.feature_engineering import FeatureEngine
from app.ml.isolation_forest_model import IsolationForestAnomalyDetector

class FraudEnsembleEngine:
    def __init__(self):
        self.feature_engine = FeatureEngine()
        self.isolation_forest = IsolationForestAnomalyDetector(
            n_estimators=300,
            contamination=0.005
        )
        self.autoencoder = AutoencoderAnomalyDetector(input_dim=8, latent_dim=4)

    def evaluate_transaction(
        self,
        tx: TransactionInput,
        custom_threshold: float = None
    ) -> TransactionScoreResponse:
        start_time = time.perf_counter()

        # 1. Feature Engineering
        features, triggered_rules = self.feature_engine.extract_features(tx)

        # 2. Isolation Forest Score
        if_score = self.isolation_forest.compute_anomaly_score(features)

        # 3. Autoencoder Reconstruction Error & Score
        ae_mse, ae_score = self.autoencoder.compute_reconstruction_error(features)

        # 4. Ensemble Ponderado
        w_if = settings.ISOLATION_FOREST_WEIGHT
        w_ae = settings.AUTOENCODER_WEIGHT
        ensemble_score = (w_if * if_score) + (w_ae * ae_score)
        ensemble_score = round(float(ensemble_score), 4)

        # 5. Tomada de Decisão Sensível a Custo
        threshold = custom_threshold if custom_threshold is not None else settings.DEFAULT_THRESHOLD
        review_threshold = settings.REVIEW_THRESHOLD

        if ensemble_score >= threshold:
            decision = DecisionType.BLOCK
            risk_level = RiskLevel.CRITICAL if ensemble_score >= 0.85 else RiskLevel.HIGH
        elif ensemble_score >= review_threshold:
            decision = DecisionType.REVIEW
            risk_level = RiskLevel.MEDIUM
        else:
            decision = DecisionType.APPROVE
            risk_level = RiskLevel.LOW

        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return TransactionScoreResponse(
            transaction_id=tx.transaction_id,
            decision=decision,
            risk_level=risk_level,
            ensemble_score=ensemble_score,
            if_score=round(if_score, 4),
            ae_reconstruction_error=round(ae_mse, 4),
            threshold_used=threshold,
            triggered_rules=triggered_rules,
            features=features,
            latency_ms=latency_ms,
            timestamp=tx.timestamp
        )

ensemble_engine = FraudEnsembleEngine()
