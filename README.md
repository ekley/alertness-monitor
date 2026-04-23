# Alertness Monitor

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/2d98a975-7d21-4e1e-9953-a0e6c551985e" width="400"/></td>
    <td><img src="https://github.com/user-attachments/assets/04bd64d0-0c33-49c5-8dc2-6c2adee3dcfe" width="400"/></td>
  </tr>
</table>


This project uses [YOLOv5](https://github.com/ultralytics/yolov5) for object detection training and a Jupyter notebook (`main.ipynb`) for experimentation.

## Requirements

Install these from your OS package manager or official installers before running the project:

- Python **3.10+** (3.10 or 3.11 recommended) and `pip`
- Git
- Docker Desktop / Docker Engine (required for API container build and run)
- `make` (optional but recommended, used by root `Makefile`)
- Node.js **20+** (or Bun **1.0+**) for the `web/` frontend
- A NVIDIA GPU + CUDA drivers (optional, recommended for training and GPU inference)
- Your images and YOLO-format labels under the `data` folder (see dataset section)

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

The bundled `dataset.yml` sets `path: ../data` so that, when resolved from `yolov5/`, your dataset lives in the repo’s `data` directory. If you move files or change layout, edit `yolov5/dataset.yml` accordingly.

## 3. Python environment and dependencies

Create a virtual environment (recommended), activate it, then install YOLOv5’s requirements:

```bash
cd yolov5
pip install -r requirements.txt
```

## 4. Clone LabelImg

Use LabelImg if you want to create or edit bounding-box annotations for your dataset.

```bash
git clone https://github.com/HumanSignal/labelImg.git
```


Install PyTorch for your platform from [PyTorch’s install page](https://pytorch.org/get-started/locally/) if you need a specific CUDA build.

## 5. Dataset layout

Match what `dataset.yml` expects. With the provided file, the dataset root is `../data` relative to `yolov5`, i.e. the repo’s `data` folder. Under that, `train` and `val` point at `images` (adjust in `dataset.yml` if your folders differ).

## 6. Train

From the `yolov5` directory:

```bash
python train.py --img 320 --batch 16 --epochs 500 --data dataset.yml --weights yolov5s.pt --workers 2
```

Weights and logs are written under `yolov5/runs/train/` by default.

## 7. Notebook

Open `main.ipynb` in Jupyter or VS Code. Use the same Python environment where you installed the dependencies so imports match your training setup.

---

If you skip copying `dataset.yml` into `yolov5`, `train.py` will not find `--data dataset.yml` when you run commands from `yolov5` unless you pass a different path explicitly.

## GPU: training vs inference

| Stage | GPU required? | Notes |
|--------|----------------|--------|
| **Training** | Strongly recommended | YOLO training on CPU is possible but usually impractical (very slow). |
| **Inference** (running the trained model) | **No** | PyTorch will run on **CPU**; latency and throughput are lower than on a GPU. Use a **GPU on the server** if you need high FPS, many concurrent clients, or large input sizes. |

So: you can **ship a CPU-only Docker image** and serve the current model; add a **GPU image** (or `--gpus`) when you need faster inference.

## Makefile commands (from repo root)

The root `Makefile` has helpers for Docker and local dev.
You can run the project in two ways:

### Option 1: Local development (no Docker for API)

Use your local Python environment for the API and run the frontend dev server:

```bash
make server_dev   # FastAPI on http://localhost:8000
make web_dev      # React app on http://localhost:5173
```

### Option 2: Docker API + local frontend

Build and run the API in Docker (containers run in background with `-d`), then start the frontend:

```bash
# Build image
make docker_build_cpu
# or: make docker_build_gpu

# Run API container (WEIGHTS is required)
make docker_run_cpu WEIGHTS=yolov5/runs/train/exp2/weights/best.pt
# or: make docker_run_gpu WEIGHTS=yolov5/runs/train/exp2/weights/best.pt

# Start frontend
make web_dev
```

Optional Docker run arguments:

```bash
make docker_run_cpu WEIGHTS=... PORT=8001
# or make docker_run_gpu WEIGHTS=... PORT=8001 WEIGHTS_ENV=/weights/best.pt
```

Notes:

- `WEIGHTS` is required for `docker_run_cpu` and `docker_run_gpu`.
- Relative `WEIGHTS` paths are converted to absolute paths in the Makefile.
- Containers are started detached (`-d`) and removed on stop (`--rm`).
- To inspect/stop running containers: `docker ps`, then `docker stop <container_id>`.

Open **http://localhost:5173** — **Start live camera** streams the webcam: the UI draws video continuously and sends JPEG frames to `/v1/detect` on a timer (~5/s by default), overlaying boxes from the latest response.

If the API is on another host/port, add `web/.env` with `VITE_API_BASE=http://127.0.0.1:8000` (no trailing slash) and set the API’s **`CORS_ORIGINS`** env to include your frontend origin (comma-separated). Rebuild the API Docker image after pulling changes so CORS is enabled.
