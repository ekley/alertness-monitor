#!/usr/bin/env python3
"""Build and run alertness-monitor Docker images from the repo root.

Examples (from repo root):

  python docker_build.py build cpu
  python docker_build.py build gpu -t myregistry/alertness:gpu
  python docker_build.py run cpu -w yolov5/runs/train/exp2/weights/best.pt
  python docker_build.py run gpu -w path/to/best.pt -p 8000
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def _docker(args: list[str]) -> int:
    cmd = " ".join(args)
    print(cmd, flush=True)
    return subprocess.call(args)


def cmd_build(ns: argparse.Namespace) -> int:
    name = "docker/Dockerfile.gpu" if ns.variant == "gpu" else "docker/Dockerfile"
    tag = ns.tag or f"alertness-api:{ns.variant}"
    return _docker(
        [
            "docker",
            "build",
            "-f",
            str(ROOT / name),
            "-t",
            tag,
            str(ROOT),
        ]
    )


def cmd_run(ns: argparse.Namespace) -> int:
    tag = ns.tag or f"alertness-api:{ns.variant}"
    weights = Path(ns.weights).expanduser().resolve()
    if not weights.is_file():
        print(f"error: weights file not found: {weights}", file=sys.stderr)
        return 1

    vol = f"{weights}:/weights/best.pt:ro"
    cmd: list[str] = ["docker", "run", "--rm"]
    if ns.variant == "gpu":
        cmd.extend(["--gpus", "all"])
    cmd.extend(
        [
            "-p",
            f"{ns.port}:8000",
            "-v",
            vol,
            "-e",
            "DEVICE=0" if ns.variant == "gpu" else "DEVICE=cpu",
        ]
    )

    if ns.weights_env:
        cmd.extend(["-e", f"WEIGHTS={ns.weights_env}"])

    cmd.append(tag)
    return _docker(cmd)


def main() -> int:
    p = argparse.ArgumentParser(description="Build or run alertness-monitor Docker images (from repo root).")
    sub = p.add_subparsers(dest="action", required=True)

    b = sub.add_parser("build", help="Run docker build")
    b.add_argument("variant", choices=["cpu", "gpu"], help="Image variant")
    b.add_argument("-t", "--tag", default=None, help="Image tag (default: alertness-api:cpu or :gpu)")
    b.set_defaults(func=cmd_build)

    r = sub.add_parser("run", help="Run docker run (mount best.pt and expose API)")
    r.add_argument("variant", choices=["cpu", "gpu"])
    r.add_argument(
        "-w",
        "--weights",
        required=True,
        help="Host path to best.pt (relative paths are resolved from repo root)",
    )
    r.add_argument("-t", "--tag", default=None, help="Image tag (default: alertness-api:cpu or :gpu)")
    r.add_argument("-p", "--port", type=int, default=8000, help="Host port (container listens on 8000)")
    r.add_argument(
        "--weights-env",
        default=None,
        metavar="PATH",
        help="Optional WEIGHTS env inside container if not using /weights/best.pt",
    )
    r.set_defaults(func=cmd_run)

    ns = p.parse_args()
    # Resolve weights relative to ROOT for run
    if ns.action == "run":
        w = Path(ns.weights)
        if not w.is_absolute():
            ns.weights = str(ROOT / w)
    return ns.func(ns)


if __name__ == "__main__":
    raise SystemExit(main())
