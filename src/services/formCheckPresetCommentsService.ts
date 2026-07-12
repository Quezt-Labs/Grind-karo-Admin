import api from "./api";

export interface FormCheckPresetComment {
  id: string;
  body: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const formCheckPresetCommentsService = {
  async list(): Promise<FormCheckPresetComment[]> {
    const { data } = await api.get<{ items: FormCheckPresetComment[] }>(
      "/admin/form-check-preset-comments",
    );
    return data.items;
  },

  async create(body: string): Promise<FormCheckPresetComment> {
    const { data } = await api.post<FormCheckPresetComment>(
      "/admin/form-check-preset-comments",
      { body },
    );
    return data;
  },

  async update(
    id: string,
    patch: { body?: string; sortOrder?: number },
  ): Promise<FormCheckPresetComment> {
    const { data } = await api.patch<FormCheckPresetComment>(
      `/admin/form-check-preset-comments/${id}`,
      patch,
    );
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/form-check-preset-comments/${id}`);
  },

  async reorder(ids: string[]): Promise<FormCheckPresetComment[]> {
    const { data } = await api.post<{ items: FormCheckPresetComment[] }>(
      "/admin/form-check-preset-comments/reorder",
      { ids },
    );
    return data.items;
  },
};
