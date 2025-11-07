# Drop this snippet into your backend app startup (e.g., app/main.py)
# Requires: pip install prometheus-fastapi-instrumentator
from prometheus_fastapi_instrumentator import Instrumentator

def instrument_app(app):
    Instrumentator().instrument(app).expose(app, endpoint="/metrics")
# usage:
# from instrumentation_snippet import instrument_app
# instrument_app(app)
