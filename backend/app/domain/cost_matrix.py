from typing import Dict, List, Tuple

def compute_loss(cost_fp: float, cost_fn: float, fp: int, fn: int) -> float:
    return (cost_fp * fp) + (cost_fn * fn)

def find_optimal_threshold(
    pr_curve_data: List[Dict[str, float]],
    cost_fp: float,
    cost_fn: float,
    total_fraud: int = 2404,
    total_legitimate: int = 485596,
) -> Tuple[float, float, Dict[str, float]]:
    best_threshold = 0.50
    min_loss = float("inf")
    best_metrics = {}

    for point in pr_curve_data:
        thresh = point["threshold"]
        recall = point["recall"] / 100.0
        precision = point["precision"] / 100.0

        frauds_caught = int(total_fraud * recall)
        fn = total_fraud - frauds_caught
        
        # Derivação de FP a partir da precisão: Precision = TP / (TP + FP) -> FP = TP*(1-Prec)/Prec
        if precision > 0:
            fp = int(frauds_caught * (1.0 - precision) / precision)
        else:
            fp = int(total_legitimate * 0.1)

        total_loss = compute_loss(cost_fp, cost_fn, fp, fn)
        if total_loss < min_loss:
            min_loss = total_loss
            best_threshold = thresh
            best_metrics = {
                "threshold": thresh,
                "precision": point["precision"],
                "recall": point["recall"],
                "f1": point.get("f1", 0.0),
                "fp": fp,
                "fn": fn,
                "min_loss": total_loss,
            }

    return best_threshold, min_loss, best_metrics
