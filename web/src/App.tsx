import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

/** How often we send a frame to the API (ms). Lower = smoother labels, more load on server. */
const INFERENCE_INTERVAL_MS = 200;

export interface Detection {
  class_id: number;
  "class": string;
  confidence: number;
  xyxy: [number, number, number, number];
}

/** Box + label bar colors keyed by class name (substring match, case-insensitive). */
function colorsForClass(className: string): { stroke: string; labelBar: string } {
  const n = className.toLowerCase();
  if (n.includes("drowsy")) {
    return { stroke: "#f97316", labelBar: "rgba(154, 52, 18, 0.88)" };
  }
  if (n.includes("awake")) {
    return { stroke: "#22c55e", labelBar: "rgba(20, 83, 45, 0.88)" };
  }
  return { stroke: "#38bdf8", labelBar: "rgba(12, 74, 110, 0.88)" };
}

function drawBoxesOnCanvas(
  ctx: CanvasRenderingContext2D,
  detections: Detection[],
  frameWidth: number,
) {
  const line = Math.max(2, Math.round(frameWidth / 320));
  const fontPx = Math.max(13, Math.round(frameWidth / 42));

  for (const d of detections) {
    const [x1, y1, x2, y2] = d.xyxy;
    const name = d["class"];
    const { stroke, labelBar } = colorsForClass(name);

    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    const label = `${name} ${(d.confidence * 100).toFixed(0)}%`;
    ctx.font = `${fontPx}px system-ui, sans-serif`;
    const pad = 6;
    const tw = ctx.measureText(label).width;
    const lh = fontPx + pad;
    ctx.fillStyle = labelBar;
    ctx.fillRect(x1, y1 - lh, tw + pad * 2, lh);
    ctx.fillStyle = "#fff";
    ctx.fillText(label, x1 + pad, y1 - pad / 2);
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const latestDetectionsRef = useRef<Detection[]>([]);
  const inferringRef = useRef(false);
  const rafRef = useRef(0);

  const [health, setHealth] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [stats, setStats] = useState({ fps: 0, latencyMs: 0, objects: 0 });

  const checkHealth = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/health`);
      const j = await r.json();
      setHealth(r.ok ? `API: ${j.status} · ${j.device}` : `HTTP ${r.status}`);
    } catch (e) {
      setHealth(`Unreachable (${String(e)})`);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  const sendFrame = useCallback(async () => {
    const v = videoRef.current;
    if (!v || inferringRef.current) return;
    const w = v.videoWidth;
    const h = v.videoHeight;
    if (!w || !h) return;

    inferringRef.current = true;
    const t0 = performance.now();

    const cap = document.createElement("canvas");
    cap.width = w;
    cap.height = h;
    const cctx = cap.getContext("2d");
    if (!cctx) {
      inferringRef.current = false;
      return;
    }
    cctx.drawImage(v, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => {
      cap.toBlob(resolve, "image/jpeg", 0.85);
    });
    if (!blob) {
      inferringRef.current = false;
      return;
    }

    const fd = new FormData();
    fd.append("image", new File([blob], "frame.jpg", { type: "image/jpeg" }));

    try {
      const r = await fetch(`${API_BASE}/v1/detect`, {
        method: "POST",
        body: fd,
      });
      const text = await r.text();
      if (!r.ok) {
        throw new Error(text || `HTTP ${r.status}`);
      }
      const data = JSON.parse(text) as { detections?: Detection[] };
      const dets = data.detections ?? [];
      latestDetectionsRef.current = dets;
      const latency = Math.round(performance.now() - t0);
      setStats((s) => ({
        ...s,
        latencyMs: latency,
        objects: dets.length,
      }));
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      inferringRef.current = false;
    }
  }, []);

  /** Smooth video + overlay at display refresh rate */
  useEffect(() => {
    if (!camOn) {
      latestDetectionsRef.current = [];
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, c.width, c.height);
        }
      }
      return;
    }

    const tick = () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (v && c && v.videoWidth > 0 && v.videoHeight > 0) {
        const w = v.videoWidth;
        const h = v.videoHeight;
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(v, 0, 0, w, h);
          drawBoxesOnCanvas(ctx, latestDetectionsRef.current, w);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [camOn]);

  /** Throttled inference (does not block the animation frame loop) */
  useEffect(() => {
    if (!camOn) return;

    let frames = 0;
    const idStats = window.setInterval(() => {
      setStats((s) => ({ ...s, fps: frames }));
      frames = 0;
    }, 1000);

    const idInfer = window.setInterval(() => {
      frames += 1;
      void sendFrame();
    }, INFERENCE_INTERVAL_MS);

    return () => {
      clearInterval(idInfer);
      clearInterval(idStats);
    };
  }, [camOn, sendFrame]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play();
      }
      setCamOn(true);
    } catch (e) {
      setError(String(e));
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const v = videoRef.current;
    if (v) v.srcObject = null;
    setCamOn(false);
    setStats({ fps: 0, latencyMs: 0, objects: 0 });
  };

  return (
    <div className="app">
      <h1>Alertness monitor</h1>
      <p className="sub">
        Live webcam: frames are sent to <code>/v1/detect</code> about every{" "}
        {INFERENCE_INTERVAL_MS} ms while the camera runs.
      </p>

      <div className="toolbar">
        <button type="button" className="btn" onClick={() => void checkHealth()}>
          Check API
        </button>
        {health && (
          <span
            className={`status ${health.startsWith("API: ok") ? "ok" : "err"}`}
          >
            {health}
          </span>
        )}
      </div>

      <div className="toolbar">
        {!camOn ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void startCamera()}
          >
            Start live camera
          </button>
        ) : (
          <button type="button" className="btn" onClick={stopCamera}>
            Stop camera
          </button>
        )}
        {camOn && (
          <span className="status">
            Inferences ~{stats.fps}/s · last {stats.latencyMs} ms ·{" "}
            {stats.objects} box{stats.objects === 1 ? "" : "es"}
          </span>
        )}
        {error && <span className="status err">{error}</span>}
      </div>

      <video ref={videoRef} className="cam" playsInline muted />

      <div className="preview-wrap">
        <canvas ref={canvasRef} />
      </div>

      <p className="hint">
        Video is drawn every frame; boxes update when each API response arrives
        (server speed limits how “real-time” labels feel).
      </p>
    </div>
  );
}
