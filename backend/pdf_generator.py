import os
import datetime
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import red, yellow, green, black
from reportlab.lib.units import inch

SEVERITY_COLOR = {"HIGH": red, "CRITICAL": red, "MEDIUM": yellow, "LOW": green}

def generate_risk_pdf(risk, document_name, output_dir="generated_pdfs"):
    """Generate a PDF for a single risk with color-coded severity and checklist"""
    os.makedirs(output_dir, exist_ok=True)
    date_str = datetime.datetime.now().strftime("%Y%m%d")
    
    # Sanitize risk title for filename
    risk_title = risk.get('category', 'Risk').replace(' ', '_').replace('/', '_')
    filename = os.path.join(output_dir, f"Risk_{risk_title}_{document_name}_{date_str}.pdf")
    
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4
    y_position = height - 50
    
    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y_position, f"Risk Report: {risk.get('category', 'Unknown Risk')}")
    y_position -= 40
    
    # Severity with color
    c.setFont("Helvetica-Bold", 12)
    severity = risk.get('severity', 'MEDIUM').upper()
    c.setFillColor(SEVERITY_COLOR.get(severity, black))
    c.drawString(50, y_position, f"Severity: {severity}")
    c.setFillColor(black)
    y_position -= 40
    
    # Description
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y_position, "Issue Description:")
    y_position -= 20
    c.setFont("Helvetica", 11)
    
    description = risk.get('description', 'No description available')
    # Wrap text
    wrapped_lines = wrap_text(description, width - 100)
    for line in wrapped_lines:
        if y_position < 100:
            c.showPage()
            y_position = height - 50
        c.drawString(50, y_position, line)
        y_position -= 15
    
    y_position -= 10
    
    # Suggested Solution as Checklist
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y_position, "Suggested Solution (Checklist):")
    y_position -= 20
    c.setFont("Helvetica", 11)
    
    recommendation = risk.get('recommendation', 'Review and implement best practices')
    solution_items = recommendation.split('\n') if '\n' in recommendation else [recommendation]
    
    for item in solution_items:
        if y_position < 100:
            c.showPage()
            y_position = height - 50
        c.drawString(70, y_position, f"☐ {item.strip()}")
        y_position -= 20
    
    y_position -= 10
    
    # Timeline
    c.setFont("Helvetica-Bold", 12)
    timeline = get_timeline_from_severity(severity)
    c.drawString(50, y_position, f"Recommended Timeline: {timeline}")
    y_position -= 20
    
    # Regulation Reference
    if risk.get('regulation'):
        c.setFont("Helvetica", 10)
        c.setFillColor(black)
        c.drawString(50, y_position, f"Regulation: {risk.get('regulation')}")
    
    c.save()
    return filename

def generate_summary_pdf(risks, document_name, compliance_score, output_dir="generated_pdfs"):
    """Generate a summary PDF with all risks and overall compliance score"""
    os.makedirs(output_dir, exist_ok=True)
    date_str = datetime.datetime.now().strftime("%Y%m%d")
    filename = os.path.join(output_dir, f"Compliance_Summary_{document_name}_{date_str}.pdf")
    
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4
    y_position = height - 50
    
    # Title
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, y_position, f"Compliance Summary: {document_name}")
    y_position -= 50
    
    # Overall Compliance Score
    c.setFont("Helvetica-Bold", 14)
    score_color = get_score_color(compliance_score)
    c.setFillColor(score_color)
    c.drawString(50, y_position, f"Overall Compliance Score: {compliance_score}%")
    c.setFillColor(black)
    y_position -= 40
    
    # Risk Level
    risk_level = get_risk_level(compliance_score)
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(get_risk_level_color(risk_level))
    c.drawString(50, y_position, f"Risk Level: {risk_level}")
    c.setFillColor(black)
    y_position -= 50
    
    # Detected Risks
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y_position, "Detected Risks:")
    y_position -= 25
    
    c.setFont("Helvetica", 11)
    for i, risk in enumerate(risks, 1):
        if y_position < 100:
            c.showPage()
            y_position = height - 50
        
        severity = risk.get('severity', 'MEDIUM').upper()
        c.setFillColor(SEVERITY_COLOR.get(severity, black))
        c.drawString(70, y_position, f"• {risk.get('category', 'Unknown')} (Severity: {severity})")
        c.setFillColor(black)
        y_position -= 20
    
    y_position -= 20
    
    # Next Steps
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y_position, "Next Steps:")
    y_position -= 20
    c.setFont("Helvetica", 11)
    c.drawString(70, y_position, "• Implement suggested solutions for all identified risks")
    y_position -= 20
    c.drawString(70, y_position, "• Review detailed risk PDFs for specific action items")
    y_position -= 20
    c.drawString(70, y_position, "• Schedule follow-up compliance assessment")
    
    c.save()
    return filename

def wrap_text(text, max_width, font_size=11):
    """Wrap text to fit within a given width"""
    words = text.split()
    lines = []
    current_line = []
    current_width = 0
    
    for word in words:
        word_width = len(word) * font_size * 0.6
        if current_width + word_width < max_width:
            current_line.append(word)
            current_width += word_width
        else:
            lines.append(' '.join(current_line))
            current_line = [word]
            current_width = word_width
    
    if current_line:
        lines.append(' '.join(current_line))
    
    return lines

def get_timeline_from_severity(severity):
    """Get recommended timeline based on severity"""
    timelines = {
        "CRITICAL": "Immediate (7 days)",
        "HIGH": "30 days",
        "MEDIUM": "60 days",
        "LOW": "90 days"
    }
    return timelines.get(severity.upper(), "60 days")

def get_score_color(score):
    """Get color based on compliance score"""
    if score >= 80:
        return green
    elif score >= 60:
        return yellow
    else:
        return red

def get_risk_level(score):
    """Determine risk level from compliance score"""
    if score >= 80:
        return "LOW"
    elif score >= 60:
        return "MEDIUM"
    elif score >= 40:
        return "HIGH"
    else:
        return "CRITICAL"

def get_risk_level_color(risk_level):
    """Get color for risk level"""
    return SEVERITY_COLOR.get(risk_level.upper(), black)
