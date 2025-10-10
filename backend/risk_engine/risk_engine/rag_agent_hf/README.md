# RAG Agent - Hugging Face + FAISS

Contains ingestion, embedding index build, retriever, generator, and optional agentic orchestration.
Drop into your advisor-agent project or run standalone.

Quickstart:
1. pip install -r requirements.txt
2. Add docs to data/raw/
3. python -c "from src.ingest import ingest_dir; ingest_dir('data/raw','data/processed/chunks.jsonl')"
4. python -c "from src.embed_index import build_index; build_index('data/processed/chunks.jsonl')"
5. uvicorn src.api:app --reload --port 8000
