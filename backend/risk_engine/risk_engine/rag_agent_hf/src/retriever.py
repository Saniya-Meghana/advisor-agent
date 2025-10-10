# src/retriever.py
import faiss, json
from sentence_transformers import SentenceTransformer
from pathlib import Path

class FaissRetriever:
    def __init__(self, index_path: str, docs_path: str, embed_model: str):
        self.index_path = index_path
        self.docs_path = docs_path
        self.model = SentenceTransformer(embed_model)
        self._load()

    def _load(self):
        self.index = faiss.read_index(self.index_path)
        self.docs = [json.loads(l) for l in open(self.docs_path, "r", encoding="utf-8")]
        # index.ntotal available

    def query(self, text: str, k: int = 5):
        emb = self.model.encode([text], convert_to_numpy=True)
        faiss.normalize_L2(emb)
        D, I = self.index.search(emb, k)
        results = []
        for score, idx in zip(D[0], I[0]):
            if idx == -1:
                continue
            doc = self.docs[idx]
            results.append({"score": float(score), "doc": doc})
        return results
