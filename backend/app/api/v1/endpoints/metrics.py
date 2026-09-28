from typing import Dict, List
from fastapi import APIRouter
from app.domain.entities import SimulationRequest, SimulationResponse

router = APIRouter()

# Dados pré-computados do benchmark de 488.000 transações (0.49% fraude = 2.404 fraudes)
BENCHMARK_PR_CURVE = [
    {"threshold": 0.30, "precision": 2.8, "recall": 99.8, "f1": 5.4, "fpr": 15.2, "frauds_caught": 2400, "blocked_legit": 83400},
    {"threshold": 0.40, "precision": 5.1, "recall": 99.4, "f1": 9.7, "fpr": 8.4, "frauds_caught": 2389, "blocked_legit": 44500},
    {"threshold": 0.50, "precision": 14.3, "recall": 98.7, "f1": 25.0, "fpr": 2.5, "frauds_caught": 2372, "blocked_legit": 14200},
    {"threshold": 0.55, "precision": 22.8, "recall": 97.2, "f1": 36.9, "fpr": 1.4, "frauds_caught": 2336, "blocked_legit": 7900},
    {"threshold": 0.60, "precision": 38.5, "recall": 95.5, "f1": 54.9, "fpr": 0.65, "frauds_caught": 2296, "blocked_legit": 3660},
    {"threshold": 0.65, "precision": 56.2, "recall": 91.8, "f1": 69.7, "fpr": 0.30, "frauds_caught": 2207, "blocked_legit": 1720}, # Ponto Ótimo de Custo
    {"threshold": 0.70, "precision": 66.8, "recall": 83.5, "f1": 74.2, "fpr": 0.12, "frauds_caught": 2007, "blocked_legit": 998},
    {"threshold": 0.75, "precision": 78.4, "recall": 67.2, "f1": 72.4, "fpr": 0.05, "frauds_caught": 1615, "blocked_legit": 445},
    {"threshold": 0.80, "precision": 90.2, "recall": 44.1, "f1": 59.2, "fpr": 0.02, "frauds_caught": 1060, "blocked_legit": 115},
    {"threshold": 0.85, "precision": 94.1, "recall": 26.5, "f1": 41.3, "fpr": 0.008, "frauds_caught": 637, "blocked_legit": 40},
    {"threshold": 0.90, "precision": 95.5, "recall": 12.4, "f1": 21.9, "fpr": 0.003, "frauds_caught": 298, "blocked_legit": 14},
]

FEATURE_IMPORTANCES = [
    {"feature": "Z-Score do Valor (90d)", "if_importance": 21.8, "ae_weight": 19.5, "category": "valor"},
    {"feature": "Velocidade Transacional (1h)", "if_importance": 18.7, "ae_weight": 17.2, "category": "temporal"},
    {"feature": "Distância Geográfica (km)", "if_importance": 16.4, "ae_weight": 15.8, "category": "comportamental"},
    {"feature": "Score de Risco do Merchant (MCC)", "if_importance": 14.2, "ae_weight": 14.8, "category": "rede"},
    {"feature": "Desvio do Padrão Horário", "if_importance": 10.8, "ae_weight": 12.1, "category": "temporal"},
    {"feature": "Inconsistência de Canal (E-comm/Pix)", "if_importance": 9.4, "ae_weight": 10.8, "category": "comportamental"},
    {"feature": "País / Região Incomum", "if_importance": 5.2, "ae_weight": 6.2, "category": "rede"},
    {"feature": "Device Fingerprint Mascarado", "if_importance": 3.5, "ae_weight": 3.6, "category": "rede"},
]

@router.get("/pr-curve", summary="Curva Precision-Recall completa do Benchmark 488K")
async def get_pr_curve():
    return {
        "pr_auc": 0.847,
        "roc_auc_misleading": 0.984,
        "total_transactions": 488000,
        "fraud_rate_pct": 0.49,
        "total_frauds": 2404,
        "optimal_threshold": 0.65,
        "curve_points": BENCHMARK_PR_CURVE
    }

@router.get("/features", summary="Ranking de Relevância de Features (IF vs AE)")
async def get_feature_importances():
    return {
        "total_features": len(FEATURE_IMPORTANCES),
        "features": FEATURE_IMPORTANCES
    }

@router.post("/simulation", response_model=SimulationResponse, summary="Simulador What-If de Custos Assimétricos")
async def simulate_costs(payload: SimulationRequest):
    # Encontra o ponto mais próximo na curva
    closest = min(BENCHMARK_PR_CURVE, key=lambda p: abs(p["threshold"] - payload.threshold))
    
    scale_factor = payload.monthly_transactions / 488000.0
    frauds_in_volume = int(2404 * scale_factor)
    
    frauds_caught = int(closest["frauds_caught"] * scale_factor)
    frauds_missed = max(0, frauds_in_volume - frauds_caught)
    
    false_positives = int(closest["blocked_legit"] * scale_factor)
    
    op_cost = false_positives * payload.cost_fp
    fraud_loss = frauds_missed * payload.cost_fn
    total_loss = op_cost + fraud_loss
    
    # Prejuízo que teria ocorrido sem modelo: todas as fraudes passariam
    baseline_loss = frauds_in_volume * payload.cost_fn
    money_saved = max(0.0, baseline_loss - total_loss)
    
    roi_ratio = round(money_saved / max(op_cost, 1.0), 1)

    return SimulationResponse(
        cost_fp=payload.cost_fp,
        cost_fn=payload.cost_fn,
        threshold=payload.threshold,
        precision_pct=closest["precision"],
        recall_pct=closest["recall"],
        f1_pct=closest["f1"],
        false_positives=false_positives,
        false_negatives=frauds_missed,
        frauds_caught=frauds_caught,
        frauds_missed=frauds_missed,
        total_operational_cost=round(op_cost, 2),
        total_fraud_loss=round(fraud_loss, 2),
        total_loss=round(total_loss, 2),
        money_saved_brl=round(money_saved, 2),
        roi_ratio=roi_ratio
    )
