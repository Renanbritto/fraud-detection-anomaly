import time
from collections import deque
from typing import List
from fastapi import APIRouter, HTTPException, Query, status
from app.domain.entities import (
    BatchScoreRequest,
    BatchScoreResponse,
    DecisionType,
    TransactionInput,
    TransactionScoreResponse,
)
from app.ml.ensemble import ensemble_engine

router = APIRouter()

# Ring buffer em memória para armazenar as últimas 100 transações analisadas (auditoria/feed)
_RECENT_TRANSACTIONS = deque(maxlen=100)

@router.post(
    "/score",
    response_model=TransactionScoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Avaliar transação unitária em tempo real (< 25ms)"
)
async def score_transaction(
    transaction: TransactionInput,
    threshold: float = Query(None, ge=0.10, le=0.95, description="Threshold customizado opcional")
):
    try:
        result = ensemble_engine.evaluate_transaction(transaction, custom_threshold=threshold)
        _RECENT_TRANSACTIONS.appendleft(result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno de inferência: {str(e)}")

@router.post(
    "/batch",
    response_model=BatchScoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Avaliar lote de transações (processamento em batch)"
)
async def score_batch_transactions(batch: BatchScoreRequest):
    start = time.perf_counter()
    results: List[TransactionScoreResponse] = []
    
    approved = 0
    reviewed = 0
    blocked = 0
    prevented_amount = 0.0

    for tx in batch.transactions:
        res = ensemble_engine.evaluate_transaction(tx)
        results.append(res)
        _RECENT_TRANSACTIONS.appendleft(res)
        
        if res.decision == DecisionType.APPROVE:
            approved += 1
        elif res.decision == DecisionType.REVIEW:
            reviewed += 1
        elif res.decision == DecisionType.BLOCK:
            blocked += 1
            prevented_amount += tx.amount

    elapsed = round((time.perf_counter() - start) * 1000.0, 2)

    return BatchScoreResponse(
        total_processed=len(batch.transactions),
        approved_count=approved,
        reviewed_count=reviewed,
        blocked_count=blocked,
        total_prevented_fraud_amount=round(prevented_amount, 2),
        results=results,
        processing_time_ms=elapsed
    )

@router.get(
    "/recent",
    response_model=List[TransactionScoreResponse],
    summary="Histórico recente de transações escoradas (Live Feed)"
)
async def get_recent_transactions(limit: int = Query(25, ge=1, le=100)):
    return list(_RECENT_TRANSACTIONS)[:limit]
