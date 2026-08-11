import axios from "axios";
import type { UploadIncidentItem } from "@/services/uploadIncidentService";

export function isUploadIncidentBusyError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    return (
      error.code === "ECONNABORTED" ||
      status === 408 ||
      status === 429 ||
      (status != null && status >= 500)
    );
  }
  if (typeof error === "object" && error != null) {
    const maybeBusy = (error as { busy?: unknown }).busy;
    if (maybeBusy === true) return true;
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") {
      return status === 408 || status === 429 || status >= 500;
    }
  }
  return false;
}

export function nextUploadIncidentPollInterval(
  baseMs: number,
  failures: number,
): number {
  if (failures <= 0) return baseMs;
  return Math.min(Math.round(baseMs * Math.pow(1.5, failures)), 120_000);
}

export function uploadIncidentRefetchInterval(
  pollMs: number,
  visibilityState: DocumentVisibilityState | null,
  paused = false,
): number | false {
  if (paused) return false;
  if (visibilityState !== "visible") return false;
  return pollMs;
}

export function incidentAgeSeconds(item: UploadIncidentItem): number | null {
  if (item.stuckDurationSeconds != null && item.stuckDurationSeconds >= 0) {
    return item.stuckDurationSeconds;
  }
  const anchor = item.firstFailedAt ?? item.lastCheckpointAt ?? item.latestActivityAt;
  if (!anchor) return null;
  const seconds = Math.floor((Date.now() - new Date(anchor).getTime()) / 1000);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}
