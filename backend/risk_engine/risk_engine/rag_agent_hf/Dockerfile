FROM python:3.10-slim

WORKDIR /app
COPY . /app

RUN apt-get update && \
    apt-get install -y build-essential libsndfile1 ffmpeg && \
    pip install --upgrade pip && \
    pip install -r requirements.txt

EXPOSE 8000
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000"]
