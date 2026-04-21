import type { Detection } from "../types/detection";

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

export function drawBoxesOnCanvas(
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
