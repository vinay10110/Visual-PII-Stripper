# ---------- Stage 1: Builder ----------
    FROM python:3.11-slim as builder

    WORKDIR /app
    
    # Install system deps (only those required for wheels build)
    RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential cmake pkg-config git wget curl ffmpeg \
        libgl1 libglib2.0-0 \
        && rm -rf /var/lib/apt/lists/*
    
    # Copy requirements
    COPY requirements.txt .
    
    # Install Python deps into /install
    RUN pip install --upgrade pip \
     && pip install --no-cache-dir --prefix=/install -r requirements.txt
    
    # ---------- Stage 2: Runtime ----------
    FROM python:3.11-slim
    
    WORKDIR /app
    
    # Install minimal runtime system deps (no build tools!)
    RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 ffmpeg \
        && rm -rf /var/lib/apt/lists/*
    
    # Copy Python packages from builder
    COPY --from=builder /install /usr/local
    
    # Copy application code
    COPY . .
    
    # Environment variables
    ENV HF_HOME=/root/.cache/huggingface \
        TRANSFORMERS_CACHE=/root/.cache/huggingface/transformers \
        PADDLEOCR_HOME=/root/.paddleocr \
        INSIGHTFACE_HOME=/root/.insightface
    
    # Create volumes for model caching (not baked into image!)
    VOLUME /root/.cache/huggingface
    VOLUME /root/.paddleocr
    VOLUME /root/.insightface
    
    EXPOSE 8000
    
    HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
      CMD curl -f http://localhost:8000/docs || exit 1
    
    CMD ["python", "app.py"]
    