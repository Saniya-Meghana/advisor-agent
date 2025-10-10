# routes/risk.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from risk_engine.risk_analysis import analyze_risk
from auth.supabase_auth import get_current_user

router = APIRouter(prefix="/risk", tags=["risk"])

class RiskIn(BaseModel):
    text: str

@router.post("/analyze")
def analyze(q: RiskIn, user = Depends(get_current_user)):
    return analyze_risk(q.text)
