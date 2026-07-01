import api from "./api";
import {
  formatUploadError,
  logUploadFailure,
  resolvePresignContentType,
  type UploadLogContext,
} from "@/utils/uploadErrors";

export interface UploadResponse {
  url: string;
  key: string;
}

export interface PresignResponse {
  key: string;
  url: string;
  fields: Record<string, string>;
  cloudfrontUrl: string;
  expiresInSeconds: number;
  maxSizeBytes: number;
}

function parseS3ErrorBody(responseText: string): string | null {
  const code = responseText.match(/<Code>([^<]+)<\/Code>/)?.[1];
  const message = responseText.match(/<Message>([^<]+)<\/Message>/)?.[1];
  if (code && message) return `${code}: ${message}`;
  if (message) return message;
  if (code) return code;
  const trimmed = responseText.trim();
  return trimmed.length > 0 && trimmed.length < 200 ? trimmed : null;
}

function assertPresignContentType(file: File): string {
  const contentType = resolvePresignContentType(file);
  if (!contentType) {
    throw new Error(
      `Could not detect file type for "${file.name}". Rename with a known extension (e.g. .mp4, .mov, .webm) and try again.`,
    );
  }
  return contentType;
}

// api.grindkaro.in nginx client_max_body_size is 1 MB — buffered POST /upload
// returns 413 above that. Presign bypasses the proxy (browser → S3).
const BUFFERED_UPLOAD_MAX_BYTES = 900 * 1024;

export const uploadService = {
  /** Small files only (≤ ~900 KB) — server-buffered. Prefer smartUpload. */
  async upload(file: File): Promise<UploadResponse> {
    const contentType = resolvePresignContentType(file);
    const logBase: UploadLogContext = {
      step: "buffered",
      fileName: file.name,
      fileSize: file.size,
      contentType,
    };

    const formData = new FormData();
    formData.append("file", file);
    try {
      const { data } = await api.post("/upload", formData);
      return data.data ?? data;
    } catch (error) {
      logUploadFailure(logBase, error);
      throw error;
    }
  },

  /** Direct-to-S3 — bypasses reverse-proxy body limits (no 413). */
  async presignUpload(
    file: File,
    onProgress?: (percent: number) => void,
    mediaType?: "audio" | "video",
  ): Promise<string> {
    const contentType = assertPresignContentType(file);
    const logBase: UploadLogContext = {
      step: "presign",
      fileName: file.name,
      fileSize: file.size,
      contentType,
      mediaType,
    };

    let presign: PresignResponse;
    try {
      const { data } = await api.post("/upload/presign", {
        filename: file.name,
        contentType,
        sizeBytes: file.size,
      });
      presign = data.data ?? data;
    } catch (error) {
      logUploadFailure(logBase, error);
      throw new Error(formatUploadError(error));
    }

    const signedType = presign.fields["Content-Type"] ?? contentType;
    const uploadFile =
      file.type !== signedType
        ? new File([file], file.name, { type: signedType })
        : file;

    const form = new FormData();
    for (const [k, v] of Object.entries(presign.fields)) {
      form.append(k, v);
    }
    form.append("file", uploadFile);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", presign.url);

        if (onProgress) {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              onProgress(Math.round((e.loaded / e.total) * 100));
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
            return;
          }
          const s3Detail = parseS3ErrorBody(xhr.responseText ?? "");
          reject(
            new Error(
              s3Detail
                ? `Storage upload rejected (${xhr.status}): ${s3Detail}`
                : `Storage upload failed with status ${xhr.status}`,
            ),
          );
        };
        xhr.onerror = () =>
          reject(
            new Error(
              "Network error while uploading to storage — check connection or try a smaller file.",
            ),
          );
        xhr.send(form);
      });
    } catch (error) {
      logUploadFailure({ ...logBase, step: "s3" }, error);
      throw error;
    }

    return presign.cloudfrontUrl;
  },

  /** Auto-picks presign vs buffered; falls back to presign on 413. */
  async smartUpload(
    file: File,
    onProgress?: (percent: number) => void,
    mediaType?: "audio" | "video",
  ): Promise<string> {
    const contentType = resolvePresignContentType(file);
    const usePresign =
      contentType.startsWith("video/") ||
      contentType.startsWith("audio/") ||
      file.size > BUFFERED_UPLOAD_MAX_BYTES;

    if (usePresign) {
      return this.presignUpload(file, onProgress, mediaType);
    }

    try {
      const result = await this.upload(file);
      return result.url;
    } catch (err: unknown) {
      const status =
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status;
      if (status === 413) {
        return this.presignUpload(file, onProgress, mediaType);
      }
      throw err;
    }
  },

  async remove(key: string): Promise<void> {
    await api.delete(`/upload/${encodeURIComponent(key)}`);
  },
};
