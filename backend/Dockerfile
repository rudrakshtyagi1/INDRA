FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend code into /app
COPY . /app

# The python path needs to resolve 'floodlab'
ENV PYTHONPATH=/app
ENV DATA_DIR="/data/processed/tehri_simulations"

EXPOSE 8000

CMD ["uvicorn", "floodlab.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
