# Alertness Monitor

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/2d98a975-7d21-4e1e-9953-a0e6c551985e" width="400"/></td>
    <td><img src="https://github.com/user-attachments/assets/04bd64d0-0c33-49c5-8dc2-6c2adee3dcfe" width="400"/></td>
  </tr>
</table>


This project uses [YOLOv5](https://github.com/ultralytics/yolov5) for object detection training and a Jupyter notebook (`main.ipynb`) for experimentation.

## What you need

- Python 3.x and `pip`
- A NVIDIA GPU with CUDA (optional but recommended for training)
- Your images and YOLO-format labels under the `data` folder (see below)

## 1. Clone YOLOv5

From the **repository root** (this folder), add the official YOLOv5 code:

```bash
git clone https://github.com/ultralytics/yolov5.git
```

You should end up with a `yolov5` directory next to `main.ipynb`, `dataset.yml`, and `data`.

## 2. Put `dataset.yml` inside `yolov5`

This repo keeps **`dataset.yml` in the project root** as the canonical copy. Training is run from inside `yolov5` with `--data dataset.yml`, so YOLOv5 must find that file next to `train.py`.

**After cloning `yolov5`, copy the root `dataset.yml` into the `yolov5` folder** (overwrite if an old file exists):

- From: `dataset.yml` (repository root)
- To: `yolov5/dataset.yml`

On Windows (PowerShell) from the repo root:

```powershell
Copy-Item -Path .\dataset.yml -Destination .\yolov5\dataset.yml -Force
```

The bundled `dataset.yml` sets `path: ../data` so that, when resolved from `yolov5/`, your dataset lives in the repo’s `data` directory. If you move files or change layout, edit `yolov5/dataset.yml` accordingly.

## 3. Python environment and dependencies

Create a virtual environment (recommended), activate it, then install YOLOv5’s requirements:

```bash
cd yolov5
pip install -r requirements.txt
```

Install PyTorch for your platform from [PyTorch’s install page](https://pytorch.org/get-started/locally/) if you need a specific CUDA build.

## 4. Dataset layout

Match what `dataset.yml` expects. With the provided file, the dataset root is `../data` relative to `yolov5`, i.e. the repo’s `data` folder. Under that, `train` and `val` point at `images` (adjust in `dataset.yml` if your folders differ).

## 5. Train

From the `yolov5` directory:

```bash
python train.py --img 320 --batch 16 --epochs 500 --data dataset.yml --weights yolov5s.pt --workers 2
```

Weights and logs are written under `yolov5/runs/train/` by default.

## 6. Notebook

Open `main.ipynb` in Jupyter or VS Code. Use the same Python environment where you installed the dependencies so imports match your training setup.

---

If you skip copying `dataset.yml` into `yolov5`, `train.py` will not find `--data dataset.yml` when you run commands from `yolov5` unless you pass a different path explicitly.

## GPU: training vs inference

| Stage | GPU required? | Notes |
|--------|----------------|--------|
| **Training** | Strongly recommended | YOLO training on CPU is possible but usually impractical (very slow). |
| **Inference** (running the trained model) | **No** | PyTorch will run on **CPU**; latency and throughput are lower than on a GPU. Use a **GPU on the server** if you need high FPS, many concurrent clients, or large input sizes. |

So: you can **ship a CPU-only Docker image** and serve the current model; add a **GPU image** (or `--gpus`) when you need faster inference.

## Docker API (inference)

The `api/` service loads your **`best.pt`** with **[YOLOv5 `torch.hub`](https://github.com/ultralytics/yolov5)** (same stack as `yolov5/train.py`). Checkpoints from that repo are **not** loaded by the `ultralytics` YOLOv8 `YOLO()` class. The Docker image **clones** `yolov5` at build time; weights are still **mounted** at run time.

Endpoints: `POST /v1/detect` (multipart field `image`), `GET /health`.

**CPU (default):** build from the repo root:

```bash
docker build -f docker/Dockerfile -t alertness-api:cpu .
```

Run — mount your latest `best.pt` (current training run is under `exp2`):

```bash
docker run --rm -p 8000:8000 -v "$(pwd)/yolov5/runs/train/exp2/weights/best.pt:/weights/best.pt:ro" alertness-api:cpu
```

On Windows PowerShell, use a full path or `docker_build.py run cpu -w yolov5/runs/train/exp2/weights/best.pt`. If you train again, the run folder may become `exp3`, etc.—point `-w` at that run’s `weights/best.pt`.

**GPU:** build the CUDA wheel variant, pass the GPU, and set `DEVICE=0`:

```bash
docker build -f docker/Dockerfile.gpu -t alertness-api:gpu .
docker run --rm --gpus all -p 8000:8000 -e DEVICE=0 -v "$(pwd)/yolov5/runs/train/exp2/weights/best.pt:/weights/best.pt:ro" alertness-api:gpu
```

- `GET /health` — liveness and config.
- `POST /v1/detect` — form upload, field name `image`.

Optional env: `WEIGHTS` (default `/weights/best.pt`), `DEVICE` (`cpu` or `0`), `IMGSZ` (default **320** to match typical training here). For local runs without Docker, ensure a `yolov5` folder exists next to `api/` or set `YOLOV5_ROOT`.

If you trained on **Windows** and serve in **Linux/Docker**, the API applies a small `pathlib` compatibility shim so `torch.load` can read checkpoints that contain `WindowsPath` objects.

## Web UI (React)

The `web/` app (Vite + React + TypeScript) talks to the same API. In dev, Vite **proxies** `/health` and `/v1` to `http://localhost:8000`, so start the API first, then:

```bash
cd web
npm install
npm run dev
```

Open **http://localhost:5173** — **Start live camera** streams the webcam: the UI draws video continuously and sends JPEG frames to `/v1/detect` on a timer (~5/s by default), overlaying boxes from the latest response.

If the API is on another host/port, add `web/.env` with `VITE_API_BASE=http://127.0.0.1:8000` (no trailing slash) and set the API’s **`CORS_ORIGINS`** env to include your frontend origin (comma-separated). Rebuild the API Docker image after pulling changes so CORS is enabled.
