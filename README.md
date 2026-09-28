<div align="center">

# 🛡️ Sentinel: Anomaly Detection & Fraud Prevention System

**Sistema de Detecção de Fraude em Tempo Real com Ensemble de Isolation Forest, Autoencoders (PyTorch) e Decisão Sensível a Custo.**

[![CI](https://github.com/Renanbritto/fraud-detection-anomaly/actions/workflows/ci.yml/badge.svg)](https://github.com/Renanbritto/fraud-detection-anomaly/actions/workflows/ci.yml)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.4+-EE4C2C.svg?logo=pytorch&logoColor=white)](https://pytorch.org)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED.svg?logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Explorar Demonstração Interativa](https://renan-nocelli.vercel.app/projetos/deteccao-fraude-anomaly-detection) • [Ler Artigo Técnico](https://renan-nocelli.vercel.app/postagens/deteccao-fraude-financeira-anomaly-detection-deep-learning)

</div>

---

## 📌 Visão Geral do Projeto

Em sistemas de pagamento modernos com centenas de milhares de transações diárias, a ocorrência de fraudes é um clássico **evento raro** (tipicamente inferior a 0,5% do tráfego). Sob esse desbalanceamento extremo (1:204), classificadores supervisionados tradicionais sofrem com a **ilusão da acurácia** (atingem 99,5% de acurácia classificando tudo como legítimo, sem capturar nenhuma fraude).

O **Sentinel** é um sistema de detecção de fraudes construído segundo os padrões de produção de fintechs líderes (Nubank, Mercado Pago, Stripe), combinando:
1. **Engenharia de Variáveis Comportamentais**: Z-Score de valor, contagem em janela deslizante (Redis), distâncias geográficas e desvio horário.
2. **Ensemble Não-Supervisionado / Semi-Supervisionado**: Ponderação de **Isolation Forest** (scikit-learn) com **Autoencoder Neural Undercomplete** (PyTorch).
3. **Calibração por Custo Assimétrico (Cost-Sensitive Matrix)**: Otimização de threshold financeiro onde o custo de falso negativo (R$ 3.500) é 233× superior ao falso positivo (R$ 15).

---

## 🏗️ Arquitetura do Sistema

```mermaid
flowchart TD
    subgraph Client["Camada de Apresentação"]
        UI["Next.js 15 Dashboard"]
        ClientTx["Gateway de Pagamento / POS"]
    end

    subgraph API["FastAPI Application (Clean Architecture)"]
        Router["/api/v1/transactions/score"]
        Validator["Pydantic v2 Schema Validation"]
        FeatureEngine["Feature Engineering Engine"]
        CostMatrix["Cost-Sensitive Decision Engine"]
    end

    subgraph Store["Cache & In-Memory Store"]
        Redis[("Redis 7.2\nSliding Window Cache")]
    end

    subgraph ML["Ensemble de Anomaly Detection"]
        IF["Isolation Forest\n(300 iTrees, Path Length)"]
        AE["PyTorch Autoencoder\n(Reconstruction MSE)"]
        Ensemble["Weighted Scoring\n0.55*IF + 0.45*AE"]
    end

    ClientTx -->|POST /score| Router
    UI -->|Telemetry & Simulation| Router
    Router --> Validator
    Validator --> FeatureEngine
    FeatureEngine <-->|Read/Update 1h Velocity| Redis
    FeatureEngine --> ML
    ML --> IF
    ML --> AE
    IF --> Ensemble
    AE --> Ensemble
    Ensemble --> CostMatrix
    CostMatrix -->|APPROVE / REVIEW / BLOCK| Router
    Router -->|JSON Response < 25ms| ClientTx
```

---

## 📊 Métricas & Benchmark

Avaliação em benchmark de **488.000 transações financeiras** (taxa real de 0,49% de fraude):

| Métrica | Classificador Naive | Random Forest Padrão | Sentinel (Ensemble IF + AE) |
|---|---|---|---|
| **Acurácia Global** | 99,51% (Ilusória) | 99,62% | **99,70%** |
| **Precision-Recall AUC (PR-AUC)** | 0,0049 | 0,721 | **0,847** |
| **Recall (Sensibilidade)** | 0,0% | 82,4% | **91,8% (2.207 fraudes)** |
| **Precision** | 0,0% | 46,1% | **56,2%** |
| **Taxa de Falsos Positivos (FPR)** | 0,0% | 0,58% | **0,30% (Apenas 1.720 tx)** |
| **Impacto Financeiro Líquido** | R$ 0 salvos | R$ 6,85M salvos | **R$ 7,72M Evitados (ROI 299:1)** |

---

## ⚡ Guia Rápido (Quick Start)

### Opção 1: Execução com Docker Compose (Recomendado)

Suba o cluster completo (FastAPI + Redis + Frontend) em 1 único comando:

```bash
# Clone o repositório
git clone https://github.com/Renanbritto/fraud-detection-anomaly.git
cd fraud-detection-anomaly

# Suba todos os serviços
docker compose up --build
```

Acesse:
* **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
* **API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Healthcheck**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

### Opção 2: Execução Local (Backend)

```bash
# Entre na pasta backend e crie o ambiente virtual
cd backend
python -m venv .venv
source .venv/bin/activate  # No Windows: .venv\Scripts\activate

# Instale as dependências
pip install -r requirements.txt

# Execute a suíte de testes
pytest -v --cov=app

# Inicie a API com hot-reload
uvicorn app.main:app --reload --port 8000
```

---

## 🧪 Estrutura de Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/health` | Status de saúde da API, modelos carregados e conexão Redis |
| `POST` | `/api/v1/transactions/score` | Avalia transação unitária em tempo real (< 25ms) |
| `POST` | `/api/v1/transactions/batch` | Avaliação vetorizada em lote para backtesting |
| `GET` | `/api/v1/metrics/pr-curve` | Dados de Precision-Recall e matriz de confusão por threshold |
| `GET` | `/api/v1/metrics/features` | Importância de features para Isolation Forest e Autoencoder |
| `POST` | `/api/v1/metrics/simulation` | Simulador What-If de custos assimétricos ($C_{FP}$ vs $C_{FN}$) |

---

## 🛡️ Contribuição & Boas Práticas

Este projeto segue rigorosamente os padrões de:
* **Clean Architecture & Separation of Concerns**
* **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
* **Type Safety**: Pydantic v2 + mypy no Python, TypeScript no Frontend
* **CI/CD**: GitHub Actions rodando Ruff linter, Typecheck e Pytest

---

## 👤 Autor

**Renan Nocelli**
* LinkedIn: [linkedin.com/in/renan-nocelli](https://linkedin.com/in/renan-nocelli)
* Portfólio: [renan-nocelli.vercel.app](https://renan-nocelli.vercel.app)
* GitHub: [@Renanbritto](https://github.com/Renanbritto)

Desenvolvido sob licença MIT.
