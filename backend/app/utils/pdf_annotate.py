import fitz

def annotate_pdf(in_path, annotations, out_path):
    doc = fitz.open(in_path)
    for ann in annotations:
        page = doc[ann["page"]]
        rect = fitz.Rect(*ann["rect"])
        highlight = page.add_highlight_annot(rect)
        if "note" in ann:
            page.add_text_annot(rect.tl, ann["note"])
        highlight.update()
    doc.save(out_path)
    doc.close()
