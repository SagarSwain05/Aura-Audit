FROM python:3.11-slim

WORKDIR /app

# System deps for PDF parsing + ML libs
RUN apt-get update && apt-get install -y \
    gcc g++ libffi-dev libssl-dev libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Remove venv and cache if accidentally copied
RUN rm -rf venv __pycache__ **/__pycache__

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=15s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
