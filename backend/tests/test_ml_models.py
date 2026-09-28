from app.domain.entities import FeatureVector, PaymentChannel, TransactionInput
from app.ml.autoencoder_model import AutoencoderAnomalyDetector
from app.ml.feature_engineering import FeatureEngine, haversine_distance
from app.ml.isolation_forest_model import IsolationForestAnomalyDetector

def test_haversine_distance():
    # São Paulo -> Rio de Janeiro (~360 km)
    dist = haversine_distance(-23.5505, -46.6333, -22.9068, -43.1729)
    assert 350 <= dist <= 380

def test_feature_engineering_zscore():
    engine = FeatureEngine()
    tx = TransactionInput(
        transaction_id="tx_1",
        user_id="u1",
        card_id="c1",
        amount=1000.0,
        merchant_mcc="5411",
        latitude=0.0,
        longitude=0.0,
        user_historical_mean=100.0,
        user_historical_std=50.0
    )
    vector, rules = engine.extract_features(tx)
    # Z = (1000 - 100)/50 = 18 -> alert triggered
    assert any("Z-Score" in r for r in rules)

def test_autoencoder_reconstruction_error():
    ae = AutoencoderAnomalyDetector(input_dim=8, latent_dim=4)
    normal_feat = FeatureVector(
        amount_zscore=0.1,
        velocity_1h=0.1,
        geo_distance_km=0.01,
        merchant_risk=0.1,
        hour_pattern_risk=0.1,
        channel_risk=0.1,
        amount_normalized=0.1,
        night_trans_flag=0.0
    )
    anomalous_feat = FeatureVector(
        amount_zscore=2.0,
        velocity_1h=1.0,
        geo_distance_km=1.0,
        merchant_risk=0.9,
        hour_pattern_risk=0.85,
        channel_risk=0.75,
        amount_normalized=0.95,
        night_trans_flag=1.0
    )
    mse_norm, score_norm = ae.compute_reconstruction_error(normal_feat)
    mse_anom, score_anom = ae.compute_reconstruction_error(anomalous_feat)
    
    assert mse_anom > mse_norm
    assert score_anom > score_norm

def test_isolation_forest_scoring():
    detector = IsolationForestAnomalyDetector(n_estimators=100)
    anomalous_feat = FeatureVector(
        amount_zscore=2.0,
        velocity_1h=1.0,
        geo_distance_km=1.0,
        merchant_risk=0.9,
        hour_pattern_risk=0.85,
        channel_risk=0.75,
        amount_normalized=0.95,
        night_trans_flag=1.0
    )
    score = detector.compute_anomaly_score(anomalous_feat)
    assert 0.0 <= score <= 1.0
