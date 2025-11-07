Files created by scripts/setup-ci-tests.sh:
- .github/workflows/ci.yml
- backend/Dockerfile
- frontend/Dockerfile
- docker-compose.yml
- pytest.ini
- tests/backend/test_basic.py
- backend/tests/test_upload.py
- frontend/playwright.config.ts
- frontend/playwright/tests/auth.spec.ts
- backend/instrumentation_snippet.py

Next steps:
1. Adjust test import paths if your backend app module path differs.
2. Add a /health endpoint in FastAPI or update tests to use an existing endpoint.
3. Commit these files and open a PR to run GitHub Actions.
4. Install Playwright deps locally with: (in frontend) `npm ci && npx playwright install --with-deps`
