# CPU inference (no NVIDIA GPU required on the server)
# Build from repo root: docker build -f docker/Dockerfile -t alertness-api:cpu .
#
# Weights are NOT copied into the image. After training, mount your checkpoint, e.g.:
#   yolov5/runs/train/exp2/weights/best.pt  ->  /weights/best.pt  (read-only)
# Or: python docker_build.py run cpu -w yolov5/runs/train/exp2/weights/best.pt
#
# Inference uses ultralytics/yolov5 via torch.hub (YOLOv5 checkpoints), not ultralytics YOLOv8.

FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV YOLOV5_ROOT=/app/yolov5
ENV YOLO_CONFIG_DIR=/tmp

RUN git clone --depth 1 https://github.com/ultralytics/yolov5.git /app/yolov5 \
 && pip install --no-cache-dir -r /app/yolov5/requirements.txt \
 && pip install --no-cache-dir --force-reinstall torch torchvision --index-url https://download.pytorch.org/whl/cpu \
 && pip uninstall -y opencv-python \
 && pip install --no-cache-dir opencv-python-headless

COPY api /app/api

RUN pip install --no-cache-dir fastapi "uvicorn[standard]" python-multipart pillow

EXPOSE 8000
ENV WEIGHTS=/weights/best.pt
ENV DEVICE=cpu
ENV IMGSZ=320

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
