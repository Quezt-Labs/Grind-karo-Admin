import api from "./api";

export interface UploadResponse {
  url: string;
  key: string;
}

export const uploadService = {
  async upload(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data ?? data;
  },

  async remove(key: string): Promise<void> {
    await api.delete(`/upload/${encodeURIComponent(key)}`);
  },
};
