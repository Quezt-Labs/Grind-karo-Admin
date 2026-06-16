import { useRef, useState } from "react";
import { Upload, X, Headphones, Video } from "lucide-react";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { Spinner } from "@/components/ui/Spinner";
import { uploadService } from "@/services/uploadService";

type MediaUploadFieldProps = {
  label: string;
  accept: string;
  mediaType: "audio" | "video";
  currentUrl: string | null;
  onUrlChange: (url: string | null) => void;
  hint?: string;
};

function uploadErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response?.status === 413) {
      return "File too large — try a smaller file or contact support.";
    }
    const msg = error.response?.data?.message;
    if (typeof msg === "string") return msg;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Upload failed";
}

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

  const Icon = mediaType === "audio" ? Headphones : Video;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/");
    if (mediaType === "audio" && !isAudio) {
      toast.error("Please choose an audio file (MP3, M4A, WAV, etc.)");
      return;
    }
    if (mediaType === "video" && !isVideo) {
      toast.error("Please choose a video file (MP4, WebM, etc.)");
      return;
    }

    setIsUploading(true);
    setProgress(0);
    try {
      const url = await uploadService.smartUpload(file, setProgress);
      onUrlChange(url);
      toast.success(`${mediaType === "audio" ? "Audio" : "Video"} uploaded`);
    } catch (error) {
      toast.error(uploadErrorMessage(error));
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
