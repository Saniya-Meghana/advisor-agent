#!/usr/bin/env bash
docker compose up -d --build
echo "Services starting... use 'docker compose logs -f backend' to follow backend logs"
