/** Infer audio MIME from URL extension when the API does not store content-type. */
export function inferAudioMimeType(
  src: string,
  fallback?: string | null,
): string | undefined {
  if (fallback?.trim()) {
    return fallback.split(";")[0].trim();
  }
  const path = src.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".webm")) return "audio/webm";
  if (path.endsWith(".mp4") || path.endsWith(".m4a")) return "audio/mp4";
  if (path.endsWith(".mp3")) return "audio/mpeg";
  if (path.endsWith(".wav")) return "audio/wav";
  if (path.endsWith(".ogg")) return "audio/ogg";
  if (path.endsWith(".aac")) return "audio/aac";
  if (/voice-\d+\.webm/i.test(path)) return "audio/webm";
  return undefined;
}
