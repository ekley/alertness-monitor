type ApiStatusBarProps = {
  health: string | null;
  onCheckHealth: () => void;
};

export function ApiStatusBar({ health, onCheckHealth }: ApiStatusBarProps) {
  return (
    <div className="toolbar">
      <button type="button" className="btn" onClick={() => void onCheckHealth()}>
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
  );
}
