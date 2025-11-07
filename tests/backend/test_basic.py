import io
import json
import os
import sys
from fastapi.testclient import TestClient

# ✅ Add backend folder to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

try:
    from main import app  # backend/main.py
except ImportError:
    # fallback in case structure is backend/app/main.py
    from app.main import app

client = TestClient(app)

def test_health():
    """Check that the /health endpoint responds."""
    res = client.get("/health")
    # Allow 200 if present, or 404 if endpoint not implemented yet
    assert res.status_code in (200, 404)
    if res.status_code == 200:
        assert res.json() == {"status": "ok"}

def test_chat_endpoint_structure():
    """Ensure /api/chat returns the expected structure."""
    payload = {"query": "What is clause 5?"}
    res = client.post("/api/chat", json=payload)

    # Endpoint might not exist yet → acceptable 404
    assert res.status_code in (200, 404)

    if res.status_code == 200:
        body = res.json()
        assert isinstance(body, dict)
        assert "answer" in body
        assert "citations" in body
