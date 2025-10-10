# src/ingest.py
import json
from pathlib import Path
from tqdm import tqdm
from .utils import read_text_from_file, chunk_text

def ingest_dir(input_dir: str, out_jsonl: str, chunk_size=800, overlap=128):
    input_dir = Path(input_dir)
    docs = []
    for p in input_dir.glob("**/*"):
        if p.is_file():
            try:
                text = read_text_from_file(p)
                chunks = chunk_text(text, chunk_size=chunk_size, overlap=overlap)
                for i, c in enumerate(chunks):
                    docs.append({
                        "id": f"{p.stem}_{i}",
                        "source": str(p),
                        "text": c
                    })
            except Exception as e:
                print(f"failed to read {p}: {e}")
    outp = Path(out_jsonl)
    outp.parent.mkdir(parents=True, exist_ok=True)
    with open(out_jsonl, "w", encoding="utf-8") as f:
        for doc in docs:
            f.write(json.dumps(doc, ensure_ascii=False) + "\n")
    print(f"wrote {len(docs)} chunks to {out_jsonl}")
