import os
from fastapi import FastAPI
import firebase_admin
from firebase_admin import credentials
from routes.rag import router as rag_router
from routes.risk import router as risk_router
from routes.documents import router as documents_router
from routes.app_check import router as app_check_router

# Initialize Firebase Admin SDK
cred = credentials.Certificate(os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY_PATH"))
firebase_admin.initialize_app(cred)

app = FastAPI(title="Risk Engine API")

app.include_router(rag_router)
app.include_router(risk_router)
app.include_router(documents_router)
app.include_router(app_check_router)

@app.get("/")
def read_root():
    return {"status": "ok"}
