FROM python:3.11-slim
WORKDIR /app

COPY services/edit/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/edit/main.py ./main.py

ENV PORT=8003
EXPOSE 8003
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
