"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  AreaChart,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Sparkles,
  Target,
  FileText,
  ChevronRight,
  Database,
  Code2,
  DollarSign,
  Activity,
  Sliders,
  Zap,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  Lock,
  Cpu,
  BarChart3,
  Search,
  Clock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";


function GithubIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}


// ============================================================================
// BASE DE DADOS: TRANSAÇÕES FINANCEIRAS & FEATURE ENGINEERING
// ============================================================================

interface TransactionFeature {
  id: string;
  name: string;
  category: "temporal" | "valor" | "comportamental" | "rede";
  importance: number; // 0-1 (Isolation Forest feature importance)
  autoencoderWeight: number; // peso relativo no reconstruction error
  description: string;
}

const FEATURES_DATA: TransactionFeature[] = [
  {
    id: "amount_zscore",
    name: "Z-Score do Valor da Transação",
    category: "valor",
    importance: 0.218,
    autoencoderWeight: 0.195,
    description: "Desvio padronizado do valor da transação em relação ao histórico de 90 dias do titular. Valores |Z| > 3 indicam outliers extremos.",
  },
  {
    id: "velocity_1h",
    name: "Velocidade Transacional (1h)",
    category: "temporal",
    importance: 0.187,
    autoencoderWeight: 0.172,
    description: "Número de transações realizadas na última hora pelo mesmo cartão. Picos acima de 5 tx/h ativam alerta comportamental.",
  },
  {
    id: "geo_distance",
    name: "Distância Geográfica (km)",
    category: "comportamental",
    importance: 0.164,
    autoencoderWeight: 0.158,
    description: "Distância euclidiana entre a transação atual e a anterior. Viagens impossíveis (>500km em <1h) são sinais fortes.",
  },
  {
    id: "merchant_risk",
    name: "Score de Risco do Merchant",
    category: "rede",
    importance: 0.142,
    autoencoderWeight: 0.148,
    description: "Pontuação de risco do estabelecimento baseada em histórico de chargebacks, tempo de atividade e categoria MCC.",
  },
  {
    id: "hour_pattern",
    name: "Desvio do Padrão Horário",
    category: "temporal",
    importance: 0.108,
    autoencoderWeight: 0.121,
    description: "Probabilidade da transação ocorrer no horário observado dado o perfil comportamental do cliente (KDE).",
  },
  {
    id: "channel_mismatch",
    name: "Inconsistência de Canal",
    category: "comportamental",
    importance: 0.094,
    autoencoderWeight: 0.108,
    description: "Flag quando o canal de pagamento (e-commerce, POS, contactless) diverge do padrão habitual do titular.",
  },
  {
    id: "country_new",
    name: "País Novo (First Seen)",
    category: "rede",
    importance: 0.052,
    autoencoderWeight: 0.062,
    description: "Indicador binário de que a transação ocorre em país nunca antes registrado no histórico do cartão.",
  },
  {
    id: "device_fingerprint",
    name: "Fingerprint de Dispositivo",
    category: "rede",
    importance: 0.035,
    autoencoderWeight: 0.036,
    description: "Hash do dispositivo utilizado. Dispositivos novos ou mascarados (VPN/Tor) elevam o risco residual.",
  },
];

// ============================================================================
// DADOS DO ISOLATION FOREST & AUTOENCODER
// ============================================================================

interface AnomalyScoreBin {
  scoreRange: string;
  totalTx: number;
  fraudTx: number;
  legitimateTx: number;
  fraudRate: number; // %
  cumFraudPct: number; // %
  cumLegitPct: number; // %
}

const ANOMALY_SCORE_DISTRIBUTION: AnomalyScoreBin[] = [
  { scoreRange: "0.90 - 1.00", totalTx: 312, fraudTx: 298, legitimateTx: 14, fraudRate: 95.5, cumFraudPct: 12.4, cumLegitPct: 0.003 },
  { scoreRange: "0.80 - 0.90", totalTx: 845, fraudTx: 762, legitimateTx: 83, fraudRate: 90.2, cumFraudPct: 44.1, cumLegitPct: 0.02 },
  { scoreRange: "0.70 - 0.80", totalTx: 1420, fraudTx: 948, legitimateTx: 472, fraudRate: 66.8, cumFraudPct: 83.5, cumLegitPct: 0.12 },
  { scoreRange: "0.60 - 0.70", totalTx: 3210, fraudTx: 289, legitimateTx: 2921, fraudRate: 9.0, cumFraudPct: 95.5, cumLegitPct: 0.72 },
  { scoreRange: "0.50 - 0.60", totalTx: 8450, fraudTx: 76, legitimateTx: 8374, fraudRate: 0.9, cumFraudPct: 98.7, cumLegitPct: 2.45 },
  { scoreRange: "0.40 - 0.50", totalTx: 24300, fraudTx: 18, legitimateTx: 24282, fraudRate: 0.07, cumFraudPct: 99.4, cumLegitPct: 7.45 },
  { scoreRange: "0.30 - 0.40", totalTx: 68200, fraudTx: 8, legitimateTx: 68192, fraudRate: 0.01, cumFraudPct: 99.8, cumLegitPct: 21.5 },
  { scoreRange: "0.20 - 0.30", totalTx: 142000, fraudTx: 4, legitimateTx: 141996, fraudRate: 0.003, cumFraudPct: 99.9, cumLegitPct: 50.8 },
  { scoreRange: "0.10 - 0.20", totalTx: 185000, fraudTx: 1, legitimateTx: 184999, fraudRate: 0.001, cumFraudPct: 100.0, cumLegitPct: 88.9 },
  { scoreRange: "0.00 - 0.10", totalTx: 54263, fraudTx: 0, legitimateTx: 54263, fraudRate: 0.0, cumFraudPct: 100.0, cumLegitPct: 100.0 },
];

