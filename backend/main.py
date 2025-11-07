import os
import datetime
import pdfplumber
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from typing import List
import shutil
import openai
from fastapi.middleware.cors import CORSMiddleware
import json
from pdf_generator import generate_risk_pdf, generate_summary_pdf

# --- Configuration ---
# REMEMBER to set your OpenAI API key as an environment variable
# For example: export OPENAI_API_KEY='your-api-key'
openai.api_key = os.environ.get("OPENAI_API_KEY")

UPLOAD_DIR = "uploads"
PDF_DIR = "generated_pdfs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PDF_DIR, exist_ok=True)

# PDF directory configuration
PDF_DIR = "generated_pdfs"

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

# PDF generation is now handled by pdf_generator.py module

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
    """Analyze document text and extract compliance risks dynamically"""
    if not openai.api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured.")

    prompt = f'''
    Analyze the following compliance document. Detect all risks dynamically.
    For each risk, return:
    - "category": Risk category/title
    - "severity": "CRITICAL", "HIGH", "MEDIUM", or "LOW"
    - "description": Detailed explanation of the issue
    - "recommendation": Actionable steps as a checklist (use \\n for separating steps)
    - "regulation": Relevant regulation (GDPR, CCPA, HIPAA, SOX, etc.)
    
    Return response as: {{"risks": [...]}}
    
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
        risks_data = json.loads(content)
        risks = risks_data.get('risks', []) if isinstance(risks_data, dict) else []
        
        # Calculate compliance score based on severity
        if risks:
            severity_scores = {"CRITICAL": 0, "HIGH": 25, "MEDIUM": 50, "LOW": 75}
            total_score = sum(severity_scores.get(r.get('severity', 'MEDIUM').upper(), 50) for r in risks)
            compliance_score = max(0, 100 - (total_score / len(risks)))
        else:
            compliance_score = 95  # No risks found
        
        return risks, int(compliance_score)

    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response.")
    except Exception as e:
        print(f"AI Analysis Error: {e}")
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
    all_results = []
    
    for file_path in saved_paths:
        document_name = os.path.splitext(os.path.basename(file_path))[0]
        text = extract_text(file_path)
        
        if not text.strip():
            continue 

        risks, compliance_score = analyze_document_text(text)
        
        risk_files = []
        if risks:
            # Generate individual risk PDFs
            risk_files = [generate_risk_pdf(risk, document_name, PDF_DIR) for risk in risks]
            all_risk_files.extend(risk_files)
        
        # Generate summary PDF
        summary_file = generate_summary_pdf(risks, document_name, compliance_score, PDF_DIR)
        all_summary_files.append(summary_file)
        
        all_results.append({
            "document": document_name,
            "compliance_score": compliance_score,
            "risk_count": len(risks),
            "risk_pdfs": risk_files,
            "summary_pdf": summary_file
        })
    
    return JSONResponse(content={
        "success": True,
        "documents_processed": len(files),
        "results": all_results,
        "all_risk_pdfs": all_risk_files,
        "all_summary_pdfs": all_summary_files,
        "message": f"{len(files)} documents analyzed successfully. Generated {len(all_risk_files)} risk reports and {len(all_summary_files)} summary reports."
    })

# Health check endpoint
@app.get("/")
def read_root():
    return {"status": "Compliance Advisor API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}
