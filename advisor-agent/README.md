Advisor Agent bootstrap
======================

This directory contains a minimal FastAPI backend + Docker Compose config to:
- Redis for session memory
- Tesseract OCR for scanned PDFs
- Prometheus metrics
- Grafana for dashboards
- Nginx (placeholder) for TLS termination
- Slack + Jira hooks (configure env vars)

Edit `bootstrap.sh` env top and `docker-compose.yml` replacements, then run:
  docker compose up -d --build

