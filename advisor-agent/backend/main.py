import os
import io
import json
import base64
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
import redis
import requests
from prometheus_fastapi_instrumentator import Instrumentator
from pdf2image import convert_from_bytes
import pytesseract
from sentence_transformers import SentenceTransformer
import numpy as np
from supabase import create_client, Client

# --------------------
# Environment & Config
# --------------------
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

# Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Prometheus instrumentation
Instrumentator().instrument(app).expose(app)

# Sentence embedding model
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# --------------------
# Helper Integrations
# --------------------
def slack_notify(text: str, severity: str = "Warning"):
    if not SLACK_WEBHOOK:
        return
    payload = {
        "attachments": [{
            "color": "danger" if severity.lower() == "critical" else "warning",
            "title": f"{severity} Risk Detected",
            "text": text
        }]
    }
    try:
        requests.post(SLACK_WEBHOOK, json=payload, timeout=5)
    except Exception as e:
        print("⚠️ Slack notify failed:", e)


def create_jira_ticket(summary: str, description: str, severity: str = "High"):
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
        print("⚠️ Jira failed:", e)
        return None


def log_to_supabase(user_id: str, file: str, status: str, severity: str = None):
    try:
        supabase.table("session_logs").insert({
            "user_id": user_id,
            "file": file,
            "status": status,
            "severity": severity,
            "timestamp": datetime.utcnow().isoformat()
        }).execute()
    except Exception as e:
        print("⚠️ Supabase log failed:", e)

# --------------------
# OCR + Upload Endpoint
# --------------------
@app.post("/upload")
async def upload_doc(user_id: str, file: UploadFile = File(...)):
    """
    Uploads and ingests documents:
    - Extracts text (OCR for scanned PDFs/images)
    - Chunks and embeds text using SentenceTransformer
    - Stores chunks in Redis
    - Sends Slack & Jira alerts for risky content
    - Logs ingestion to Supabase
    """
    contents = await file.read()
    text = ""

    if file.filename.lower().endswith(".pdf"):
        try:
            images = convert_from_bytes(contents)
            for im in images:
                text += pytesseract.image_to_string(im)
        except Exception:
            text = contents.decode(errors="ignore")
    else:
        try:
            text = contents.decode()
        except:
            try:
                from PIL import Image
                im = Image.open(io.BytesIO(contents))
                text = pytesseract.image_to_string(im)
            except Exception:
                text = ""

    if not text:
        raise HTTPException(status_code=400, detail="No text extracted")

    # Chunk text & store embeddings
    chunk_size = 1500
    all_chunks = []
    for i in range(0, len(text), chunk_size):
        chunk = text[i:i+chunk_size]
        embedding = model.encode(chunk).tolist()
        all_chunks.append({"chunk": chunk, "embedding": embedding})
        r.rpush(f"doc:{user_id}", json.dumps({"chunk": chunk, "file": file.filename}))

    # Detect risk keywords
    severity = None
    if "confidential" in text.lower() or "personal data" in text.lower():
        severity = "Critical"
        slack_notify(f"⚠️ File {file.filename} uploaded by {user_id} flagged as {severity}", severity)
        create_jira_ticket(
            f"Flagged doc {file.filename}",
            f"Auto-detected risky content in upload by {user_id}",
            severity
        )

    # Log ingestion to Supabase
    log_to_supabase(user_id, file.filename, "uploaded", severity)

    # Save vector store locally
    os.makedirs("vector_store", exist_ok=True)
    vec_path = f"vector_store/{file.filename}.json"
    with open(vec_path, "w") as f:
        json.dump(all_chunks, f)

    return JSONResponse({
        "status": "ok",
        "stored_chunks": len(all_chunks),
        "severity": severity,
        "file": file.filename
    })


# --------------------
# Session Memory APIs
# --------------------
@app.get("/session/{user_id}")
def get_session(user_id: str):
    items = r.lrange(f"session:{user_id}", 0, -1)
    return {"history": [json.loads(x) for x in items]}


@app.post("/session/save")
def save_session(user_id: str, query: str, response: str):
    r.rpush(f"session:{user_id}", json.dumps({"query": query, "response": response}))
    return {"ok": True}


# --------------------
# Dashboards & Health
# --------------------
@app.get("/dashboard/overview")
def overview(role: str = "auditor"):
    if role == "executive":
        return {
            "role": "executive",
            "score": 92,
            "top_issues": [{"doc": "contract_A.pdf", "severity": "High"}]
        }
    return {
        "role": "auditor",
        "recent_flags": [{"doc": "contract_B.pdf", "severity": "Critical"}]
    }


@app.get("/health")
def health():
    return {"status": "ok"}
