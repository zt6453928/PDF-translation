FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies for ReportLab if needed
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       libfreetype6-dev \
       libjpeg-dev \
       zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Zeabur/Heroku style: platform sets $PORT
ENV PORT=8000
EXPOSE 8000

CMD ["/bin/sh", "-c", "gunicorn -w 2 -k gthread -t 120 -b 0.0.0.0:${PORT} app:app"]

