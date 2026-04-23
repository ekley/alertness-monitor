# Alertness Monitor

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/2d98a975-7d21-4e1e-9953-a0e6c551985e" width="400"/></td>
    <td><img src="https://github.com/user-attachments/assets/04bd64d0-0c33-49c5-8dc2-6c2adee3dcfe" width="400"/></td>
  </tr>
</table>


Real-time drowsiness detection system built with YOLO-based image processing.  
The project includes:

- model training workflow with [YOLOv5](https://github.com/ultralytics/yolov5)
- FastAPI inference service (`api/`)
- React frontend for live webcam detection (`web/`)
- Docker CPU/GPU deployment options

## Requirements

Install these before running the project:

- Python **3.10+** (3.10/3.11 recommended) + `pip`
- Git
- Docker Desktop / Docker Engine
- `make` (recommended for root `Makefile` commands)
- Node.js **20+** or Bun **1.0+** (frontend)
- NVIDIA GPU + CUDA drivers (optional; recommended for training/GPU inference)


## Quick start (run the app)

From the repository root, pick one setup:

### Option A: Local API + local frontend

```bash
make server_dev   # API: http://localhost:8000
make web_dev      # Web: http://localhost:5173
```

### Option B: Docker API + local frontend

```bash
# Build API image
make docker_build_cpu
# or: make docker_build_gpu

# Run API container in background (-d)
make docker_run_cpu WEIGHTS=yolov5/runs/train/exp2/weights/best.pt
# or: make docker_run_gpu WEIGHTS=yolov5/runs/train/exp2/weights/best.pt

# Start web app
make web_dev
```

Optional Docker run args:

```bash
make docker_run_cpu WEIGHTS=... PORT=8001
make docker_run_gpu WEIGHTS=... PORT=8001 WEIGHTS_ENV=/weights/best.pt
```

Notes:

- `WEIGHTS` is required for `docker_run_cpu` and `docker_run_gpu`.
- Containers are started detached (`-d`) and auto-removed on stop (`--rm`).
- Check/stop containers with `docker ps` and `docker stop <container_id>`.

## Frontend behavior

Open [http://localhost:5173](http://localhost:5173).  
`Start live camera` streams webcam frames to `/v1/detect` (about 5 requests/sec) and overlays bounding boxes from API responses.

If API runs on a different host/port:

- set `web/.env`: `VITE_API_BASE=http://127.0.0.1:8000` (no trailing slash)
- set API `CORS_ORIGINS` to include frontend origin(s)

## API endpoints

- `GET /health` - liveness and runtime config
- `POST /v1/detect` - multipart image upload (`image` field)

## Training pipeline

## 1) Clone YOLOv5

```bash
git clone https://github.com/ultralytics/yolov5.git
```

Expected layout: `yolov5/` next to `main.ipynb`, `dataset.yml`, and `data/`.

## 2) Copy `dataset.yml` into `yolov5`

Training is run from inside `yolov5` with `--data dataset.yml`, so `dataset.yml` must exist in `yolov5/`.

- from: `dataset.yml` (repo root)
- to: `yolov5/dataset.yml`

The provided file uses `path: ../data`, so dataset files should live in repo `data/`.

## 3) Install dependencies

```bash
cd yolov5
pip install -r requirements.txt
```

Install matching PyTorch build from [PyTorch install guide](https://pytorch.org/get-started/locally/) if needed.

## 4) (Optional) Clone LabelImg for annotation

Use LabelImg to create/edit bounding-box labels:

```bash
git clone https://github.com/HumanSignal/labelImg.git
```

## 5) Train

From `yolov5/`:

```bash
python train.py --img 320 --batch 16 --epochs 500 --data dataset.yml --weights yolov5s.pt --workers 2
```

Outputs are saved under `yolov5/runs/train/`.

## 6) Notebook workflow

Open `main.ipynb` in Jupyter or VS Code, using the same Python environment as training.

## GPU guidance

- Training: GPU is strongly recommended.
- Inference: CPU works, but GPU improves latency/throughput.

Use CPU image for simple deployment; switch to GPU image (`--gpus all`) for higher throughput.

## Notebook cleanup before commit

```bash
python -m nbconvert --clear-output --inplace .\main.ipynb
```

If `nbconvert` is missing:

```bash
python -m pip install nbconvert
```