FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgdal-dev \
    libgeos-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/backend/
COPY configs/ /app/configs/
COPY data/ /app/data/

ENV PYTHONPATH=/app/backend

EXPOSE 8000
CMD ["uvicorn", "floodlab.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
