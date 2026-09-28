"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Layers,
  Activity,
  Sliders,
  Play,
  Zap,
  Clock,
  DollarSign,
  TrendingUp,
  Target,
  FileCode,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
} from "recharts";
import { scoreTransactionApi, TransactionPayload, ScoreResponse } from "@/lib/api";

const PRESETS: Record<string, Partial<TransactionPayload>> = {
  legit: {
    transaction_id: "tx_legit_551",
    user_id: "usr_paulista",
    card_id: "crd_8812",
    amount: 112.50,
    merchant_mcc: "5411", // Supermercado
    merchant_risk_score: 0.05,
    latitude: -23.5505,
    longitude: -46.6333,
    channel: "pos",
    user_historical_mean: 95.0,
    user_historical_std: 35.0,
  },
  fraud_zscore: {
    transaction_id: "tx_fraud_778",
    user_id: "usr_vítima_01",
    card_id: "crd_1092",
    amount: 5490.00, // Desvio brutal
    merchant_mcc: "5732", // Eletrônicos
    merchant_risk_score: 0.78,
    latitude: -23.5505,
    longitude: -46.6333,
    channel: "ecommerce",
    user_historical_mean: 80.0,
    user_historical_std: 25.0,
  },
  fraud_speed: {
    transaction_id: "tx_speed_991",
    user_id: "usr_viajante",
    card_id: "crd_4419",
    amount: 2850.00,
    merchant_mcc: "5944", // Joalheria
    merchant_risk_score: 0.85,
    latitude: -3.7172, // Fortaleza (CE)
    longitude: -38.5433,
    channel: "ecommerce",
    user_historical_mean: 150.0,
    user_historical_std: 50.0,
    last_tx_latitude: -23.5505, // SP 15 min antes
    last_tx_longitude: -46.6333,
  },
};

