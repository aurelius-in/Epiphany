FROM python:3.11-slim
WORKDIR /app

COPY services/infer-video/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/infer-video/main.py ./main.py

ENV PORT=8002
EXPOSE 8002
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
