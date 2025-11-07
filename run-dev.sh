#!/bin/bash

set -e

echo "🚀 Starting AI Compliance Advisor Stack..."

# Ensure Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker daemon not running. Please start Docker Desktop."
  exit 1
fi

# Create necessary directories
mkdir -p nginx/certs prometheus/data grafana/data uploads

# Export environment variables
export $(grep -v '^#' .env | xargs)

# Build and start containers
docker compose up --build -d

echo ""
echo "✅ All services are starting..."
echo "🌐 FastAPI: http://localhost:8000"
echo "📊 Grafana: http://localhost:3000 (user: admin / pass: admin)"
echo "🧠 Prometheus: http://localhost:9090"
echo "🧰 Nginx Reverse Proxy: http://localhost"
echo ""
echo "Check logs using: docker compose logs -f backend"

