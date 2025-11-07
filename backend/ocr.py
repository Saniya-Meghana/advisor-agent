from pdf2image import convert_from_path
import pytesseract

def extract_text_from_scanned_pdf(pdf_path):
    images = convert_from_path(pdf_path)
    text = "\n".join(pytesseract.image_to_string(img) for img in images)
    return text
