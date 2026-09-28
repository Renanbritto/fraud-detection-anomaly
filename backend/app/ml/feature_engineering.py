import math
from datetime import datetime, timezone
from typing import Dict, Optional, Tuple
from app.domain.entities import FeatureVector, PaymentChannel, TransactionInput
from app.core.logging import logger

class InMemoryVelocityStore:
    def __init__(self):
        self._store: Dict[str, list[datetime]] = {}

    def record_and_get_velocity(self, key: str, current_time: datetime) -> int:
        cutoff = current_time.timestamp() - 3600
        history = self._store.get(key, [])
        # Filtra transações da última hora
        valid = [t for t in history if t.timestamp() >= cutoff]
        valid.append(current_time)
        self._store[key] = valid
        return len(valid)

_velocity_store = InMemoryVelocityStore()

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0 # Raio da Terra em km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class FeatureEngine:
    def __init__(self, redis_client=None):
        self.redis = redis_client

    def extract_features(self, tx: TransactionInput) -> Tuple[FeatureVector, list[str]]:
        triggered_rules = []

        # 1. Z-Score do valor
        mean = tx.user_historical_mean or 100.0
        std = tx.user_historical_std or 30.0
        z_score = (tx.amount - mean) / max(std, 1.0)
        if z_score > 3.5:
            triggered_rules.append(f"Z-Score de valor extremo ({z_score:.1f} desvios)")

        # 2. Velocidade transacional (1h)
        now = tx.timestamp or datetime.now(timezone.utc)
        card_key = f"vel:{tx.card_id}"
        velocity_1h = _velocity_store.record_and_get_velocity(card_key, now)
        if velocity_1h >= 5:
            triggered_rules.append(f"Alta velocidade de transação ({velocity_1h} tx/hora)")

        # 3. Distância Geográfica
        geo_dist = 0.0
        if tx.last_tx_latitude is not None and tx.last_tx_longitude is not None:
            geo_dist = haversine_distance(
                tx.last_tx_latitude, tx.last_tx_longitude,
                tx.latitude, tx.longitude
            )
            # Checa velocidade de deslocamento se tiver timestamp
            if tx.last_tx_timestamp:
                delta_hours = max((now - tx.last_tx_timestamp).total_seconds() / 3600.0, 0.01)
                speed_kmh = geo_dist / delta_hours
                if speed_kmh > 700.0:
                    triggered_rules.append(f"Viagem impossível: {speed_kmh:.0f} km/h entre transações")
        
        # 4. Risco do Merchant (MCC)
        mcc_risk = tx.merchant_risk_score
        if mcc_risk > 0.6:
            triggered_rules.append(f"Estabelecimento com score de alto risco (MCC {tx.merchant_mcc})")

        # 5. Padrão Horário (Risco elevado de madrugada 02h às 05h)
        hour = now.hour
        hour_risk = 0.1
        night_flag = 0.0
        if 2 <= hour <= 5:
            hour_risk = 0.85
            night_flag = 1.0
            triggered_rules.append(f"Transação em horário crítico da madrugada ({hour:02d}:00h)")
        elif 0 <= hour < 2 or 5 < hour <= 6:
            hour_risk = 0.45
            night_flag = 1.0

        # 6. Risco de Canal
        channel_risk = 0.1
        if tx.channel == PaymentChannel.ECOMMERCE and tx.amount > 1500:
            channel_risk = 0.5
        elif tx.channel == PaymentChannel.PIX and night_flag == 1.0:
            channel_risk = 0.75
            triggered_rules.append("Pix de alto valor em horário noturno")

        # 7. Normalização para o vetor de entrada ML (8 dimensões)
        amount_norm = min(tx.amount / 5000.0, 1.0)
        
        vector = FeatureVector(
            amount_zscore=min(max(z_score / 5.0, -1.0), 2.0),
            velocity_1h=min(velocity_1h / 10.0, 1.0),
            geo_distance_km=min(geo_dist / 1000.0, 1.0),
            merchant_risk=mcc_risk,
            hour_pattern_risk=hour_risk,
            channel_risk=channel_risk,
            amount_normalized=amount_norm,
            night_trans_flag=night_flag
        )

        return vector, triggered_rules
