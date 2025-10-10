
from fastapi import APIRouter, HTTPException
from firebase_admin import app_check
from pydantic import BaseModel

router = APIRouter()

class AppCheckRequest(BaseModel):
    app_id: str

@router.post("/app-check-token")
async def create_app_check_token(request: AppCheckRequest):
    try:
        # Create a custom token
        app_check_token = app_check.create_token(request.app_id.encode('utf-8'))
        return {"token": app_check_token.token.decode('utf-8'), "ttl": app_check_token.ttl}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
