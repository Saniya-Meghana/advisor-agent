from pdf2image import convert_from_path
import pytesseract

def ocr_pdf(path):
    images = convert_from_path(path)
    text = []
    for img in images:
        text.append(pytesseract.image_to_string(img))
    return "\n".join(text)
