import { isAxiosError } from "axios";

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "webm",
  "mov",
  "m4v",
  "mpeg",
  "mpg",
  "3gp",
]);

const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "wav", "ogg", "aac", "webm"]);

const MIME_BY_EXTENSION: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
  "3gp": "video/3gpp",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  aac: "audio/aac",
};

export function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  return VIDEO_EXTENSIONS.has(fileExtension(file.name));
}

export function isAudioFile(file: File): boolean {
  if (file.type.startsWith("audio/")) return true;
  return AUDIO_EXTENSIONS.has(fileExtension(file.name));
}

/** MIME for presign — strips codec params; falls back to extension when browser omits type. */
export function resolvePresignContentType(file: File): string {
  const raw = file.type?.trim();
  if (raw) return raw.split(";")[0]!.trim().toLowerCase();

  const guessed = MIME_BY_EXTENSION[fileExtension(file.name)];
  return guessed ?? "";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUploadError(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "Upload timed out — check your connection and try again.";
    }
    if (error.response?.status === 413) {
      return "File too large for this upload path.";
    }
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    const msg = data?.message;
    if (Array.isArray(msg)) return msg.join(", ");
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Upload failed — see details below.";
}

export type UploadLogContext = {
  step: "validate" | "presign" | "s3" | "buffered";
  fileName: string;
  fileSize: number;
  contentType: string;
  mediaType?: "audio" | "video";
};

export function logUploadFailure(
  context: UploadLogContext,
  error: unknown,
): void {
  const message = formatUploadError(error);
  console.error("[admin-upload]", {
    ...context,
    fileSizeLabel: formatBytes(context.fileSize),
    error: error instanceof Error ? error.message : error,
    message,
  });
}
