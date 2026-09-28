import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.domain.entities import PaymentChannel, TransactionInput

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def sample_legitimate_tx() -> TransactionInput:
    return TransactionInput(
        transaction_id="tx_legit_001",
        user_id="usr_501",
        card_id="crd_7712",
        amount=85.50,
        merchant_mcc="5411", # Supermercados
        merchant_risk_score=0.08,
        latitude=-23.5505,
        longitude=-46.6333,
        channel=PaymentChannel.POS,
        user_historical_mean=92.0,
        user_historical_std=30.0,
        last_tx_latitude=-23.5510,
        last_tx_longitude=-46.6340,
        last_tx_timestamp=datetime(2026, 9, 28, 14, 0, tzinfo=timezone.utc),
        timestamp=datetime(2026, 9, 28, 15, 30, tzinfo=timezone.utc)
    )

@pytest.fixture
def sample_fraudulent_tx() -> TransactionInput:
    return TransactionInput(
        transaction_id="tx_fraud_999",
        user_id="usr_890",
        card_id="crd_3341",
        amount=4890.00, # Valor desproporcional
        merchant_mcc="5732", # Eletrônicos
        merchant_risk_score=0.88,
        latitude=-3.7172, # Fortaleza (distante de SP)
        longitude=-38.5433,
        channel=PaymentChannel.ECOMMERCE,
        user_historical_mean=110.0,
        user_historical_std=35.0,
        last_tx_latitude=-23.5505, # São Paulo 20 min atrás
        last_tx_longitude=-46.6333,
        last_tx_timestamp=datetime(2026, 9, 28, 3, 10, tzinfo=timezone.utc),
        timestamp=datetime(2026, 9, 28, 3, 30, tzinfo=timezone.utc) # Madrugada
    )