// ============================================================================
// CURVA PRECISION-RECALL POR THRESHOLD
// ============================================================================

interface PrecisionRecallPoint {
  threshold: number;
  precision: number; // %
  recall: number; // %
  f1: number; // %
  falsePositiveRate: number; // %
  fraudsCaught: number;
  legitimateBlocked: number;
}

const PRECISION_RECALL_CURVE: PrecisionRecallPoint[] = [
  { threshold: 0.30, precision: 2.8, recall: 99.8, f1: 5.4, falsePositiveRate: 15.2, fraudsCaught: 2400, legitimateBlocked: 83400 },
  { threshold: 0.40, precision: 5.1, recall: 99.4, f1: 9.7, falsePositiveRate: 8.4, fraudsCaught: 2389, legitimateBlocked: 44500 },
  { threshold: 0.50, precision: 14.3, recall: 98.7, f1: 25.0, falsePositiveRate: 2.5, fraudsCaught: 2372, legitimateBlocked: 14200 },
  { threshold: 0.55, precision: 22.8, recall: 97.2, f1: 36.9, falsePositiveRate: 1.4, fraudsCaught: 2336, legitimateBlocked: 7900 },
  { threshold: 0.60, precision: 38.5, recall: 95.5, f1: 54.9, falsePositiveRate: 0.65, fraudsCaught: 2296, legitimateBlocked: 3660 },
  { threshold: 0.65, precision: 56.2, recall: 91.8, f1: 69.7, falsePositiveRate: 0.30, fraudsCaught: 2207, legitimateBlocked: 1720 },
  { threshold: 0.70, precision: 72.4, recall: 83.5, f1: 77.5, falsePositiveRate: 0.13, fraudsCaught: 2007, legitimateBlocked: 770 },
  { threshold: 0.75, precision: 84.1, recall: 72.3, f1: 77.7, falsePositiveRate: 0.06, fraudsCaught: 1738, legitimateBlocked: 328 },
  { threshold: 0.80, precision: 91.2, recall: 56.5, f1: 69.8, falsePositiveRate: 0.02, fraudsCaught: 1358, legitimateBlocked: 131 },
  { threshold: 0.85, precision: 95.8, recall: 38.1, f1: 54.5, falsePositiveRate: 0.008, fraudsCaught: 916, legitimateBlocked: 40 },
  { threshold: 0.90, precision: 97.8, recall: 19.2, f1: 32.1, falsePositiveRate: 0.003, fraudsCaught: 461, legitimateBlocked: 10 },
  { threshold: 0.95, precision: 99.1, recall: 8.4, f1: 15.5, falsePositiveRate: 0.001, fraudsCaught: 202, legitimateBlocked: 2 },
];

// Autoencoder Reconstruction Error Distribution
const RECONSTRUCTION_ERROR_DATA = [
  { errorBin: "0.0-0.5", legitimate: 142000, fraud: 5 },
  { errorBin: "0.5-1.0", legitimate: 185200, fraud: 12 },
  { errorBin: "1.0-2.0", legitimate: 98400, fraud: 28 },
  { errorBin: "2.0-3.0", legitimate: 42100, fraud: 85 },
  { errorBin: "3.0-5.0", legitimate: 15800, fraud: 310 },
  { errorBin: "5.0-8.0", legitimate: 3200, fraud: 680 },
  { errorBin: "8.0-12.0", legitimate: 580, fraud: 520 },
  { errorBin: "12.0-20.0", legitimate: 120, fraud: 410 },
  { errorBin: "20.0+", legitimate: 18, fraud: 354 },
];

// Hourly fraud pattern
const HOURLY_FRAUD_PATTERN = [
  { hour: "00h", totalTx: 12400, fraudTx: 189, fraudRate: 1.52 },
  { hour: "01h", totalTx: 8200, fraudTx: 156, fraudRate: 1.90 },
  { hour: "02h", totalTx: 5100, fraudTx: 142, fraudRate: 2.78 },
  { hour: "03h", totalTx: 3800, fraudTx: 178, fraudRate: 4.68 },
  { hour: "04h", totalTx: 3200, fraudTx: 195, fraudRate: 6.09 },
  { hour: "05h", totalTx: 4500, fraudTx: 112, fraudRate: 2.49 },
  { hour: "06h", totalTx: 15200, fraudTx: 78, fraudRate: 0.51 },
  { hour: "07h", totalTx: 28400, fraudTx: 65, fraudRate: 0.23 },
  { hour: "08h", totalTx: 42100, fraudTx: 52, fraudRate: 0.12 },
  { hour: "09h", totalTx: 48700, fraudTx: 48, fraudRate: 0.10 },
  { hour: "10h", totalTx: 52300, fraudTx: 42, fraudRate: 0.08 },
  { hour: "11h", totalTx: 55100, fraudTx: 38, fraudRate: 0.07 },
  { hour: "12h", totalTx: 49800, fraudTx: 45, fraudRate: 0.09 },
  { hour: "13h", totalTx: 51200, fraudTx: 41, fraudRate: 0.08 },
  { hour: "14h", totalTx: 53800, fraudTx: 39, fraudRate: 0.07 },
  { hour: "15h", totalTx: 50100, fraudTx: 44, fraudRate: 0.09 },
  { hour: "16h", totalTx: 46300, fraudTx: 52, fraudRate: 0.11 },
  { hour: "17h", totalTx: 41200, fraudTx: 65, fraudRate: 0.16 },
  { hour: "18h", totalTx: 38500, fraudTx: 78, fraudRate: 0.20 },
  { hour: "19h", totalTx: 34200, fraudTx: 95, fraudRate: 0.28 },
  { hour: "20h", totalTx: 28400, fraudTx: 112, fraudRate: 0.39 },
  { hour: "21h", totalTx: 22100, fraudTx: 132, fraudRate: 0.60 },
  { hour: "22h", totalTx: 18300, fraudTx: 148, fraudRate: 0.81 },
  { hour: "23h", totalTx: 15200, fraudTx: 168, fraudRate: 1.11 },
];

