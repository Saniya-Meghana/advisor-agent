#!/usr/bin/env bash
set -euo pipefail

# ------------------ EDIT THESE BEFORE RUNNING ------------------
DOMAIN="YOUR_DOMAIN"                # e.g. compliance.example.com
ADMIN_EMAIL="admin@YOUR_DOMAIN"     # used by certbot
USE_SUPABASE=false                  # true if you want to enable Supabase realtime logging
SUPABASE_URL="https://your-supabase-url"
SUPABASE_KEY="your-supabase-anon-key"
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXX/YYY/ZZZ"
JIRA_URL="https://your-org.atlassian.net"
JIRA_USER="jira-email@example.com"
JIRA_API_TOKEN="your_jira_api_token"
REDIS_PASSWORD="redispassword"
POSTGRES_PASSWORD="postgrespassword"
PROJECT_DIR="$(pwd)/advisor-agent"
# --------------------------------------------------------------

echo "Creating project directory: $PROJECT_DIR"
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# create docker-compose.yml
cat > docker-compose.yml <<'YAML'
version: "3.8"
services:
  redis:
    image: redis:7
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}"]
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    depends_on:
      - redis
      - postgres
    environment:
      - REDIS_URL=redis://:{$REDIS_PASSWORD}@redis:6379/0
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/postgres
      - SLACK_WEBHOOK=${SLACK_WEBHOOK_URL}
      - JIRA_URL=${JIRA_URL}
      - JIRA_USER=${JIRA_USER}
      - JIRA_API_TOKEN=${JIRA_API_TOKEN}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - DOMAIN=${DOMAIN}
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app

  nginx:
    image: nginx:stable
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/certs:/etc/letsencrypt
    depends_on:
      - backend

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana-oss:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  redis-data:
  pgdata:
  grafana-data:
YAML

# create nginx conf
mkdir -p nginx/conf.d
cat > nginx/conf.d/app.conf <<'NGINX'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name DOMAIN_PLACEHOLDER;

    # TLS placeholders - replace with actual cert paths from certbot
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;

    location / {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /metrics {
        proxy_pass http://backend:8000/metrics;
    }
}
NGINX
# replace placeholder
sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" nginx/conf.d/app.conf || true

# create prometheus config
mkdir -p prometheus
cat > prometheus/prometheus.yml <<'PROM'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'fastapi'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: /metrics
PROM

# create backend Dockerfile + minimal app
mkdir -p backend
cat > backend/Dockerfile <<'DOCK'
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

# system deps for tesseract + poppler
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    poppler-utils \
    build-essential \
    pkg-config \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
DOCK

cat > backend/requirements.txt <<'REQ'
fastapi
uvicorn[standard]
redis
python-dotenv
pydantic
prometheus-fastapi-instrumentator
requests
pytesseract
pdf2image
Pillow
psycopg2-binary
supabase
jira
python-jose
python-multipart
python-slugify
REQ

# main FastAPI app
cat > backend/main.py <<'PY'
import os
import io
import json
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
import redis
import requests
from prometheus_fastapi_instrumentator import Instrumentator
from pdf2image import convert_from_bytes
import pytesseract
import base64

# env / config
REDIS_URL = os.getenv("REDIS_URL", "redis://:redispassword@redis:6379/0")
SLACK_WEBHOOK = os.getenv("SLACK_WEBHOOK", "")
JIRA_URL = os.getenv("JIRA_URL", "")
JIRA_USER = os.getenv("JIRA_USER", "")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

app = FastAPI(title="Advisor Agent - Backend (Dev)")

# Redis client
r = redis.Redis.from_url(REDIS_URL, decode_responses=True)

# Prometheus instrumentation
Instrumentator().instrument(app).expose(app)

def slack_notify(text: str, severity: str="Warning"):
    if not SLACK_WEBHOOK:
        return
    payload = {
        "attachments": [{
            "color": "danger" if severity.lower()=="critical" else "warning",
            "title": f"{severity} risk detected",
            "text": text
        }]
    }
    try:
        requests.post(SLACK_WEBHOOK, json=payload, timeout=5)
    except Exception as e:
        print("Slack notify failed:", e)

def create_jira_ticket(summary: str, description: str, severity: str="High"):
    if not (JIRA_URL and JIRA_USER and JIRA_API_TOKEN):
        return None
    auth = (JIRA_USER, JIRA_API_TOKEN)
    payload = {
        "fields": {
            "project": {"key": "COMPLIANCE"},
            "summary": f"[{severity}] {summary}",
            "description": description,
            "issuetype": {"name": "Task"}
        }
    }
    try:
        r = requests.post(f"{JIRA_URL}/rest/api/3/issue", json=payload, auth=auth, timeout=10)
        return r.json()
    except Exception as e:
        print("Jira failed:", e)
        return None

