import "./App.css";
import { ApiStatusBar } from "./components/ApiStatusBar";
import { CameraControls } from "./components/CameraControls";
import { Header } from "./components/Header";
import { LivePreview } from "./components/LivePreview";
import { useLiveCameraDetection } from "./hooks/useLiveCameraDetection";

export type { Detection } from "./types/detection";

export default function App() {
  const live = useLiveCameraDetection();

  return (
    <div className="app">
      <Header inferenceIntervalMs={live.inferenceIntervalMs} />
      <ApiStatusBar health={live.health} onCheckHealth={live.checkHealth} />
      <CameraControls
        camOn={live.camOn}
        error={live.error}
        stats={live.stats}
        onStartCamera={live.startCamera}
        onStopCamera={live.stopCamera}
      />
      <LivePreview videoRef={live.videoRef} canvasRef={live.canvasRef} />
      <p className="hint">
        Video is drawn every frame; boxes update when each API response arrives
        (server speed limits how “real-time” labels feel).
      </p>
    </div>
  );
}
