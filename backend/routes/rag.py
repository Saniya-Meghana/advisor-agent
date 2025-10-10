# routes/rag.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import yaml
from risk_engine.rag_agent_hf.src.retriever import FaissRetriever
from risk_engine.rag_agent_hf.src.generator import load_generator, answer_with_context
from risk_engine.rag_agent_hf.src.agentic_agent import RAGAgent
from auth.supabase_auth import get_current_user

cfg = yaml.safe_load(open("risk_engine/rag_agent_hf/config.yaml", "r"))
RETRIEVER = FaissRetriever(cfg["faiss_index_path"], cfg["docs_store_path"], cfg["embed_model"])
GENERATOR = load_generator(cfg["generator_model"], device=cfg.get("generator_device", -1))
AGENT = RAGAgent(cfg["generator_model"], RETRIEVER) if cfg.get("use_agentic", False) else None

router = APIRouter(prefix="/rag", tags=["rag"])

class QueryIn(BaseModel):
    question: str
    k: int = 5
    use_agent: bool = False

@router.post("/query")
def query(q: QueryIn, user = Depends(get_current_user)):
    try:
        results = RETRIEVER.query(q.question, k=q.k)
        answer = answer_with_context(GENERATOR, q.question, results)
        return {"answer": answer, "retrieved": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agent")
def agent_query(q: QueryIn, user = Depends(get_current_user)):
    if AGENT is None:
        raise HTTPException(status_code=400, detail="Agent not configured")
    return {"agent_output": AGENT.run(q.question)}
