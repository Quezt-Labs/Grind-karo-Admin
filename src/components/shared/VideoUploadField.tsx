import { useRef, useState } from "react";
import { Upload, X, Video } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { FormCheckVideoPlayer } from "@/components/shared/FormCheckVideoPlayer";
import toast from "react-hot-toast";
import { uploadService } from "@/services/uploadService";
import {
  formatBytes,
  formatUploadError,
  isVideoFile,
  logUploadFailure,
  resolvePresignContentType,
} from "@/utils/uploadErrors";

const MAX_VIDEO_SIZE = 150 * 1024 * 1024; // 150 MB

interface VideoUploadFieldProps {
  videoUrl: string | null;
  onVideoChange: (url: string | null) => void;
}

export function VideoUploadField({
  videoUrl,
  onVideoChange,
}: VideoUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLastError(null);

    if (!isVideoFile(file)) {
      const msg = "Only MP4, MOV, WebM, and MPEG videos are allowed";
      setLastError(msg);
      toast.error(msg);
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      const msg = `Video must be ${formatBytes(MAX_VIDEO_SIZE)} or smaller (selected: ${formatBytes(file.size)})`;
      setLastError(msg);
      toast.error(msg);
      return;
    }

    const contentType = resolvePresignContentType(file);
    if (!contentType) {
      const msg = `Could not detect video type for "${file.name}". Use .mp4, .mov, or .webm.`;
      setLastError(msg);
      toast.error(msg);
      return;
    }

    setIsUploading(true);
    setProgress(0);
    try {
      const url = await uploadService.presignUpload(file, setProgress, "video");
      onVideoChange(url);
      setLastError(null);
      toast.success("Video uploaded");
    } catch (error) {
      const message = formatUploadError(error);
      logUploadFailure(
        {
          step: "presign",
          fileName: file.name,
          fileSize: file.size,
          contentType,
          mediaType: "video",
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
    <div className="space-y-3">
      {videoUrl ? (
        <div className="space-y-2">
          <div className="relative max-w-md">
            <FormCheckVideoPlayer
              src={videoUrl}
              compact
              eager
              className="rounded-lg border dark:border-gray-700"
            />
            <button
              type="button"
              onClick={() => onVideoChange(null)}
              className="absolute -right-2 -top-2 z-10 rounded-full bg-red-500 p-1 text-white shadow-sm hover:bg-red-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <input
            type="text"
            value={videoUrl}
            readOnly
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
          >
            <Upload className="h-3.5 w-3.5" />
            Replace video
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="relative flex h-40 w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-primary-400 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-primary-500 dark:hover:bg-gray-700"
        >
          {isUploading ? (
            <>
              <Spinner size="sm" />
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                {progress}%
              </span>
              <div
                className="absolute bottom-0 left-0 h-1 bg-primary-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </>
          ) : (
            <>
              <Video className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Click to upload video
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                MP4, MOV, WebM up to 150 MB
              </span>
            </>
          )}
        </button>
      )}

      {lastError && (
        <div
          role="alert"
          className="max-w-md rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
        >
          <p className="font-semibold">Upload failed</p>
          <p className="mt-1 leading-relaxed">{lastError}</p>
          <p className="mt-1 text-red-600/80 dark:text-red-300/80">
            DevTools Console → search{" "}
            <code className="rounded bg-red-100 px-1 dark:bg-red-900/40">
              [admin-upload]
            </code>
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/mpeg,video/quicktime,.mp4,.mov,.webm,.m4v"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
