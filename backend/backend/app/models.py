from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, func
from sqlalchemy.orm import declarative_base
Base = declarative_base()

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    filename = Column(String)
    author = Column(String, nullable=True)
    jurisdiction = Column(String, nullable=True)
    s3_key = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    retention_until = Column(DateTime(timezone=True))
    version = Column(Integer, default=1)
    hash = Column(String, nullable=True)

class AuditEntry(Base):
    __tablename__ = "audit_entries"
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    actor = Column(String)
    action = Column(String)
    payload = Column(Text)
    sha256 = Column(String)
    previous_hash = Column(String)
    hmac_signature = Column(String)
