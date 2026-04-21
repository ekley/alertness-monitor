/** API origin; empty string uses Vite dev proxy to same host. */
export const API_BASE = import.meta.env.VITE_API_BASE ?? "";

/** How often we send a frame to the API (ms). */
export const INFERENCE_INTERVAL_MS = 200;
