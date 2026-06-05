import api from "./api";

export interface UploadResponse {
  url: string;
  key: string;
}

/** Strip codec params (e.g. `audio/webm;codecs=opus` → `audio/webm`). */
function normalizePresignContentType(file: File): string {
  const raw = file.type?.trim();
  if (raw) {
    return raw.split(";")[0]!.trim().toLowerCase();
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "webm") return "audio/webm";
  return raw ?? "";
}

export interface PresignResponse {
  key: string;
  url: string;
  fields: Record<string, string>;
  cloudfrontUrl: string;
  expiresInSeconds: number;
  maxSizeBytes: number;
}

export const uploadService = {
  /** Small files (images, CSVs, PDFs ≤ a few MB) — server-buffered. */
  async upload(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data ?? data;
  },

  /** Large files (videos) — presigned direct-to-S3. */
  async presignUpload(
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    // 1. Get presigned policy from API
    const { data } = await api.post("/upload/presign", {
      filename: file.name,
      contentType: normalizePresignContentType(file),
      sizeBytes: file.size,
    });
    const presign: PresignResponse = data.data ?? data;

    // 2. Build multipart form — all policy fields first, file LAST.
    // S3 policy pins Content-Type; MediaRecorder blobs often use
    // `audio/webm;codecs=opus` — re-wrap so the part matches the signed MIME.
    const signedType =
      presign.fields["Content-Type"] ?? normalizePresignContentType(file);
    const uploadFile =
      file.type !== signedType
        ? new File([file], file.name, { type: signedType })
        : file;

    const form = new FormData();
    for (const [k, v] of Object.entries(presign.fields)) {
      form.append(k, v);
    }
    form.append("file", uploadFile);

    // 3. Upload directly to S3 with progress tracking
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
        } else {
          reject(new Error(`S3 upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during S3 upload"));
      xhr.send(form);
    });

    // 4. cloudfrontUrl is live immediately
    return presign.cloudfrontUrl;
  },

  async remove(key: string): Promise<void> {
    await api.delete(`/upload/${encodeURIComponent(key)}`);
  },
};
