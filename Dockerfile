# Single-container deployment for ModelScope Docker Studios (port 7860).
FROM node:24-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_BASE_URL=/api
RUN npm run build

FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FRONTEND_DIST=/app/frontend-dist \
    APP_DATA_DIR=/mnt/workspace/maybe \
    LLM_PROVIDER=openai
WORKDIR /app
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend /frontend/dist /app/frontend-dist
COPY deploy/start-studio.py ./start-studio.py
EXPOSE 7860
CMD ["python", "start-studio.py"]
