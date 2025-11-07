import hashlib, hmac, os, json
from datetime import datetime
from sqlalchemy import Column, Integer, Text, DateTime, String
from app.db import Base, Session

HMAC_KEY = os.getenv("AUDIT_HMAC_KEY", "change_me")

class AuditEntry(Base):
    __tablename__ = "audit_entries"
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    actor = Column(String(128))
    action = Column(String(256))
    payload = Column(Text)
    sha256 = Column(String(128))
    previous_hash = Column(String(128), nullable=True)
    hmac_signature = Column(String(256), nullable=True)

def compute_hash(prev_hash, created_at, actor, action, payload):
    s = f"{prev_hash or ''}|{created_at.isoformat()}|{actor}|{action}|{payload}"
    h = hashlib.sha256(s.encode()).hexdigest()
    sig = hmac.new(HMAC_KEY.encode(), h.encode(), hashlib.sha256).hexdigest()
    return h, sig

def append_audit(actor, action, payload):
    from app.db import Session
    data = json.dumps(payload, sort_keys=True)
    with Session() as s:
        last = s.query(AuditEntry).order_by(AuditEntry.id.desc()).first()
        prev = last.sha256 if last else None
        now = datetime.utcnow()
        h, sig = compute_hash(prev, now, actor, action, data)
        entry = AuditEntry(actor=actor, action=action, payload=data,
                           sha256=h, previous_hash=prev, hmac_signature=sig)
        s.add(entry)
        s.commit()
        return entry.id
