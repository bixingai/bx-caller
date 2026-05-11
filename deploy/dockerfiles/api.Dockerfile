FROM python:3.10.13-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

EXPOSE 7001
CMD ["uvicorn", "services.api.main:app", "--host", "0.0.0.0", "--port", "7001"]
