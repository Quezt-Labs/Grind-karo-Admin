import api, { CLONE_STRUCTURE_TIMEOUT_MS } from "./api";

export interface ProgramTemplate {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  liftingFrequency: string | null;
  programLengthWeeks: number | null;
  displayOrder: number;
  kind: "TEMPLATE";
  createdAt: string;
  updatedAt: string;
}

export interface CreateProgramTemplatePayload {
  slug: string;
  name: string;
  description?: string | null;
  tagline?: string | null;
  liftingFrequency?: string | null;
  programLengthWeeks?: number | null;
  displayOrder?: number;
}

export interface CreateProgramTemplateFromSourcePayload extends CreateProgramTemplatePayload {
  sourceProgramId: string;
}

export const programTemplateService = {
  async getAll(): Promise<ProgramTemplate[]> {
    const { data } = await api.get("/admin/program-templates");
    return data.data ?? data;
  },

  async createBlank(
    payload: CreateProgramTemplatePayload,
  ): Promise<ProgramTemplate> {
    const { data } = await api.post("/admin/program-templates/blank", payload);
    return data.data ?? data;
  },

  async createFromSource(
    payload: CreateProgramTemplateFromSourcePayload,
  ): Promise<ProgramTemplate> {
    const { data } = await api.post(
      "/admin/program-templates/from-source",
      payload,
      { timeout: CLONE_STRUCTURE_TIMEOUT_MS },
    );
    return data.data ?? data;
  },

  async promoteFromProgram(programId: string): Promise<ProgramTemplate> {
    const { data } = await api.post(
      `/admin/program-templates/promote/${programId}`,
    );
    return data.data ?? data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/program-templates/${id}`);
  },
};
