import type { DetectionStats } from "../types/stats";

type CameraControlsProps = {
  camOn: boolean;
  error: string | null;
  stats: DetectionStats;
  onStartCamera: () => void | Promise<void>;
  onStopCamera: () => void;
};

export function CameraControls({
  camOn,
  error,
  stats,
  onStartCamera,
  onStopCamera,
}: CameraControlsProps) {
  return (
    <div className="toolbar">
      {!camOn ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void onStartCamera()}
        >
          Start live camera
        </button>
      ) : (
        <button type="button" className="btn" onClick={onStopCamera}>
          Stop camera
        </button>
      )}
      {camOn && (
        <span className="status">
          Inferences ~{stats.fps}/s · last {stats.latencyMs} ms · {stats.objects}{" "}
          box{stats.objects === 1 ? "" : "es"}
        </span>
      )}
      {error && <span className="status err">{error}</span>}
    </div>
  );
}
