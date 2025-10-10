# src/api.py
import yaml
from fastapi import FastAPI
from pydantic import BaseModel
from .retriever import FaissRetriever
from .generator import load_generator, answer_with_context
from .agentic_agent import RAGAgent

cfg = yaml.safe_load(open("config.yaml", "r"))

EMBED_MODEL = cfg["embed_model"]
INDEX_PATH = cfg["faiss_index_path"]
DOCS_PATH = cfg["docs_store_path"]
GEN_MODEL = cfg["generator_model"]
GEN_DEVICE = cfg.get("generator_device", -1)
USE_AGENT = cfg.get("use_agentic", False)

app = FastAPI(title="RAG Compliance Agent")

# instantiate components
RETRIEVER = FaissRetriever(INDEX_PATH, DOCS_PATH, EMBED_MODEL)
GENERATOR = load_generator(GEN_MODEL, device=GEN_DEVICE)
AGENT = RAGAgent(GEN_MODEL, RETRIEVER) if USE_AGENT else None

class QueryIn(BaseModel):
    question: str
    k: int = 5
    use_agent: bool = False

@app.post("/query")
def query(q: QueryIn):
    results = RETRIEVER.query(q.question, k=q.k)
    answer = answer_with_context(GENERATOR, q.question, results)
    return {"answer": answer, "retrieved": results}

@app.post("/agent-query")
def agent_query(q: QueryIn):
    if not USE_AGENT:
        return {"error": "agentic mode disabled in config"}
    out = AGENT.run(q.question)
    return {"agent_output": out}