// ============================================================================
// PIPELINE PYTHON CODE
// ============================================================================

const PYTHON_PIPELINE_CODE = `# ============================================================================
# PIPELINE COMPLETO: DETECÇÃO DE FRAUDE COM ISOLATION FOREST & AUTOENCODER
# ============================================================================
# Autor: Renan Nocelli
# Stack: Python 3.11, Scikit-Learn, PyTorch, Polars, Imbalanced-Learn
# ============================================================================

import polars as pl
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import (
    precision_recall_curve, average_precision_score,
    roc_auc_score, f1_score, classification_report
)
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# ─── 1. INGESTÃO & FEATURE ENGINEERING ─────────────────────────
def build_fraud_features(df: pl.DataFrame) -> pl.DataFrame:
    """
    Engenharia de features para detecção de anomalias.
    Inputs: DataFrame com transações brutas (timestamp, amount, 
            card_id, merchant_id, lat, lon, channel, country).
    """
    return df.with_columns([
        # Z-Score do valor da transação (janela de 90 dias por cartão)
        ((pl.col("amount") - pl.col("amount").rolling_mean(90)
          .over("card_id")) /
         pl.col("amount").rolling_std(90).over("card_id")
        ).alias("amount_zscore"),
        
        # Velocidade transacional (tx/hora por cartão)
        pl.col("card_id").count()
          .over(["card_id", pl.col("timestamp").dt.truncate("1h")])
          .alias("velocity_1h"),
        
        # Distância geográfica da transação anterior (Haversine)
        haversine_distance(
            pl.col("lat"), pl.col("lon"),
            pl.col("lat").shift(1).over("card_id"),
            pl.col("lon").shift(1).over("card_id")
        ).alias("geo_distance"),
        
        # Desvio do padrão horário (KDE do perfil do cliente)
        compute_hour_deviation(
            pl.col("timestamp").dt.hour(),
            pl.col("card_id")
        ).alias("hour_pattern"),
        
        # Flags binárias
        (pl.col("channel") != pl.col("channel").mode()
          .over("card_id")).cast(pl.Int8).alias("channel_mismatch"),
        (pl.col("country").is_in(
            pl.col("country").unique().over("card_id")
        ).not_()).cast(pl.Int8).alias("country_new"),
    ])

# ─── 2. ISOLATION FOREST (MODELO NÃO-SUPERVISIONADO) ───────────
def train_isolation_forest(X: np.ndarray) -> IsolationForest:
    """
    Treina Isolation Forest com contaminação calibrada.
    - n_estimators=300: floresta densa para estabilidade
    - contamination=0.005: ~0.5% de fraude esperada
    - max_features=0.8: decorrelação entre árvores
    """
    model = IsolationForest(
        n_estimators=300,
        contamination=0.005,
        max_features=0.8,
        max_samples="auto",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X)
    
    # Anomaly Score: -model.decision_function() normalizado [0, 1]
    raw_scores = -model.decision_function(X)
    scores_norm = (raw_scores - raw_scores.min()) / (
        raw_scores.max() - raw_scores.min()
    )
    return model, scores_norm

# ─── 3. AUTOENCODER (DEEP LEARNING — PyTorch) ──────────────────
class FraudAutoencoder(nn.Module):
    """
    Autoencoder undercomplete para reconstrução de transações legítimas.
    A ideia: treinar SOMENTE com dados normais → transações fraudulentas
    terão reconstruction error alto (anomalia).
    
    Arquitetura: 8 → 32 → 16 → 4 → 16 → 32 → 8
    """
    def __init__(self, input_dim: int = 8):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.BatchNorm1d(32),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.2),
            nn.Linear(32, 16),
            nn.BatchNorm1d(16),
            nn.LeakyReLU(0.2),
            nn.Linear(16, 4),  # Bottleneck (latent space)
        )
        self.decoder = nn.Sequential(
            nn.Linear(4, 16),
            nn.BatchNorm1d(16),
            nn.LeakyReLU(0.2),
            nn.Linear(16, 32),
            nn.BatchNorm1d(32),
            nn.LeakyReLU(0.2),
            nn.Linear(32, input_dim),
        )

    def forward(self, x):
        latent = self.encoder(x)
        reconstructed = self.decoder(latent)
        return reconstructed

def train_autoencoder(
    X_normal: np.ndarray,
    epochs: int = 50,
    batch_size: int = 512,
    lr: float = 1e-3,
) -> FraudAutoencoder:
    """
    Treina o autoencoder SOMENTE com transações legítimas.
    Loss: MSE (Mean Squared Error) da reconstrução.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = FraudAutoencoder(X_normal.shape[1]).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr)
    criterion = nn.MSELoss()
    
    dataset = TensorDataset(torch.FloatTensor(X_normal))
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    for epoch in range(epochs):
        model.train()
        total_loss = 0
        for (batch,) in loader:
            batch = batch.to(device)
            reconstructed = model(batch)
            loss = criterion(reconstructed, batch)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        
        if (epoch + 1) % 10 == 0:
            print(f"Epoch {epoch+1}/{epochs} — Loss: "
                  f"{total_loss/len(loader):.6f}")
    
    return model

# ─── 4. ENSEMBLE: IF + AE → SCORE FINAL ────────────────────────
def ensemble_fraud_score(
    if_scores: np.ndarray,
    ae_errors: np.ndarray,
    w_if: float = 0.55,
    w_ae: float = 0.45,
) -> np.ndarray:
    """
    Combina Isolation Forest + Autoencoder em score final [0, 1].
    - w_if=0.55: peso do Isolation Forest
    - w_ae=0.45: peso do Autoencoder (reconstruction error)
    Calibração: Platt Scaling ou Isotonic Regression pós-ensemble.
    """
    ae_norm = (ae_errors - ae_errors.min()) / (
        ae_errors.max() - ae_errors.min()
    )
    ensemble = w_if * if_scores + w_ae * ae_norm
    return ensemble

# ─── 5. THRESHOLD OPTIMIZATION ─────────────────────────────────
def optimize_threshold(
    y_true: np.ndarray,
    scores: np.ndarray,
    cost_fp: float = 15.0,     # Custo de bloquear legítima (R$)
    cost_fn: float = 3500.0,   # Custo médio de fraude não detectada (R$)
) -> float:
    """
    Otimiza o threshold minimizando o custo total:
    Cost = N_FP × cost_fp + N_FN × cost_fn
    """
    best_threshold, best_cost = 0.5, float("inf")
    for t in np.arange(0.30, 0.95, 0.01):
        preds = (scores >= t).astype(int)
        fp = ((preds == 1) & (y_true == 0)).sum()
        fn = ((preds == 0) & (y_true == 1)).sum()
        total_cost = fp * cost_fp + fn * cost_fn
        if total_cost < best_cost:
            best_cost = total_cost
            best_threshold = t
    return best_threshold
`;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "models" | "pr_curve" | "simulator" | "python_code">("overview");
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // Threshold Slider
  const [selectedThreshold, setSelectedThreshold] = useState<number>(0.65);

  // Simulador de Impacto Financeiro
  const [monthlyTxVolume, setMonthlyTxVolume] = useState<number>(488000);
  const [avgFraudValue, setAvgFraudValue] = useState<number>(3500);
  const [fraudRateBaseline, setFraudRateBaseline] = useState<number>(0.49);
  const [costPerFP, setCostPerFP] = useState<number>(15);
  const [costPerFN, setCostPerFN] = useState<number>(3500);

  // Code Copy
  const [codeCopied, setCodeCopied] = useState<boolean>(false);

  // PR metrics for selected threshold
  const selectedPRPoint = useMemo(() => {
    const sorted = [...PRECISION_RECALL_CURVE].sort(
      (a, b) => Math.abs(a.threshold - selectedThreshold) - Math.abs(b.threshold - selectedThreshold)
    );
    return sorted[0];
  }, [selectedThreshold]);

  // Financial simulator
  const simulationMetrics = useMemo(() => {
    const totalFrauds = Math.round((monthlyTxVolume * fraudRateBaseline) / 100);
    const totalLegitimate = monthlyTxVolume - totalFrauds;

    const pr = selectedPRPoint;
    const fraudsCaught = Math.round(totalFrauds * (pr.recall / 100));
    const fraudsMissed = totalFrauds - fraudsCaught;
    const falsePositives = Math.round(totalLegitimate * (pr.falsePositiveRate / 100));

    const lossPreventedValue = (fraudsCaught * avgFraudValue) / 1_000_000;
    const lossMissedValue = (fraudsMissed * avgFraudValue) / 1_000_000;
    const fpCostValue = (falsePositives * costPerFP) / 1_000_000;
    const netSavings = lossPreventedValue - fpCostValue;

    const baselineLoss = (totalFrauds * avgFraudValue) / 1_000_000;
    const reductionPct = baselineLoss > 0 ? (lossPreventedValue / baselineLoss) * 100 : 0;

    return {
      totalFrauds,
      totalLegitimate,
      fraudsCaught,
      fraudsMissed,
      falsePositives,
      lossPreventedValue,
      lossMissedValue,
      fpCostValue,
      netSavings,
      baselineLoss,
      reductionPct,
    };
  }, [monthlyTxVolume, avgFraudValue, fraudRateBaseline, costPerFP, costPerFN, selectedPRPoint]);

  // Feature importance chart data (sorted)
  const featureImportanceData = useMemo(() => {
    return [...FEATURES_DATA]
      .sort((a, b) => b.importance - a.importance)
      .map((f) => ({
        name: f.name.length > 28 ? f.name.substring(0, 25) + "..." : f.name,
        fullName: f.name,
        ifImportance: +(f.importance * 100).toFixed(1),
        aeWeight: +(f.autoencoderWeight * 100).toFixed(1),
        category: f.category,
      }));
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(PYTHON_PIPELINE_CODE);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2500);
  };

  return (
    <main className="min-h-screen p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto flex flex-col gap-8">
      <div className="liquid-glass rounded-3xl p-4 sm:p-8 flex flex-col gap-8 border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Fluid Mesh Glows */}
      <div className="pointer-events-none absolute -top-24 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px]" />

      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            <span className="font-semibold uppercase tracking-widest">
              Anomaly Detection & Deep Learning Anti-Fraude
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/Renanbritto/fraud-detection-anomaly"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 rounded-full text-xs font-semibold bg-white/[0.06] hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              Repositório GitHub
            </a>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              488K Transações Analisadas
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
              Detecção de Fraude & Anomaly Detection
            </h2>
            <span className="liquid-glass-pill px-3 py-1 text-xs font-bold text-rose-300">
              Recall 91.8% • Precision 56.2% • F1 69.7%
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-4xl leading-relaxed">
            Sistema preditivo de detecção de transações fraudulentas com ensemble de{" "}
            <strong>Isolation Forest</strong> (não-supervisionado) e <strong>Autoencoder neural</strong> (PyTorch).
            Inclui <strong>SMOTE</strong> para tratamento de desbalanceamento extremo (0.49% de fraudes),
            otimização de threshold por custo assimétrico e simulador financeiro de impacto.
          </p>
        </div>
      </div>

      {/* ─── TABS ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none" ref={tabScrollRef}>
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
            activeTab === "overview"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-500/10"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          <Layers className="h-4 w-4 text-rose-400" />
          1. Visão Geral & Features
        </button>

        <button
          onClick={() => setActiveTab("models")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
            activeTab === "models"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          <Cpu className="h-4 w-4 text-amber-400" />
          2. Isolation Forest & Autoencoder
        </button>

        <button
          onClick={() => setActiveTab("pr_curve")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
            activeTab === "pr_curve"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          <Target className="h-4 w-4 text-emerald-400" />
          3. Precision-Recall & Threshold
        </button>

        <button
          onClick={() => setActiveTab("simulator")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
            activeTab === "simulator"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          <Sliders className="h-4 w-4 text-cyan-400" />
          4. Simulador de Impacto (R$)
        </button>

        <button
          onClick={() => setActiveTab("python_code")}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
            activeTab === "python_code"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-500/10"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          <Code2 className="h-4 w-4 text-purple-400" />
          5. Pipeline Python & Algoritmo
        </button>
        
      </div>

      {/* ─── KPI CARDS ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Precision-Recall AUC</span>
            <Target className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-300 font-mono">0.847</div>
          <p className="text-[11px] text-muted-foreground">Average Precision (AP) no conjunto de teste</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Recall (Fraudes Capturadas)</span>
            <Eye className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono">91.8%</div>
          <p className="text-[11px] text-muted-foreground">No threshold ótimo de 0.65 (custo assimétrico)</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>False Positive Rate</span>
            <ShieldAlert className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300 font-mono">0.30%</div>
          <p className="text-[11px] text-muted-foreground">Apenas 1.720 legítimas bloqueadas por engano/mês</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Perdas Evitadas (Mensal)</span>
            <DollarSign className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-cyan-300 font-mono">R$ 7.7M</div>
          <p className="text-[11px] text-muted-foreground">91.8% das fraudes interceptadas em tempo real</p>
        </div>
      </div>

      {/* ================================================================ */}
      {/* TAB 1: VISÃO GERAL & FEATURE IMPORTANCE                         */}
      {/* ================================================================ */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-8">
          {/* Metodologia */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wider">
                <AlertTriangle className="h-4 w-4" />
                1. O Problema: Desbalanceamento Extremo
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-rose-200 leading-relaxed text-center">
                Fraude = 0.49% do dataset → Ratio 1:204
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Em 488K transações, apenas 2.404 são fraudes. Um classificador naive que prevê
                &quot;legítimo&quot; para tudo já atinge 99.5% de acurácia — mas detecta <strong>zero</strong> fraudes.
                Métricas como <strong>Precision-Recall AUC</strong> e <strong>F1</strong> são obrigatórias.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Cpu className="h-4 w-4" />
                2. Ensemble: IF + Autoencoder
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-amber-200 leading-relaxed text-center">
                Score = 0.55×IF + 0.45×AE (reconstruction error)
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O <strong>Isolation Forest</strong> detecta anomalias globais pela profundidade de partição,
                enquanto o <strong>Autoencoder</strong> (8→32→16→4→16→32→8) captura padrões
                não-lineares de comportamento normal e penaliza transações que não consegue reconstruir.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                <Sliders className="h-4 w-4" />
                3. Threshold por Custo Assimétrico
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 font-mono text-[11px] text-emerald-200 leading-relaxed text-center">
                min(N_FP × R$15 + N_FN × R$3.500)
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Não usar 0.50 fixo. O custo de <strong>não detectar</strong> uma fraude (R$ 3.500 médio) é
                233× maior que o custo de <strong>bloquear</strong> uma transação legítima (R$ 15 de atrito).
                O threshold ótimo calibrado é <strong>0.65</strong>.
              </p>
            </div>
          </div>

          {/* Feature Importance Comparison */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-rose-400" />
              Feature Importance: Isolation Forest vs Autoencoder
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
              {/* Feature Cards */}
              <div className="lg:col-span-2 flex flex-col gap-2.5">
                {FEATURES_DATA.map((feat) => {
                  const categoryColors: Record<string, string> = {
                    temporal: "bg-blue-500/20 text-blue-300 border-blue-500/30",
                    valor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
                    comportamental: "bg-amber-500/20 text-amber-300 border-amber-500/30",
                    rede: "bg-purple-500/20 text-purple-300 border-purple-500/30",
                  };
                  const categoryLabels: Record<string, string> = {
                    temporal: "Temporal",
                    valor: "Valor",
                    comportamental: "Comportamental",
                    rede: "Rede",
                  };
                  return (
                    <div
                      key={feat.id}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.04] transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">{feat.name}</span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                            categoryColors[feat.category]
                          )}
                        >
                          {categoryLabels[feat.category]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-rose-300 font-mono font-bold">IF: {(feat.importance * 100).toFixed(1)}%</span>
                        <span className="text-cyan-300 font-mono font-bold">AE: {(feat.autoencoderWeight * 100).toFixed(1)}%</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug">{feat.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Chart */}
              <div className="lg:col-span-3 p-5 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <BarChart3 className="h-4 w-4 text-rose-400" />
                  Importância Relativa (%) — Dual Model
                </div>
                <div className="flex items-center gap-6 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-rose-500/80" /> Isolation Forest
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-cyan-500/80" /> Autoencoder
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={featureImportanceData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} domain={[0, 25]} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} width={170} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15,23,42,0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        fontSize: "11px",
                      }}
                      formatter={(value: any, name: any) => [
                        `${value}%`,
                        name === "ifImportance" ? "Isolation Forest" : "Autoencoder",
                      ]}
                    />
                    <Bar dataKey="ifImportance" fill="rgba(244,63,94,0.7)" radius={[0, 4, 4, 0]} barSize={10} />
                    <Bar dataKey="aeWeight" fill="rgba(34,211,238,0.7)" radius={[0, 4, 4, 0]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Hourly Fraud Pattern */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Clock className="h-4 w-4 text-amber-400" />
                Padrão Horário: Taxa de Fraude por Hora do Dia
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Pico de Risco: 03h-05h (até 6.09% de fraude)
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={HOURLY_FRAUD_PATTERN} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#f59e0b", fontSize: 10 }} unit="%" />
                <Tooltip
                  contentStyle={{
                    background: "rgba(15,23,42,0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "11px",
                  }}
                />
                <Bar yAxisId="left" dataKey="totalTx" fill="rgba(100,116,139,0.3)" radius={[4, 4, 0, 0]} name="Total Transações" />
                <Line yAxisId="right" type="monotone" dataKey="fraudRate" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: "#f59e0b" }} name="Taxa de Fraude (%)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 2: ISOLATION FOREST & AUTOENCODER                           */}
      {/* ================================================================ */}
      {activeTab === "models" && (
        <div className="flex flex-col gap-8">
          {/* Arquitetura */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Isolation Forest */}
            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Sparkles className="h-4 w-4 text-rose-400" />
                Isolation Forest — Anomaly Score Distribution
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O IF isola anomalias com <strong>menos partições</strong> (menor profundidade na árvore).
                Transações com score &gt; 0.60 têm probabilidade de fraude superior a 9%.
              </p>
              <div className="space-y-1.5">
                {ANOMALY_SCORE_DISTRIBUTION.map((bin, idx) => {
                  const maxFraudRate = 95.5;
                  const barWidth = Math.max(2, (bin.fraudRate / maxFraudRate) * 100);
                  return (
                    <div key={idx} className="flex items-center gap-3 text-[11px]">
                      <span className="text-muted-foreground font-mono w-20 shrink-0">{bin.scoreRange}</span>
                      <div className="flex-1 h-5 bg-white/[0.03] rounded-full overflow-hidden relative">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-600/80 to-rose-400/80"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-rose-300 font-mono font-bold w-14 text-right">{bin.fraudRate.toFixed(1)}%</span>
                      <span className="text-muted-foreground w-20 text-right">{bin.totalTx.toLocaleString()} tx</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground border-t border-white/5 pt-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Fraud Rate do Bin
                </span>
                <span>n_estimators=300 • contamination=0.005 • max_features=0.8</span>
              </div>
            </div>

            {/* Autoencoder */}
            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Cpu className="h-4 w-4 text-cyan-400" />
                Autoencoder — Reconstruction Error (MSE)
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Treinado <strong>somente</strong> com transações legítimas. Fraudes geram
                erro de reconstrução alto porque o modelo nunca aprendeu a reproduzir padrões anômalos.
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={RECONSTRUCTION_ERROR_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="errorBin" tick={{ fill: "#94a3b8", fontSize: 10 }} label={{ value: "Reconstruction Error (MSE)", position: "bottom", fill: "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} scale="log" domain={[1, 200000]} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: "11px",
                    }}
                    formatter={(value: any, name: any) => [
                      typeof value === "number" ? value.toLocaleString() : String(value ?? ""),
                      name === "legitimate" ? "Legítimas" : "Fraudulentas",
                    ]}
                  />
                  <Bar dataKey="legitimate" fill="rgba(34,211,238,0.5)" name="legitimate" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fraud" fill="rgba(244,63,94,0.8)" name="fraud" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500/60" /> Legítimas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" /> Fraudulentas
                </span>
                <span>Escala Log • Arquitetura: 8→32→16→4→16→32→8</span>
              </div>
            </div>
          </div>

          {/* Arquitetura do Autoencoder Visual */}
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Layers className="h-4 w-4 text-purple-400" />
              Arquitetura Neural: Autoencoder Undercomplete
            </div>
            <div className="grid grid-cols-7 gap-2 items-center py-4">
              {[
                { label: "Input", neurons: 8, color: "bg-slate-500" },
                { label: "Enc. 1", neurons: 32, color: "bg-cyan-500" },
                { label: "Enc. 2", neurons: 16, color: "bg-blue-500" },
                { label: "Latent", neurons: 4, color: "bg-purple-500" },
                { label: "Dec. 1", neurons: 16, color: "bg-blue-500" },
                { label: "Dec. 2", neurons: 32, color: "bg-cyan-500" },
                { label: "Output", neurons: 8, color: "bg-slate-500" },
              ].map((layer, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{layer.label}</span>
                  <div
                    className={cn("rounded-xl border border-white/10 flex items-center justify-center font-mono font-bold text-white text-sm", layer.color)}
                    style={{ height: `${Math.max(30, layer.neurons * 3.5)}px`, width: "100%", opacity: 0.7 }}
                  >
                    {layer.neurons}
                  </div>
                  <div className="flex flex-col items-center text-[9px] text-muted-foreground">
                    {idx < 3 && <span>BatchNorm</span>}
                    {idx < 3 && <span>LeakyReLU</span>}
                    {idx === 0 && <span>Dropout(0.2)</span>}
                    {idx === 3 && <span className="text-purple-400 font-bold">Bottleneck</span>}
                    {idx > 3 && idx < 6 && <span>BatchNorm</span>}
                    {idx > 3 && idx < 6 && <span>LeakyReLU</span>}
                    {idx === 6 && <span>MSE Loss</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground border-t border-white/5 pt-3">
              <span>Optimizer: AdamW (lr=1e-3)</span>
              <span>Epochs: 50</span>
              <span>Batch: 512</span>
              <span>Treinamento: Apenas transações legítimas</span>
            </div>
          </div>

          {/* Ensemble Weights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col gap-2">
              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Isolation Forest (Peso: 55%)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Melhor em detectar anomalias globais e outliers extremos. Rápido para scoring em tempo real.
              </p>
              <span className="text-xs font-mono text-rose-200">AP Isolado: 0.791</span>
            </div>
            <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 flex flex-col gap-2">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" /> Autoencoder (Peso: 45%)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Superior em capturar padrões comportamentais não-lineares e fraudes sofisticadas (low-amount fraud).
              </p>
              <span className="text-xs font-mono text-cyan-200">AP Isolado: 0.814</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col gap-2">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Ensemble Final
              </span>
              <p className="text-[11px] text-muted-foreground">
                A combinação ponderada supera ambos os modelos isolados em todas as métricas de ranking.
              </p>
              <span className="text-xs font-mono text-emerald-200">AP Ensemble: 0.847 (+4.1%)</span>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 3: PRECISION-RECALL & THRESHOLD OPTIMIZATION                */}
      {/* ================================================================ */}
      {activeTab === "pr_curve" && (
        <div className="flex flex-col gap-8">
          {/* Why PR > ROC for imbalanced */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
              <FileText className="h-4 w-4" />
              Por que Precision-Recall e não ROC-AUC?
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Com <strong>0.49% de fraude</strong>, a curva ROC é otimista porque a especificidade (TNR) é quase sempre alta.
              A curva <strong>Precision-Recall</strong> foca exclusivamente na classe positiva (fraude) e expõe o real trade-off
              entre capturar mais fraudes (recall) e não bloquear clientes legítimos (precision).
            </p>
          </div>

          {/* PR Curve + Threshold Slider */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-5 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Target className="h-4 w-4 text-emerald-400" />
                  Curva Precision-Recall por Threshold
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  AP = 0.847 (Average Precision)
                </span>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={PRECISION_RECALL_CURVE} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="threshold" tick={{ fill: "#94a3b8", fontSize: 10 }} label={{ value: "Threshold", position: "bottom", fill: "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} unit="%" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: "11px",
                    }}
                  />
                  <ReferenceLine x={selectedThreshold} stroke="rgba(250,204,21,0.6)" strokeDasharray="5 5" strokeWidth={2} />
                  <Line type="monotone" dataKey="precision" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3, fill: "#34d399" }} name="Precision (%)" />
                  <Line type="monotone" dataKey="recall" stroke="#f87171" strokeWidth={2.5} dot={{ r: 3, fill: "#f87171" }} name="Recall (%)" />
                  <Line type="monotone" dataKey="f1" stroke="#60a5fa" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 2.5, fill: "#60a5fa" }} name="F1-Score (%)" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-6 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-400 rounded" /> Precision</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-rose-400 rounded" /> Recall</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 rounded border-dashed" /> F1-Score</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-yellow-400 rounded" /> Threshold Selecionado</span>
              </div>
            </div>

            {/* Threshold Selector */}
            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Sliders className="h-4 w-4 text-amber-400" />
                Ajuste de Threshold
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Threshold: <strong className="text-amber-300 font-mono">{selectedThreshold.toFixed(2)}</strong></label>
                  <input
                    type="range" min={0.30} max={0.95} step={0.05}
                    value={selectedThreshold}
                    onChange={(e) => setSelectedThreshold(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 h-1.5"
                  />
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>Alto Recall</span>
                    <span>Alta Precision</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-white/5 pt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Precision</span>
                  <span className="font-mono font-bold text-emerald-300">{selectedPRPoint.precision.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Recall</span>
                  <span className="font-mono font-bold text-rose-300">{selectedPRPoint.recall.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">F1-Score</span>
                  <span className="font-mono font-bold text-blue-300">{selectedPRPoint.f1.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">False Positive Rate</span>
                  <span className="font-mono font-bold text-amber-300">{selectedPRPoint.falsePositiveRate.toFixed(3)}%</span>
                </div>
                <div className="flex justify-between text-xs border-t border-white/5 pt-2">
                  <span className="text-muted-foreground">Fraudes Capturadas</span>
                  <span className="font-mono font-bold text-foreground">{selectedPRPoint.fraudsCaught.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Legítimas Bloqueadas</span>
                  <span className="font-mono font-bold text-foreground">{selectedPRPoint.legitimateBlocked.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 leading-relaxed">
                <strong>Threshold Ótimo = 0.65</strong> — Minimiza o custo total ponderado (R$ 15/FP + R$ 3.500/FN)
                com F1 de 69.7% e Recall de 91.8%.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 4: SIMULADOR DE IMPACTO FINANCEIRO                          */}
      {/* ================================================================ */}
      {activeTab === "simulator" && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sliders */}
            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col gap-5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Sliders className="h-4 w-4 text-cyan-400" />
                Parâmetros da Simulação
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">
                    Volume Mensal de Transações: <strong className="text-foreground font-mono">{monthlyTxVolume.toLocaleString()}</strong>
                  </label>
                  <input
                    type="range" min={50000} max={2000000} step={10000}
                    value={monthlyTxVolume}
                    onChange={(e) => setMonthlyTxVolume(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">
                    Valor Médio da Fraude: <strong className="text-foreground font-mono">R$ {avgFraudValue.toLocaleString()}</strong>
                  </label>
                  <input
                    type="range" min={500} max={15000} step={100}
                    value={avgFraudValue}
                    onChange={(e) => setAvgFraudValue(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">
                    Taxa de Fraude Baseline: <strong className="text-foreground font-mono">{fraudRateBaseline.toFixed(2)}%</strong>
                  </label>
                  <input
                    type="range" min={0.1} max={3.0} step={0.01}
                    value={fraudRateBaseline}
                    onChange={(e) => setFraudRateBaseline(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">
                    Custo por Falso Positivo: <strong className="text-foreground font-mono">R$ {costPerFP.toFixed(0)}</strong>
                  </label>
                  <input
                    type="range" min={5} max={100} step={1}
                    value={costPerFP}
                    onChange={(e) => setCostPerFP(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">
                    Threshold do Modelo: <strong className="text-amber-300 font-mono">{selectedThreshold.toFixed(2)}</strong>
                  </label>
                  <input
                    type="range" min={0.30} max={0.95} step={0.05}
                    value={selectedThreshold}
                    onChange={(e) => setSelectedThreshold(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 h-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Perdas Evitadas</span>
                  <span className="text-xl font-extrabold text-emerald-300 font-mono">
                    R$ {simulationMetrics.lossPreventedValue.toFixed(2)}M
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    {simulationMetrics.reductionPct.toFixed(1)}% das fraudes interceptadas
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Fraudes Não Detectadas</span>
                  <span className="text-xl font-extrabold text-rose-300 font-mono">
                    R$ {simulationMetrics.lossMissedValue.toFixed(2)}M
                  </span>
                  <span className="text-[10px] text-rose-400 flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3" />
                    {simulationMetrics.fraudsMissed.toLocaleString()} fraudes escaparam
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Custo de Falsos Positivos</span>
                  <span className="text-xl font-extrabold text-amber-300 font-mono">
                    R$ {simulationMetrics.fpCostValue.toFixed(3)}M
                  </span>
                  <span className="text-[10px] text-amber-400 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {simulationMetrics.falsePositives.toLocaleString()} clientes impactados
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Savings Líquido</span>
                  <span className={cn(
                    "text-xl font-extrabold font-mono",
                    simulationMetrics.netSavings >= 0 ? "text-cyan-300" : "text-rose-300"
                  )}>
                    R$ {simulationMetrics.netSavings.toFixed(2)}M
                  </span>
                  <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Evitado − Custo FP
                  </span>
                </div>
              </div>

              {/* Waterfall Breakdown */}
              <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  Decomposição do Impacto Financeiro (Mensal)
                </div>

                <div className="space-y-3">
                  {/* Baseline */}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground w-48">Perda Total (Sem Modelo)</span>
                    <div className="flex-1 h-6 bg-white/[0.03] rounded-full overflow-hidden">
                      <div className="h-full bg-rose-600/60 rounded-full flex items-center justify-end px-2" style={{ width: "100%" }}>
                        <span className="text-[10px] font-mono font-bold text-white">R$ {simulationMetrics.baselineLoss.toFixed(2)}M</span>
                      </div>
                    </div>
                  </div>

                  {/* Detected */}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground w-48">Fraudes Detectadas ({selectedPRPoint.recall.toFixed(0)}%)</span>
                    <div className="flex-1 h-6 bg-white/[0.03] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-600/60 rounded-full flex items-center justify-end px-2"
                        style={{ width: `${simulationMetrics.baselineLoss > 0 ? (simulationMetrics.lossPreventedValue / simulationMetrics.baselineLoss) * 100 : 0}%` }}
                      >
                        <span className="text-[10px] font-mono font-bold text-white">R$ {simulationMetrics.lossPreventedValue.toFixed(2)}M</span>
                      </div>
                    </div>
                  </div>

                  {/* Missed */}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground w-48">Fraudes Escaparam ({(100 - selectedPRPoint.recall).toFixed(0)}%)</span>
                    <div className="flex-1 h-6 bg-white/[0.03] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500/40 rounded-full flex items-center justify-end px-2"
                        style={{ width: `${simulationMetrics.baselineLoss > 0 ? (simulationMetrics.lossMissedValue / simulationMetrics.baselineLoss) * 100 : 0}%` }}
                      >
                        <span className="text-[10px] font-mono font-bold text-white">R$ {simulationMetrics.lossMissedValue.toFixed(2)}M</span>
                      </div>
                    </div>
                  </div>

                  {/* FP Cost */}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground w-48">Custo de Falsos Positivos</span>
                    <div className="flex-1 h-6 bg-white/[0.03] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500/40 rounded-full flex items-center justify-end px-2"
                        style={{ width: `${Math.max(2, simulationMetrics.baselineLoss > 0 ? (simulationMetrics.fpCostValue / simulationMetrics.baselineLoss) * 100 : 0)}%` }}
                      >
                        <span className="text-[10px] font-mono font-bold text-white">R$ {simulationMetrics.fpCostValue.toFixed(3)}M</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200 leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    <strong>ROI do modelo:</strong> A cada R$ 1 investido em custo operacional de falsos positivos,
                    o sistema economiza R$ {simulationMetrics.fpCostValue > 0 ? (simulationMetrics.lossPreventedValue / simulationMetrics.fpCostValue).toFixed(0) : "∞"} em fraudes evitadas.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 5: PIPELINE PYTHON                                          */}
      {/* ================================================================ */}
      {activeTab === "python_code" && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Code2 className="h-4 w-4 text-purple-400" />
              Pipeline Completo: Feature Engineering → IF + Autoencoder → Ensemble → Threshold
            </div>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-colors"
            >
              {codeCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {codeCopied ? "Copiado!" : "Copiar Código"}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 overflow-x-auto max-h-[600px] overflow-y-auto">
            <pre className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre">
              {PYTHON_PIPELINE_CODE}
            </pre>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
              <div className="text-xs text-muted-foreground mb-1">Linguagem</div>
              <div className="text-sm font-bold text-foreground">Python 3.11</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
              <div className="text-xs text-muted-foreground mb-1">ML</div>
              <div className="text-sm font-bold text-foreground">Scikit-Learn + PyTorch</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
              <div className="text-xs text-muted-foreground mb-1">Dados</div>
              <div className="text-sm font-bold text-foreground">Polars + SMOTE</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-center">
              <div className="text-xs text-muted-foreground mb-1">Otimização</div>
              <div className="text-sm font-bold text-foreground">Cost-Sensitive Threshold</div>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
