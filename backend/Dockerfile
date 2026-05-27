# Single-stage Dockerfile for the FastAPI backend.
# Railway / Fly / Render all auto-detect this.

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install dependencies first so Docker can cache the layer.
COPY backend/requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt

# Copy the backend package.
COPY backend/ /app/backend/

EXPOSE 8000

# Railway sets $PORT; default to 8000 locally.
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
