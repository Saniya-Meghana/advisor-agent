from sentence_transformers import SentenceTransformer
import faiss, numpy as np, json, os

MODEL = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
model = SentenceTransformer(MODEL)

def chunk_text(text, size=500, overlap=50):
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunks.append(" ".join(words[i:i+size]))
        i += size - overlap
    return [c for c in chunks if c.strip()]

def build_index(chunks, out="vector_store.index"):
    embs = model.encode(chunks, show_progress_bar=True)
    embs = np.array(embs).astype("float32")
    dim = embs.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embs)
    faiss.write_index(index, out)
    with open(out + ".meta.json", "w") as f:
        json.dump({"count": len(chunks)}, f)
    return out
