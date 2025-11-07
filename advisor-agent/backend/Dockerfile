FROM python:3.11-slim

WORKDIR /app

# Install system packages needed for pdfplumber (poppler-utils provides pdftotext)
RUN apt-get update && apt-get install -y \
    build-essential \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker caching
COPY requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Force install pdfplumber even if missing in requirements
RUN pip install --no-cache-dir pdfplumber

# Copy backend source code
COPY . /app

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
