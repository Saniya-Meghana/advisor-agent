# 🛡️ Risk & Compliance Advisor Agent

A modular AI-powered assistant for legal Q&A, risk detection, and compliance reporting. Built with microservices and RAG architecture, it supports multilingual advice, red flag classification, and traceable citations.

**Live Demo:** [lovable.dev/projects/ef01753e-54ad-45f2-ba74-c0eca1042939](https://lovable.dev/projects/ef01753e-54ad-45f2-ba74-c0eca1042939)  
**Tech Stack:** Vite · TypeScript · React · Tailwind CSS · shadcn-ui · FastAPI · Supabase · Hugging Face · FAISS · Docker · n8n

---

## 🧠 Features

- **Document Ingestion**: PDF/DOCX/CSV parsing with OCR (Textract/Tesseract)
- **RAG Agent**: Context-aware retrieval using SentenceTransformers + FAISS
- **LLM Integration**: OpenAI, Claude, or Hugging Face models via FastAPI
- **Red Flag Classifier**: LegalBERT/RoBERTa with SHAP explainability
- **Risk Scoring Engine**: Weighted scoring with domain-specific factors
- **Session Logging**: PostgreSQL via Supabase with Row-Level Security
- **Multilingual Support**: GTE embeddings + multilingual prompts
- **Workflow Automation**: n8n pipelines for ingestion, scoring, reporting

---

## 🧩 Architecture Overview

```bash
advisor-agent/
├── backend/
│   ├── auth/                # Supabase JWT verification
│   ├── routes/              # FastAPI endpoints (/ask, /risk-analysis)
│   ├── db/                  # Supabase client for storage/logs
│   ├── risk_engine/         # RAG agent + classifier + scoring
│   └── main.py              # FastAPI app entrypoint
├── frontend/
│   └── src/                 # React + shadcn-ui chat interface
├── supabase/
│   └── schema.sql           # Tables + RLS policies
├── infra/
│   └── docker-compose.yaml  # Local dev setup
```

---

## 🚀 Setup Instructions

### Option 1: **Lovable (No Setup Required)**
- Open your [Lovable dashboard](https://lovable.dev)
- Use natural language prompts to modify UI or logic
- Changes auto-commit to GitHub

### Option 2: **Local Development**
```bash
git clone https://github.com/Saniya-Meghana/advisor-agent.git
cd advisor-agent
npm install
npm run dev
```
> Requires Node.js + npm (recommended via `nvm`)

### Option 3: **GitHub Codespaces**
- Go to your GitHub repo
- Click **Code → Codespaces → New Codespace**
- Edit and commit directly in the cloud IDE

---

## 🔐 Supabase Integration

- **Auth**: Email/password or OAuth via Supabase Auth
- **Storage**: Uploads stored in `compliance-docs/` bucket
- **Database**: PostgreSQL with RLS for user privacy
- **Vector Search**: Optional pgvector extension for semantic queries

```sql
-- compliance_logs table
create table compliance_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  document_name text,
  risk_score float,
  created_at timestamptz default now()
);
```

---

## 🧠 AI Agent Modules

### RAG Agent
```python
from sentence_transformers import SentenceTransformer
import faiss

model = SentenceTransformer("all-MiniLM-L6-v2")
index = faiss.IndexFlatL2(384)
```

### Red Flag Classifier
```python
from transformers import BertForSequenceClassification
model = BertForSequenceClassification.from_pretrained("bert-base-uncased")
```

### Risk Scoring
```python
def compute_risk_score(detections):
    score = sum(severity_weights[d["severity"]] * d["confidence"] for d in detections)
    return min(100, score * domain_factor)
```

---

## 📈 Monitoring & Automation

- **n8n**: Automates ingestion → embedding → scoring → reporting
- **Prometheus + Grafana**: Metrics and dashboards
- **Sentry**: Error tracking
- **Slack Alerts**: Compliance violations and audit logs

---

## 🌐 Deployment

- **Frontend**: Vercel or Firebase Hosting
- **Backend**: Render, Railway, or Cloud Run (Dockerized)
- **Database**: Supabase (PostgreSQL + Storage + Auth)

---

## 🧪 Evaluation Tools

- **RAGAS**: Factuality and citation accuracy
- **SHAP**: Explainability for classifier decisions
- **LangChain (optional)**: Orchestration layer for multi-hop reasoning

---

## 📜 License

MIT — feel free to fork, remix, and build your own compliance agents.

---
