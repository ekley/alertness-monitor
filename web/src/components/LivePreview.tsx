import type { RefObject } from "react";

type LivePreviewProps = {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
};

export function LivePreview({ videoRef, canvasRef }: LivePreviewProps) {
  return (
    <>
      <video ref={videoRef} className="cam" playsInline muted />
      <div className="preview-wrap">
        <canvas ref={canvasRef} />
      </div>
    </>
  );
}
