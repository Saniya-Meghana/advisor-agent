# backend/auth/supabase_auth.py
import os
import jwt
from fastapi import HTTPException, Header
from jwt import PyJWKClient

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

def verify_supabase_token(token: str):
    try:
        decoded = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
        return decoded
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_current_user(authorization: str = Header(...)):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization scheme")
    token = authorization.replace("Bearer ", "")
    user = verify_supabase_token(token)
    return user
