import { useRef, useState } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import toast from "react-hot-toast";
import { uploadService } from "@/services/uploadService";

interface ImageUploadFieldProps {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
}

export function ImageUploadField({
  imageUrl,
  onImageChange,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Image must be less than 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadService.upload(file);
      onImageChange(result.url);
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {imageUrl ? (
        <div className="relative inline-block">
          <img
            src={imageUrl}
            alt="Program"
            className="h-40 w-auto rounded-lg border object-cover dark:border-gray-700"
          />
          <button
            type="button"
            onClick={() => onImageChange(null)}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-sm hover:bg-red-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex h-40 w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-primary-400 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-primary-500 dark:hover:bg-gray-700"
        >
          {isUploading ? (
            <Spinner size="sm" />
          ) : (
            <ImageIcon className="h-8 w-8 text-gray-400" />
          )}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {isUploading ? "Uploading..." : "Click to upload image"}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            PNG, JPG up to 5MB
          </span>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
      {imageUrl && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 dark:text-primary-400"
        >
          <Upload className="h-3.5 w-3.5" />
          {isUploading ? "Uploading..." : "Replace image"}
        </button>
      )}
    </div>
  );
}
