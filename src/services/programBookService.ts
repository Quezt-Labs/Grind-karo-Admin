import api from "./api";
import type { ProgramBook } from "@/types/programs";

export const programBookService = {
  async list(programId?: string): Promise<ProgramBook[]> {
    const { data } = await api.get("/admin/program-books", {
      params: programId ? { programId } : undefined,
    });
    return data.items ?? data.data?.items ?? [];
  },
};
