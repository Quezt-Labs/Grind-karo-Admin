import { useRef, useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import toast from "react-hot-toast";
import { uploadService } from "@/services/uploadService";

const MAX_PDF_BYTES = 50 * 1024 * 1024;

interface PdfUploadFieldProps {
  pdfUrl: string | null;
  onPdfChange: (url: string | null) => void;
}

export function PdfUploadField({ pdfUrl, onPdfChange }: PdfUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    if (file.size > MAX_PDF_BYTES) {
      toast.error("PDF must be 50 MB or smaller");
      return;
    }

    setIsUploading(true);
    try {
      const usePresign = file.size > 4 * 1024 * 1024;
      const url = usePresign
        ? await uploadService.presignUpload(file)
        : (await uploadService.upload(file)).url;
      onPdfChange(url);
      toast.success("PDF uploaded");
    } catch {
      toast.error("Failed to upload PDF");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        PDF file
      </label>
      {pdfUrl ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-600 dark:bg-gray-900/40">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-red-500" />
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              View uploaded PDF
            </a>
          </div>
          <button
            type="button"
            onClick={() => onPdfChange(null)}
            className="shrink-0 rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
            title="Remove PDF"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-primary-400 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-primary-500"
        >
          {isUploading ? (
            <Spinner size="sm" />
          ) : (
            <Upload className="h-7 w-7 text-gray-400" />
          )}
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {isUploading ? "Uploading…" : "Click to upload PDF book"}
          </span>
          <span className="text-xs text-gray-400">PDF up to 50 MB</span>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