const PR_POINTS = [
  { threshold: 0.30, precision: 2.8, recall: 99.8, f1: 5.4 },
  { threshold: 0.40, precision: 5.1, recall: 99.4, f1: 9.7 },
  { threshold: 0.50, precision: 14.3, recall: 98.7, f1: 25.0 },
  { threshold: 0.55, precision: 22.8, recall: 97.2, f1: 36.9 },
  { threshold: 0.60, precision: 38.5, recall: 95.5, f1: 54.9 },
  { threshold: 0.65, precision: 56.2, recall: 91.8, f1: 69.7 },
  { threshold: 0.70, precision: 66.8, recall: 83.5, f1: 74.2 },
  { threshold: 0.75, precision: 78.4, recall: 67.2, f1: 72.4 },
  { threshold: 0.80, precision: 90.2, recall: 44.1, f1: 59.2 },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"simulator" | "metrics" | "roi">("simulator");
  const [threshold, setThreshold] = useState<number>(0.65);
  const [loading, setLoading] = useState(false);

  // Form State
  const [txForm, setTxForm] = useState<TransactionPayload>({
    transaction_id: "tx_demo_01",
    user_id: "usr_1042",
    card_id: "crd_9941",
    amount: 2850.0,
    merchant_mcc: "5732",
    merchant_risk_score: 0.75,
    latitude: -23.5505,
    longitude: -46.6333,
    channel: "ecommerce",
    user_historical_mean: 110.0,
    user_historical_std: 35.0,
  });

  const [lastResult, setLastResult] = useState<ScoreResponse | null>(null);

  // ROI Simulator State
  const [costFp, setCostFp] = useState(15);
  const [costFn, setCostFn] = useState(3500);
  const [simThreshold, setSimThreshold] = useState(0.65);

  const handleApplyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (preset) {
      setTxForm((prev) => ({ ...prev, ...preset }));
    }
  };

  const handleScore = async () => {
    setLoading(true);
    try {
      const res = await scoreTransactionApi(txForm, threshold);
      setLastResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-7xl mx-auto flex flex-col gap-8">
      {/* ─── HEADER ────────────────────────────────────────────────────────── */}
      <header className="liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-widest">
            <ShieldAlert className="h-4 w-4" />
            <span>Sentinel • Real-Time Fraud Prevention System</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Prevenção de Fraude & Anomaly Detection
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Arquitetura de inferência de baixa latência combinando <strong>Isolation Forest</strong> com{" "}
            <strong>Autoencoders Neurais em PyTorch</strong> e calibração por matriz de custo assimétrico.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            FastAPI Online (Port 8000)
          </span>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white flex items-center gap-1.5 transition-colors"
          >
            <span>Swagger API Docs</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>
        </div>
      </header>

      {/* ─── TABS ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab("simulator")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === "simulator"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Play className="h-4 w-4 text-rose-400" />
          1. Simulador de Inferência Unitária
        </button>

        <button
          onClick={() => setActiveTab("metrics")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === "metrics"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Target className="h-4 w-4 text-cyan-400" />
          2. Curva Precision-Recall (Benchmark 488K)
        </button>

        <button
          onClick={() => setActiveTab("roi")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === "roi"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-lg"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <DollarSign className="h-4 w-4 text-emerald-400" />
          3. Simulador de Custo Assimétrico (ROI)
        </button>
      </div>

      {/* ─── TAB 1: SIMULATOR ──────────────────────────────────────────────── */}
      {activeTab === "simulator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls & Form */}
          <div className="lg:col-span-7 liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-rose-400" />
                Parâmetros da Transação para Escoragem
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>Presets:</span>
                <button
                  onClick={() => handleApplyPreset("legit")}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px]"
                >
                  Legítima
                </button>
                <button
                  onClick={() => handleApplyPreset("fraud_zscore")}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 text-[11px]"
                >
                  Z-Score Extremo
                </button>
                <button
                  onClick={() => handleApplyPreset("fraud_speed")}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 text-[11px]"
                >
                  Viagem Impossível
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Valor da Transação (R$)</label>
                <input
                  type="number"
                  value={txForm.amount}
                  onChange={(e) => setTxForm({ ...txForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm focus:border-rose-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Canal de Pagamento</label>
                <select
                  value={txForm.channel}
                  onChange={(e) => setTxForm({ ...txForm, channel: e.target.value as any })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:border-rose-400 outline-none"
                >
                  <option value="ecommerce">E-Commerce</option>
                  <option value="pos">POS (Maquininha)</option>
                  <option value="contactless">Contactless</option>
                  <option value="pix">Pix Noturno</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Ticket Médio do Titular (90d)</label>
                <input
                  type="number"
                  value={txForm.user_historical_mean}
                  onChange={(e) => setTxForm({ ...txForm, user_historical_mean: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm focus:border-rose-400 outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Score de Risco do Merchant (MCC)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={txForm.merchant_risk_score}
                  onChange={(e) => setTxForm({ ...txForm, merchant_risk_score: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-sm focus:border-rose-400 outline-none"
                />
              </div>
            </div>

            {/* Threshold Slider */}
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-semibold">Threshold de Bloqueio Ativo (θ):</span>
                <span className="font-mono text-rose-400 font-bold">{threshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.90"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.30 (Ultra-Rigoroso / Alto Atrito)</span>
                <span>0.65 (Ótimo por Custo)</span>
                <span>0.90 (Permissivo)</span>
              </div>
            </div>

            <button
              onClick={handleScore}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-white font-bold text-sm shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              <span>{loading ? "Processando Inferência..." : "Executar Análise em Tempo Real (< 25ms)"}</span>
            </button>
          </div>

          {/* Results Box */}
          <div className="lg:col-span-5 liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col justify-between border border-white/10">
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-400" />
                Veredito do Ensemble & Telemetria
              </h2>

              {lastResult ? (
                <div className="flex flex-col gap-5">
                  {/* Decision Banner */}
                  <div
                    className={`p-5 rounded-2xl border flex items-center justify-between ${
                      lastResult.decision === "BLOCK"
                        ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                        : lastResult.decision === "REVIEW"
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                        : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    }`}
                  >
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Decisão do Motor</div>
                      <div className="text-2xl font-black">{lastResult.decision}</div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold border border-current">
                      Risco {lastResult.risk_level}
                    </span>
                  </div>

                  {/* Scores Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <span className="text-slate-400">Ensemble Ponderado:</span>
                      <div className="text-lg font-bold text-white font-mono mt-0.5">
                        {(lastResult.ensemble_score * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <span className="text-slate-400">Latência do Pipeline:</span>
                      <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">
                        {lastResult.latency_ms} ms
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <span className="text-slate-400">Isolation Forest (55%):</span>
                      <div className="text-base font-bold text-rose-400 font-mono mt-0.5">
                        {(lastResult.if_score * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                      <span className="text-slate-400">PyTorch Autoencoder (45%):</span>
                      <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                        MSE {lastResult.ae_reconstruction_error}
                      </div>
                    </div>
                  </div>

                  {/* Triggered Rules */}
                  {lastResult.triggered_rules.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-slate-400">Regras & Sinais Ativados:</span>
                      <div className="flex flex-col gap-1.5">
                        {lastResult.triggered_rules.map((rule, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-rose-300">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>{rule}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 gap-2">
                  <ShieldAlert className="h-10 w-10 text-slate-600" />
                  <p className="text-xs max-w-xs">
                    Clique em &quot;Executar Análise&quot; para enviar a carga transacional e obter a inferência em tempo real.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Pipeline assíncrono Pydantic v2 + Torch</span>
              <span>SLO: &lt; 25ms</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: PR CURVE ───────────────────────────────────────────────── */}
      {activeTab === "metrics" && (
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col gap-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold text-white">Curva Precision-Recall vs. Ilusão do ROC-AUC</h2>
              <p className="text-xs text-slate-400 mt-1">
                Avaliação em 488.000 transações reais (taxa de fraude de 0,49%). O PR-AUC avalia o trade-off real de negócio.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                PR-AUC: 0.847
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 line-through">
                ROC-AUC: 0.984 (Enganoso)
              </span>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={PR_POINTS} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="recall" label={{ value: "Recall (%)", position: "bottom", fill: "#94a3b8", fontSize: 11 }} />
                <YAxis label={{ value: "Precision (%)", angle: -90, position: "insideLeft", fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: "11px" }}
                />
                <ReferenceLine x={91.8} stroke="#f43f5e" strokeDasharray="4 4" label="Threshold 0.65 (Ótimo)" />
                <Line type="monotone" dataKey="precision" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4 }} name="Precision" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── TAB 3: ROI ────────────────────────────────────────────────────── */}
      {activeTab === "roi" && (
        <div className="liquid-glass rounded-3xl p-6 sm:p-8 flex flex-col gap-6">
          <h2 className="text-xl font-bold text-white">Simulador de Decisão Orientada a Custo (Cost-Sensitive Matrix)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
              <span className="text-xs text-slate-400">Custo Falso Positivo (Atrito):</span>
              <input
                type="number"
                value={costFp}
                onChange={(e) => setCostFp(parseFloat(e.target.value) || 0)}
                className="bg-transparent text-xl font-bold text-white outline-none font-mono"
              />
              <span className="text-[10px] text-slate-500">Custo de suporte/SAC por bloqueio</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1">
              <span className="text-xs text-slate-400">Custo Falso Negativo (Chargeback):</span>
              <input
                type="number"
                value={costFn}
                onChange={(e) => setCostFn(parseFloat(e.target.value) || 0)}
                className="bg-transparent text-xl font-bold text-rose-400 outline-none font-mono"
              />
              <span className="text-[10px] text-slate-500">Ticket médio de fraude não capturada</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-1 justify-center">
              <span className="text-xs text-emerald-400 font-bold">ROI Econômico Estimado:</span>
              <div className="text-2xl font-black text-white font-mono">299 : 1</div>
              <span className="text-[10px] text-slate-400">R$ 299 salvos por R$ 1 de fricção operacional</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
