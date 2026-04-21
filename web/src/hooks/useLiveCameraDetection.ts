import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, INFERENCE_INTERVAL_MS } from "../config";
import { drawBoxesOnCanvas } from "../lib/drawDetections";
import type { Detection } from "../types/detection";
import type { DetectionStats } from "../types/stats";

export function useLiveCameraDetection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const latestDetectionsRef = useRef<Detection[]>([]);
  const inferringRef = useRef(false);
  const rafRef = useRef(0);

  const [health, setHealth] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [stats, setStats] = useState<DetectionStats>({
    fps: 0,
    latencyMs: 0,
    objects: 0,
  });

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

  const startCamera = useCallback(async () => {
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
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const v = videoRef.current;
    if (v) v.srcObject = null;
    setCamOn(false);
    setStats({ fps: 0, latencyMs: 0, objects: 0 });
  }, []);

  return {
    canvasRef,
    videoRef,
    health,
    error,
    camOn,
    stats,
    checkHealth,
    startCamera,
    stopCamera,
    inferenceIntervalMs: INFERENCE_INTERVAL_MS,
  };
}
