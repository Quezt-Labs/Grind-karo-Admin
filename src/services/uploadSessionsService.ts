import api from "./api";

export type AdminUploadSessionItem = {
  uploadSessionId: string;
  userId: string;
  purpose: string;
  source?: string | null;
  filename: string;
  contentType: string;
  totalBytes: number;
  state: string;
  key?: string | null;
  uploadId?: string | null;
  correlationId: string;
  failureCode?: string | null;
  failureMessage?: string | null;
  retryable?: boolean | null;
  uploadedPartCount: number;
  createdAt: string;
  updatedAt: string;
};

export const uploadSessionsService = {
  async list(params: {
    purpose?: string;
    state?: string;
    correlationId?: string;
    userId?: string;
    limit?: number;
  }): Promise<AdminUploadSessionItem[]> {
    const { data } = await api.get("/upload/admin/sessions", { params });
    const payload = (data.data ?? data) as { items?: AdminUploadSessionItem[] };
    return Array.isArray(payload.items) ? payload.items : [];
  },
};
