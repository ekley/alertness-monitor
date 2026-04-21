"""HTTP API for YOLOv5 inference. Loads checkpoints from ultralytics/yolov5 training (best.pt), not YOLOv8."""

from __future__ import annotations

import os
import pathlib
import sys
from io import BytesIO
from pathlib import Path
from typing import Any, Optional

import torch


def _allow_windows_paths_on_linux() -> None:
    """YOLOv5 .pt saved on Windows may pickle pathlib.WindowsPath; unpickling on Linux/Docker fails without this."""
    if sys.platform != "win32":
        pathlib.WindowsPath = pathlib.PosixPath  # type: ignore[misc, assignment]


_allow_windows_paths_on_linux()
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image

WEIGHTS = os.environ.get("WEIGHTS", "/weights/best.pt")
DEVICE = os.environ.get("DEVICE", "cpu")
IMGSZ = int(os.environ.get("IMGSZ", "320"))


def _default_yolov5_root() -> str:
    env = os.environ.get("YOLOV5_ROOT")
    if env:
        return env
    repo = Path(__file__).resolve().parent.parent / "yolov5"
    if repo.is_dir():
        return str(repo)
    return "/app/yolov5"


YOLOV5_ROOT = _default_yolov5_root()

app = FastAPI(title="Alertness monitor", version="1.0.0")
_model: Optional[Any] = None


def get_model() -> Any:
    global _model
    if _model is None:
        if not os.path.isfile(WEIGHTS):
            raise RuntimeError(
                f"Weights not found: {WEIGHTS}. Mount your best.pt (e.g. -v /path/best.pt:/weights/best.pt) "
                "or set WEIGHTS."
            )
        if not os.path.isdir(YOLOV5_ROOT):
            raise RuntimeError(
                f"YOLOv5 repo not found at {YOLOV5_ROOT}. Set YOLOV5_ROOT or clone "
                "https://github.com/ultralytics/yolov5 next to this project (or use the Docker image)."
            )
        _model = torch.hub.load(
            YOLOV5_ROOT,
            "custom",
            WEIGHTS,
            source="local",
            device=DEVICE,
            _verbose=False,
            trust_repo=True,
        )
    return _model


@app.on_event("startup")
def startup() -> None:
    get_model()


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "weights": WEIGHTS,
        "device": DEVICE,
        "imgsz": IMGSZ,
        "yolov5_root": YOLOV5_ROOT,
    }


@app.post("/v1/detect")
async def detect(image: UploadFile = File(...)) -> dict:
    try:
        model = get_model()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    data = await image.read()
    im = Image.open(BytesIO(data)).convert("RGB")
    results = model(im, size=IMGSZ)
    df = results.pandas().xyxy[0]
    out = []
    for _, row in df.iterrows():
        out.append(
            {
                "class_id": int(row["class"]),
                "class": str(row["name"]),
                "confidence": float(row["confidence"]),
                "xyxy": [
                    float(row["xmin"]),
                    float(row["ymin"]),
                    float(row["xmax"]),
                    float(row["ymax"]),
                ],
            }
        )
    return {"detections": out}
