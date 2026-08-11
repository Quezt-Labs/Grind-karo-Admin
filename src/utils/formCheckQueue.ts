interface FormCheckQueueRefetchIntervalInput {
  pollMs: number;
  visibilityState: DocumentVisibilityState | null;
  paused: boolean;
}

export function formCheckQueueRefetchInterval({
  pollMs,
  visibilityState,
  paused,
}: FormCheckQueueRefetchIntervalInput): number | false {
  if (paused) return false;
  if (visibilityState !== "visible") return false;
  return pollMs;
}
