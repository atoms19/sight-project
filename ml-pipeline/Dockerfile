# Dockerfile for ML Agent
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY nilm/   ./nilm/
COPY anomaly/ ./anomaly/
COPY agent.py .

ENV PYTHONPATH=/app

CMD ["python", "agent.py"]
