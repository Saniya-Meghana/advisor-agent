FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN apt-get update && apt-get install -y \
    tesseract-ocr poppler-utils build-essential libpq-dev \
    && pip install --upgrade pip \
    && pip install -r /app/requirements.txt \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ✅ Copy your backend code, including ingest/
COPY . /app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
