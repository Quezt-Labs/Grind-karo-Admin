import { useRef, useState } from "react";
import { Upload, X, Headphones, Video } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/ui/Spinner";
import { uploadService } from "@/services/uploadService";
import {
  formatUploadError,
  isAudioFile,
  isVideoFile,
  logUploadFailure,
  resolvePresignContentType,
} from "@/utils/uploadErrors";

type MediaUploadFieldProps = {
  label: string;
  accept: string;
  mediaType: "audio" | "video";
  currentUrl: string | null;
  onUrlChange: (url: string | null) => void;
  hint?: string;
};

function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    return path.split("/").pop() || "Uploaded file";
  } catch {
    return "Uploaded file";
  }
}

export function MediaUploadField({
  label,
  accept,
  mediaType,
  currentUrl,
  onUrlChange,
  hint,
}: MediaUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const Icon = mediaType === "audio" ? Headphones : Video;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLastError(null);

    const valid = mediaType === "audio" ? isAudioFile(file) : isVideoFile(file);
    if (!valid) {
      const msg =
        mediaType === "audio"
          ? "Please choose an audio file (MP3, M4A, WAV, etc.)"
          : "Please choose a video file (MP4, MOV, WebM, etc.)";
      setLastError(msg);
      toast.error(msg);
      return;
    }

    const contentType = resolvePresignContentType(file);
    if (!contentType) {
      const msg = `Could not detect type for "${file.name}". Use .mp4, .mov, or .webm extension.`;
      logUploadFailure(
        {
          step: "validate",
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type || "(empty)",
          mediaType,
        },
        new Error(msg),
      );
      setLastError(msg);
      toast.error(msg);
      return;
    }

    setIsUploading(true);
    setProgress(0);
    try {
      const url = await uploadService.smartUpload(file, setProgress, mediaType);
      onUrlChange(url);
      setLastError(null);
      toast.success(`${mediaType === "audio" ? "Audio" : "Video"} uploaded`);
    } catch (error) {
      const message = formatUploadError(error);
      logUploadFailure(
        {
          step: "presign",
          fileName: file.name,
          fileSize: file.size,
          contentType,
          mediaType,
        },
        error,
      );
      setLastError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {hint && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}

      {currentUrl ? (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-900/40">
          <Icon className="h-4 w-4 shrink-0 text-indigo-500" />
          <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-gray-200">
            {fileNameFromUrl(currentUrl)}
          </span>
          <button
            type="button"
            onClick={() => onUrlChange(null)}
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/20"
        >
          {isUploading ? (
            <>
              <Spinner />
              Uploading… {progress > 0 ? `${progress}%` : ""}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload {mediaType} file
            </>
          )}
        </button>
      )}

      {lastError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
        >
          <p className="font-semibold">Upload failed</p>
          <p className="mt-1 leading-relaxed">{lastError}</p>
          <p className="mt-1 text-red-600/80 dark:text-red-300/80">
            Open browser DevTools → Console and search{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/40">
              [admin-upload]
            </code>{" "}
            for full details.
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
