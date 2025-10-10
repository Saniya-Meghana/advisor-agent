import os
import datetime
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import red, yellow, green, black
import pdfplumber
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import List
import shutil
import openai  # Or your AI integration
from fastapi.middleware.cors import CORSMiddleware
import json

# --- Configuration ---
# REMEMBER to set your OpenAI API key as an environment variable
# For example: export OPENAI_API_KEY='your-api-key'
openai.api_key = os.environ.get("OPENAI_API_KEY")

UPLOAD_DIR = "uploads"
PDF_DIR = "generated_pdfs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PDF_DIR, exist_ok=True)

SEVERITY_COLOR = {"High": red, "Medium": yellow, "Low": green}

app = FastAPI()

# Configure CORS to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update with your frontend URL
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Mount the directory to serve generated PDFs
app.mount("/generated_pdfs", StaticFiles(directory=PDF_DIR), name="generated_pdfs")

# --- PDF Functions ---
def generate_risk_pdf(risk, document_name):
    date_str = datetime.datetime.now().strftime("%Y%m%d")
    filename = os.path.join(PDF_DIR, f"Risk_{risk['Risk Title'].replace(' ','_')}_{document_name}_{date_str}.pdf")
    
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4
    
    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, f"Risk Report: {risk['Risk Title']}")
    
    # Severity
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(SEVERITY_COLOR.get(risk['Severity'], black))
    c.drawString(50, height - 80, f"Severity: {risk['Severity']}")
    c.setFillColor(black) # Reset color
    
    # Description
    c.setFont("Helvetica", 12)
    text_object = c.beginText(50, height - 110)
    text_object.setFont("Helvetica-Bold", 12)
    text_object.textLine("Issue Description:")
    text_object.setFont("Helvetica", 12)
    lines = risk['Description'].split('\n')
    for line in lines:
        text_object.textLine(line)
    c.drawText(text_object)
    
    # Solution
    solution_y = text_object.getY() - 20
    text_object = c.beginText(50, solution_y)
    text_object.setFont("Helvetica-Bold", 12)
    text_object.textLine("Suggested Solution (Checklist):")
    text_object.setFont("Helvetica", 12)
    solution_items = risk['Suggested Solution'].split('\n')
    for item in solution_items:
        text_object.textLine(f"☐ {item}")
    c.drawText(text_object)

    # Timeline
    timeline_y = text_object.getY() - 30
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, timeline_y, f"Recommended Timeline: {risk['Recommended Timeline']}")
    
    c.save()
    return filename

def generate_summary_pdf(risks, document_name, compliance_score):
    date_str = datetime.datetime.now().strftime("%Y%m%d")
    filename = os.path.join(PDF_DIR, f"Compliance_Summary_{document_name}_{date_str}.pdf")
    
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, f"Compliance Summary: {document_name}")
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, height - 90, f"Overall Compliance Score: {compliance_score}%")
    
    y = height - 130
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, "Detected Risks:")
    y -= 20

    c.setFont("Helvetica", 12)
    for risk in risks:
        c.setFillColor(SEVERITY_COLOR.get(risk['Severity'], black))
        c.drawString(70, y, f"• {risk['Risk Title']} (Severity: {risk['Severity']})")
        y -= 20
        if y < 100: # Add new page if content overflows
            c.showPage()
            y = height - 50

    c.setFillColor(black)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y - 30, "Next Steps:")
    c.setFont("Helvetica", 12)
    c.drawString(70, y - 50, "Implement suggested solutions for all identified risks.")
    
    c.save()
    return filename

# --- Text extraction ---
def extract_text(pdf_path):
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text from PDF: {e}")

# --- AI Risk Analysis ---
def analyze_document_text(text):
    if not openai.api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable.")

    prompt = f'''
    Analyze the following compliance document. Detect all risks dynamically.
    For each risk, return:
    - "Risk Title": A short, descriptive title for the risk.
    - "Severity": "High", "Medium", or "Low".
    - "Description": A detailed explanation of the issue.
    - "Suggested Solution": An actionable, step-by-step checklist formatted as a single string with newline characters (\n) separating steps.
    - "Recommended Timeline": "30 days" for High, "60 days" for Medium, "90 days" for Low.
    
    Return your response as a valid JSON array of objects.
    
    Document content:
    """
    {text}
    """
    '''
    
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message['content']
        # The model might return a JSON object with a key like "risks"
        risks = json.loads(content)
        return risks.get('risks', []) if isinstance(risks, dict) else risks

    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        print(f"Received content: {content}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response as JSON.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail=f"Error during AI analysis: {e}")


# --- Main API Route ---
@app.post("/upload_documents/")
async def upload_documents(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files were uploaded.")

    saved_paths = []
    for file in files:
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_paths.append(file_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {e}")

    all_risk_files = []
    all_summary_files = []
    
    for file_path in saved_paths:
        document_name = os.path.splitext(os.path.basename(file_path))[0]
        text = extract_text(file_path)
        
        if not text.strip():
            # If text is empty, you might want to skip or handle it
            continue 

        risks = analyze_document_text(text)
        
        if risks:
            risk_files = [generate_risk_pdf(risk, document_name) for risk in risks]
            summary_file = generate_summary_pdf(risks, document_name, compliance_score=45) # Placeholder score
            
            all_risk_files.extend(risk_files)
            all_summary_files.append(summary_file)
    
    return JSONResponse(content={
        "risk_pdfs": all_risk_files,
        "summary_pdfs": all_summary_files,
        "message": f"{len(files)} documents processed successfully."
    })

# Health check endpoint
@app.get("/")
def read_root():
    return {"status": "Compliance Advisor API is running"}
