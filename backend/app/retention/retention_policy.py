from datetime import datetime, timedelta, timezone
from app.db import Session
from app.models import Document

def apply_default_retention(doc, years=7):
    doc.retention_until = datetime.now(timezone.utc) + timedelta(days=365*years)

def enforce_retention():
    with Session() as s:
        now = datetime.now(timezone.utc)
        expired = s.query(Document).filter(Document.retention_until <= now).all()
        for doc in expired:
            # Archive to S3, cold storage, etc.
            print(f"Archiving expired document {doc.filename}")
            # Example: archive_to_s3(doc.s3_key)
            s.delete(doc)
        s.commit()
