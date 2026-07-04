import api from "./api";
import type { ProgramBook } from "@/types/programs";

export interface CreateProgramBookPayload {
  slug: string;
  title: string;
  body?: string;
  pdfUrl: string;
  thumbnailUrl?: string | null;
  regularPrice?: number;
  salePrice?: number | null;
  sortOrder?: number;
}

export type UpdateProgramBookPayload = Partial<CreateProgramBookPayload>;

export const programBookService = {
  async list(): Promise<ProgramBook[]> {
    const { data } = await api.get("/admin/program-books");
    return data.items ?? data.data?.items ?? [];
  },

  async create(payload: CreateProgramBookPayload): Promise<ProgramBook> {
    const { data } = await api.post("/admin/program-books", payload);
    return data.data ?? data;
  },

  async update(
    id: string,
    payload: UpdateProgramBookPayload,
  ): Promise<ProgramBook> {
    const { data } = await api.patch(`/admin/program-books/${id}`, payload);
    return data.data ?? data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/program-books/${id}`);
  },
};
