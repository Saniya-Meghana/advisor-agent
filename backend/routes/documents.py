# backend/routes/documents.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth.supabase_auth import get_current_user
from db.supabase_client import download_doc

router = APIRouter(prefix="/documents", tags=["documents"])

class DocumentIn(BaseModel):
    doc_path: str

@router.post("/download")
def download(d: DocumentIn, user = Depends(get_current_user)):
    try:
        user_id = user["sub"]
        res = download_doc(user_id, d.doc_path)
        return {"data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
