# AI-Powered Compliance Document Analysis

This project is a web-based application that helps businesses analyze their compliance documents for potential risks. It uses a FastAPI backend for the risk analysis engine and a React frontend for the user interface.

## Features

- **Document Upload:** Users can upload their compliance documents (e.g., contracts, policies, legal agreements) in various formats (e.g., PDF, DOCX).
- **AI-Powered Risk Analysis:** The backend uses an AI engine to analyze the uploaded documents and identify potential risks, inconsistencies, or areas of concern.
- **Risk Scoring:** Each identified risk is assigned a severity score (e.g., low, medium, high) to help users prioritize their attention.
- **Detailed Reporting:** The application generates a comprehensive report that summarizes the identified risks, provides context-aware explanations, and suggests mitigation strategies.
- **PDF Export:** Users can export the risk analysis report as a PDF for easy sharing and record-keeping.
- **User-Friendly Interface:** The React-based frontend provides an intuitive and easy-to-use interface for uploading documents and viewing the analysis results.

## Project Structure

The project is divided into two main components:

- **`backend`:** A FastAPI application that handles the document processing, AI-powered risk analysis, and report generation.
- **`frontend`:** A React application that provides the user interface for uploading documents and displaying the analysis results.

## Getting Started

To run this project locally, you will need to have the following installed:

- Python 3.8+
- Node.js 14+
- `pip` for Python package management
- `npm` for Node.js package management

### Backend Setup

1. Navigate to the `backend` directory.
2. Install the required Python packages: `pip install -r requirements.txt`.
3. Set your OpenAI API key as an environment variable: `export OPENAI_API_KEY='your-api-key'`.
4. Run the FastAPI server: `uvicorn main:app --reload`.

### Frontend Setup

1. Navigate to the `frontend` directory.
2. Install the necessary Node.js packages: `npm install`.
3. Start the React development server: `npm start`.

Once both the backend and frontend servers are running, you can access the application at `http://localhost:3000`.

## AI Implementation Prompt

> **Task:**
> You are building a Risk & Compliance Advisor system. For **any uploaded compliance document**, perform the following steps automatically:
> 
> **1️⃣ Analyze Document Dynamically**
> 
> * Detect **all compliance risks** without hardcoding labels.
> * For each risk, extract:
> 
>   * Risk Title
>   * Severity (High / Medium / Low)
>   * Issue Description
>   * Suggested Solution (step-by-step actionable checklist)
>   * Recommended Timeline (High=30 days, Medium=60 days, Low=90 days)
> 
> **2️⃣ Generate PDFs**
> 
> * **One PDF per detected risk**, including:
> 
>   * Risk Title
>   * Severity (color-coded: Red=High, Yellow=Medium, Green=Low)
>   * Issue Description
>   * Suggested Solution checklist
>   * Timeline
> * **Summary PDF per document**, including:
> 
>   * Overall compliance score
>   * List of all risks with severity
>   * Next steps / action plan
> 
> **3️⃣ Handle Multiple Documents**
> 
> * Process **any number of uploaded PDFs** automatically.
> * Generate risk PDFs and summary PDFs for **each document**.
> * Dynamically name files:
> 
>   * `Risk_<RiskTitle>_<DocumentName>_<Date>.pdf`
>   * `Compliance_Summary_<DocumentName>_<Date>.pdf`
> 
> **4️⃣ UI Integration**
> 
> * Provide generated PDF file paths or URLs for frontend download.
> * Ensure instant availability for user download after processing.
> 
> **5️⃣ Automation & Formatting**
> 
> * Fully dynamic: no manual intervention for risk titles or document names.
> * PDFs should be **professional, readable, and structured**.
> * Optional enhancements: progress indicator, modals, secure storage, auto-cleanup.

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
