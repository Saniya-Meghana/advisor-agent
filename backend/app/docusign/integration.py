import os, base64, requests
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/docusign", tags=["DocuSign"])

BASE_URL = "https://demo.docusign.net/restapi"
ACCOUNT_ID = os.getenv("DOCUSIGN_ACCOUNT_ID")
ACCESS_TOKEN = os.getenv("DOCUSIGN_ACCESS_TOKEN")

class SignRequest(BaseModel):
    signer_name: str
    signer_email: str
    document_path: str

@router.post("/send")
def send_envelope(req: SignRequest):
    with open(req.document_path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    payload = {
        "emailSubject": "Please sign the document",
        "documents": [{
            "documentBase64": data, "name": "doc.pdf",
            "fileExtension": "pdf", "documentId": "1"}],
        "recipients": {"signers": [{
            "email": req.signer_email, "name": req.signer_name,
            "recipientId": "1", "routingOrder": "1",
            "tabs": {"signHereTabs": [{"xPosition": "100","yPosition":"600",
                                        "documentId":"1","pageNumber":"1"}]}
        }]},
        "status": "sent"
    }
    r = requests.post(
        f"{BASE_URL}/v2.1/accounts/{ACCOUNT_ID}/envelopes",
        headers={"Authorization": f"Bearer {ACCESS_TOKEN}"},
        json=payload)
    r.raise_for_status()
    return r.json()
