FROM python:3.10.13-slim

WORKDIR /app
COPY services/ui /app

EXPOSE 3000
CMD ["python", "-m", "http.server", "3000"]