@app.post("/upload")
async def upload_doc(user_id: str, file: UploadFile = File(...)):
    """
    Ingest file -> runs OCR if image-based, stores text chunks to Redis (or forward to vector store)
    """
    contents = await file.read()
    # quick heuristic: if file is pdf, try to extract text using pdf2image + tesseract
    text = ""
    if file.filename.lower().endswith(".pdf"):
        try:
            images = convert_from_bytes(contents)
            for im in images:
                text += pytesseract.image_to_string(im)
        except Exception as e:
            # fallback: treat as binary text
            text = contents.decode(errors="ignore")
    else:
        try:
            text = contents.decode()
        except:
            # try OCR of bytes as an image
            try:
                from PIL import Image
                im = Image.open(io.BytesIO(contents))
                text = pytesseract.image_to_string(im)
            except Exception as e:
                text = ""
    if not text:
        raise HTTPException(status_code=400, detail="No text extracted")

    # simple chunk & store in Redis list for session memory / embeddings pipeline
    chunk_size = 1500
    for i in range(0, len(text), chunk_size):
        chunk = text[i:i+chunk_size]
        r.rpush(f"doc:{user_id}", json.dumps({"chunk": chunk, "file": file.filename}))

    # simple detection: if text contains 'confidential' -> critical
    severity = None
    if "confidential" in text.lower() or "personal data" in text.lower():
        severity = "Critical"
        slack_notify(f"File {file.filename} uploaded by {user_id} flagged as {severity}", severity)
        create_jira_ticket(f"Flagged doc {file.filename}", f"Auto-detected risky content in upload by {user_id}", severity)

    return JSONResponse({"status":"ok","stored_chunks": r.llen(f"doc:{user_id}"), "severity": severity})

@app.get("/session/{user_id}")
def get_session(user_id: str):
    """Return conversation / doc chunks for a user"""
    items = r.lrange(f"session:{user_id}", 0, -1)
    return {"history": [json.loads(x) for x in items]}

@app.post("/session/save")
def save_session(user_id: str, query: str, response: str):
    r.rpush(f"session:{user_id}", json.dumps({"query": query, "response": response}))
    return {"ok": True}

# small role-based example endpoints (executive vs auditor)
@app.get("/dashboard/overview")
def overview(role: str="auditor"):
    # placeholder data
    if role=="executive":
        return {"role":"executive", "score": 92, "top_issues": [{"doc":"contract_A.pdf","severity":"High"}]}
    return {"role":"auditor", "recent_flags": [{"doc":"contract_B.pdf","severity":"Critical"}]}

# health
@app.get("/health")
def health():
    return {"status":"ok"}
PY

# create minimal README / run script
cat > README.md <<'MD'
Advisor Agent bootstrap
======================

This directory contains a minimal FastAPI backend + Docker Compose config to:
- Redis for session memory
- Tesseract OCR for scanned PDFs
- Prometheus metrics
- Grafana for dashboards
- Nginx (placeholder) for TLS termination
- Slack + Jira hooks (configure env vars)

Edit `bootstrap.sh` env top and `docker-compose.yml` replacements, then run:
  docker compose up -d --build

MD

# create a helper script to create the Docker image + run
cat > run-dev.sh <<'SH'
#!/usr/bin/env bash
docker compose up -d --build
echo "Services starting... use 'docker compose logs -f backend' to follow backend logs"
SH
chmod +x run-dev.sh

# Replace placeholders in docker-compose.yml by injecting env values
# We will use envsubst to write the actual values
echo "Writing environment file .env"
cat > .env <<ENV
REDIS_PASSWORD=${REDIS_PASSWORD}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
JIRA_URL=${JIRA_URL}
JIRA_USER=${JIRA_USER}
JIRA_API_TOKEN=${JIRA_API_TOKEN}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_KEY}
DOMAIN=${DOMAIN}
ENV

# update docker-compose to reference .env variables (already used)
echo "Project scaffolding complete."

# Print final instructions
cat <<INSTR

NEXT STEPS (manual actions required before starting):

1) Edit nginx certs:
   - If you have a domain and DNS ready, obtain certs via certbot on the host:
     sudo apt-get update && sudo apt-get install -y certbot
     sudo certbot certonly --nginx -d ${DOMAIN} -m ${ADMIN_EMAIL} --agree-tos

   - Or use DNS challenge and copy certs into ./nginx/certs/live/${DOMAIN}/

2) (Optional) If using Supabase realtime, create a table:
   CREATE TABLE session_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id TEXT,
     query TEXT,
     response TEXT,
     timestamp TIMESTAMPTZ DEFAULT NOW()
   );

3) Set environment variables inside .env (we tried to auto-create .env already).
   Ensure SLACK_WEBHOOK_URL, JIRA_* and SUPABASE_* are configured.

4) Build and run:
   ./run-dev.sh

5) Check logs:
   docker compose logs -f backend

6) Open:
   - FastAPI docs: https://${DOMAIN}/docs  (when TLS & DNS are configured)
   - Grafana: http://localhost:3000 (admin/admin)

WARNING: Let's Encrypt/certbot requires actual domain & DNS configured to the host.

INSTR
