import { useRef, useState } from "react";
import { Upload, X, Video } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { FormCheckVideoPlayer } from "@/components/shared/FormCheckVideoPlayer";
import toast from "react-hot-toast";
import { uploadService } from "@/services/uploadService";

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/mpeg"];
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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error("Only MP4, WebM, and MPEG videos are allowed");
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      toast.error("Video must be less than 150 MB");
      return;
    }

    setIsUploading(true);
    setProgress(0);
    try {
      const url = await uploadService.presignUpload(file, setProgress);
      onVideoChange(url);
      toast.success("Video uploaded");
    } catch {
      toast.error("Failed to upload video");
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
                MP4, WebM up to 150 MB
              </span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/mpeg"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
