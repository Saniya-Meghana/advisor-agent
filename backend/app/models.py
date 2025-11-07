# backend/app/models.py
from sqlalchemy import Column, Integer, String, Text, DateTime, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()

# 🗄️ Documents table (for uploaded files, retention, etc.)
class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    author = Column(String, nullable=True)
    jurisdiction = Column(String, nullable=True)
    s3_key = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    retention_until = Column(DateTime(timezone=True), nullable=True)
    version = Column(Integer, default=1)
    hash = Column(String, nullable=True)

# 🔐 Immutable audit trail
class AuditEntry(Base):
    __tablename__ = "audit_entries"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    actor = Column(String(128))
    action = Column(String(256))
    payload = Column(Text)
    sha256 = Column(String(128))
    previous_hash = Column(String(128), nullable=True)
    hmac_signature = Column(String(256), nullable=True)
