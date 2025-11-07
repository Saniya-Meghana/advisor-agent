from sentence_transformers import SentenceTransformer
import faiss, json, numpy as np

EMBED_MODEL = "all-MiniLM-L6-v2"
model = SentenceTransformer(EMBED_MODEL)

def chunk_text(text, chunk_size=800, overlap=100):
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunks.append(" ".join(words[i:i+chunk_size]))
    return chunks

def build_index(chunks, meta, out_path):
    embs = model.encode(chunks, convert_to_numpy=True, show_progress_bar=True)
    faiss.normalize_L2(embs)
    index = faiss.IndexFlatIP(embs.shape[1])
    index.add(embs)
    faiss.write_index(index, out_path + ".index")
    with open(out_path + ".meta.json","w") as f: json.dump(meta,f)
