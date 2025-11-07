import faiss, json, numpy as np
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

def retrieve(query, path, top_k=5):
    index = faiss.read_index(path + ".index")
    with open(path + ".meta.json") as f: meta = json.load(f)
    q = model.encode([query], convert_to_numpy=True)
    faiss.normalize_L2(q)
    D, I = index.search(q, top_k)
    return [meta[i] for i in I[0]]
