import re
from pathlib import Path
from typing import List
import pdfminer.high_level
import docx
import os

def read_text_from_file(path: str) -> str:
    p = Path(path)
    suffix = p.suffix.lower()
    if suffix == ".pdf":
        return pdfminer.high_level.extract_text(str(p))
    elif suffix in [".docx", ".doc"]:
        doc = docx.Document(str(p))
        return "\\n".join([p.text for p in doc.paragraphs])
    else:
        return p.read_text(encoding="utf-8", errors="ignore")

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 128) -> List[str]:
    # split into sentences using simple regex, then group into chunks approx chunk_size
    sents = re.split(r'(?<=[\.\\?\\!\\n])\\s+', text)
    chunks = []
    cur = []
    cur_len = 0
    for sent in sents:
        l = len(sent.split())
        if cur_len + l > chunk_size and cur:
            chunks.append(" ".join(cur).strip())
            # start new chunk with overlap
            if overlap > 0:
                # keep last overlap words
                overlap_words = " ".join(" ".join(cur).split()[-overlap:])
                cur = [overlap_words]
                cur_len = len(overlap_words.split())
            else:
                cur = []
                cur_len = 0
        cur.append(sent)
        cur_len += l
    if cur:
        chunks.append(" ".join(cur).strip())
    # final cleanup: remove empty
    return [c for c in chunks if len(c) > 10]
