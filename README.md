Welcome to Your Lovable Project
Project Overview
Project Name: Risk & Compliance Advisor Agent Live URL: lovable.dev/projects/ef01753e-54ad-45f2-ba74-c0eca1042939 Tech Stack: Vite · TypeScript · React · Tailwind CSS ·art shadcn-ui · FastAPI · Supabase · n8n · Docker · FAISS · OpenAI

A modular AI-powered assistant designed to automate legal Q&A, risk detection, and compliance reporting. Built with microservices and RAG architecture, it supports multilingual advice, red flag classification, and traceable citations.

🔧 How to Edit This Code
Option 1: Use Lovable (No Setup Required)
Visit your Lovable dashboard

Use natural language prompts to modify UI, logic, or styling

Changes are auto-committed to your GitHub repo

Option 2: Local Development via IDE
sh
# Clone the repo
git clone <YOUR_GIT_URL>

# Navigate to the project
cd advisor-agent

# Install dependencies
npm i

# Start the dev server
npm run dev
Requires Node.js & npm. Install via nvm

Option 3: GitHub Codespaces
Go to your repo’s main page

Click “Code” → “Codespaces” → “New Codespace”

Edit and commit directly in the cloud IDE

🧠 AI Agent Architecture
Based on your SRS and Detailed Project Plan, the agent includes:

Document Ingestion: PDF/DOCX/CSV parsing, OCR via Textract/Tesseract

Embedding & Retrieval: SentenceTransformers + FAISS

Prompt Engineering: Context-aware templates for legal Q&A, risk scoring

LLM Integration: OpenAI, Claude, or Hugging Face via FastAPI

Red Flag Classifier: LegalBERT/RoBERTa with SHAP explainability

Risk Analysis Engine: Normalized scoring with domain weights

Session Logging: PostgreSQL + Supabase

Monitoring: Prometheus, Grafana, ELK, Sentry

⚙️ Workflow Automation with n8n
Use the self-building agent template to automate:

File upload → ingestion → embedding → vector search

Chat query → context injection → LLM response

Risk detection → scoring → PDF report generation

Session logging → audit trail → Slack alerts

Supports modular sub-workflows for ingestion, Q&A, and reporting6.

🚀 Deployment Instructions
Firebase Studio
Backend services and session tracking are integrated via Firebase Studio

FastAPI Microservices
Endpoints: /upload, /ask, /risk-analysis, /report, /history

Auth: JWT + OAuth2

Containerized via Docker, orchestrated with Kubernetes

Lovable Deployment
Open your Lovable dashboard

Click Share → Publish to go live

🌐 Custom Domain Setup
Go to Project → Settings → Domains

Click Connect Domain

