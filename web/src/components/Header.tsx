type HeaderProps = {
  inferenceIntervalMs: number;
};

export function Header({ inferenceIntervalMs }: HeaderProps) {
  return (
    <>
      <h1>Alertness monitor</h1>
      <p className="sub">
        Live webcam: frames are sent to the server about every{" "}
        {inferenceIntervalMs} ms while the camera runs.
      </p>
    </>
  );
}
