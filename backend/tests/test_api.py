from fastapi.testclient import TestClient

def test_health_check(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "models" in data
    assert "isolation_forest" in data["models"]

def test_score_legitimate_transaction(client: TestClient, sample_legitimate_tx):
    payload = sample_legitimate_tx.model_dump(mode="json")
    response = client.post("/api/v1/transactions/score", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["transaction_id"] == "tx_legit_001"
    assert data["decision"] in ["APPROVE", "REVIEW"]
    assert data["ensemble_score"] < 0.65
    assert data["latency_ms"] > 0

def test_score_fraudulent_transaction(client: TestClient, sample_fraudulent_tx):
    payload = sample_fraudulent_tx.model_dump(mode="json")
    response = client.post("/api/v1/transactions/score", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["transaction_id"] == "tx_fraud_999"
    assert data["decision"] == "BLOCK"
    assert data["risk_level"] in ["HIGH", "CRITICAL"]
    assert data["ensemble_score"] >= 0.65
    assert len(data["triggered_rules"]) >= 2

def test_batch_scoring(client: TestClient, sample_legitimate_tx, sample_fraudulent_tx):
    payload = {
        "transactions": [
            sample_legitimate_tx.model_dump(mode="json"),
            sample_fraudulent_tx.model_dump(mode="json")
        ]
    }
    response = client.post("/api/v1/transactions/batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["total_processed"] == 2
    assert data["approved_count"] >= 1
    assert data["blocked_count"] >= 1
    assert data["total_prevented_fraud_amount"] > 0

def test_pr_curve_metrics(client: TestClient):
    response = client.get("/api/v1/metrics/pr-curve")
    assert response.status_code == 200
    data = response.json()
    assert data["pr_auc"] == 0.847
    assert len(data["curve_points"]) > 5

def test_simulation_cost_endpoint(client: TestClient):
    payload = {
        "cost_fp": 15.0,
        "cost_fn": 3500.0,
        "threshold": 0.65,
        "monthly_transactions": 488000
    }
    response = client.post("/api/v1/metrics/simulation", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["money_saved_brl"] > 5000000
    assert data["roi_ratio"] > 100
