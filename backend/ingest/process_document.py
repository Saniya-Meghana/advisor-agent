import os, hashlib, json
from ingest.ocr import ocr_pdf
from ingest.embed import chunk_text, build_index

def sha256_of_file(p):
    import hashlib
    h = hashlib.sha256()
    with open(p,"rb") as f:
        h.update(f.read())
    return h.hexdigest()

def process_pdf(filepath, outdir="vector_store"):
    os.makedirs(outdir, exist_ok=True)
    text = ocr_pdf(filepath)
    chunks = chunk_text(text)
    idx_file = build_index(chunks, out=os.path.join(outdir, os.path.basename(filepath)+".index"))
    meta = {"file": filepath, "chunks": len(chunks)}
    with open(idx_file + ".meta.json","w") as f:
        json.dump(meta,f)
    return idx_file

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python process_document.py <path-to-pdf>")
    else:
        process_pdf(sys.argv[1])
