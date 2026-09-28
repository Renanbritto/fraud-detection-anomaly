import numpy as np
from sklearn.ensemble import IsolationForest
from app.domain.entities import FeatureVector

class IsolationForestAnomalyDetector:
    def __init__(self, n_estimators: int = 300, contamination: float = 0.005):
        self.n_estimators = n_estimators
        self.contamination = contamination
        self.model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=42,
            n_jobs=-1
        )
        self._fit_mock_calibration_data()

    def _fit_mock_calibration_data(self):
        # Calibra a floresta com 1500 pontos normais de controle e 15 outliers sintéticos
        np.random.seed(42)
        normal_samples = np.random.normal(loc=[0.05, 0.1, 0.02, 0.15, 0.1, 0.1, 0.08, 0.0],
                                          scale=[0.2, 0.15, 0.05, 0.1, 0.15, 0.1, 0.05, 0.1],
                                          size=(1500, 8))
        outlier_samples = np.random.uniform(low=0.7, high=1.8, size=(15, 8))
        X_train = np.vstack([normal_samples, outlier_samples])
        self.model.fit(X_train)

    def compute_anomaly_score(self, features: FeatureVector) -> float:
        vector = np.array([[
            features.amount_zscore,
            features.velocity_1h,
            features.geo_distance_km,
            features.merchant_risk,
            features.hour_pattern_risk,
            features.channel_risk,
            features.amount_normalized,
            features.night_trans_flag
        ]])
        # decision_function retorna valores negativos para anomalias e positivos para normais
        raw_score = self.model.decision_function(vector)[0]
        # Converte para probabilidade calibrada de anomalia [0, 1]
        calibrated_score = 1.0 / (1.0 + np.exp(raw_score * 8.0))
        return float(np.clip(calibrated_score, 0.0, 1.0))
