FROM python:3.11-slim
WORKDIR /app

COPY services/infer-image/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/infer-image/main.py ./main.py

ENV PORT=8001
EXPOSE 8001
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
