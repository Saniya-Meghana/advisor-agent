# src/embed_index.py
import json
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from pathlib import Path
import os
import yaml

DEFAULT_CONFIG = "config.yaml"

def load_config(path=DEFAULT_CONFIG):
    import yaml
    with open(path, "r") as f:
        return yaml.safe_load(f)

def build_index(docs_jsonl: str, config_path: str = DEFAULT_CONFIG):
    cfg = load_config(config_path)
    model_name = cfg["embed_model"]
    dim = cfg["embed_dim"]
    index_path = cfg["faiss_index_path"]
    docs_out = cfg["docs_store_path"]

    model = SentenceTransformer(model_name)
    texts = []
    metas = []
    with open(docs_jsonl, "r", encoding="utf-8") as f:
        for line in f:
            j = json.loads(line)
            texts.append(j["text"])
            metas.append(j)

    emb = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
    # normalize for cosine using inner product
    faiss.normalize_L2(emb)

    # ensure models dir exists
    Path(index_path).parent.mkdir(parents=True, exist_ok=True)

    index = faiss.IndexFlatIP(dim)
    index.add(emb)
    faiss.write_index(index, index_path)

    # save metas in docs_out
    with open(docs_out, "w", encoding="utf-8") as f:
        for m in metas:
            f.write(json.dumps(m, ensure_ascii=False) + "\n")
    print("Built index (n = {}) and saved to {}".format(index.ntotal, index_path))
