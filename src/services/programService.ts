import api from "./api";
import type {
  Program,
  CreateProgramPayload,
  UpdateProgramPayload,
  ProgramTree,
  Block,
  CreateBlockPayload,
  UpdateBlockPayload,
  Week,
  CreateWeekPayload,
  UpdateWeekPayload,
  Day,
  CreateDayPayload,
  UpdateDayPayload,
  ExerciseRow,
  CreateExerciseRowPayload,
  UpdateExerciseRowPayload,
  ExerciseRowUpdateResult,
  ExerciseSet,
  CreateExerciseSetPayload,
  UpdateExerciseSetPayload,
  ExerciseSetUpdateResult,
  ProgramResource,
  CreateResourcePayload,
  UpdateResourcePayload,
} from "@/types/programs";

export const programService = {
  // ---- Programs (top-level) ------------------------------------------------
  async getAll(): Promise<Program[]> {
    const { data } = await api.get("/admin/programs");
    return data.data ?? data;
  },

  async getById(id: string): Promise<Program> {
    const { data } = await api.get(`/admin/programs/${id}`);
    return data.data ?? data;
  },

  async getTree(id: string): Promise<ProgramTree> {
    const { data } = await api.get(`/admin/programs/${id}/tree`);
    return data.data ?? data;
  },

  async create(payload: CreateProgramPayload): Promise<Program> {
    const { data } = await api.post("/admin/programs", payload);
    return data.data ?? data;
  },

  async update(id: string, payload: UpdateProgramPayload): Promise<Program> {
    const { data } = await api.patch(`/admin/programs/${id}`, payload);
    return data.data ?? data;
  },

  async getContentV2(programId: string): Promise<unknown> {
    const { data } = await api.get(`/programs/${programId}/content-v2`);
    return data;
  },

  async remove(id: string, hard = false): Promise<void> {
    await api.delete(`/admin/programs/${id}`, {
      params: hard ? { hard: true } : undefined,
    });
  },

  // ---- Blocks --------------------------------------------------------------
  async getBlocks(programId: string): Promise<Block[]> {
    const { data } = await api.get(`/admin/programs/${programId}/blocks`);
    return data.data ?? data;
  },

  async createBlock(
    programId: string,
    payload: CreateBlockPayload,
  ): Promise<Block> {
    const { data } = await api.post(
      `/admin/programs/${programId}/blocks`,
      payload,
    );
    return data.data ?? data;
  },

  async updateBlock(
    programId: string,
    blockId: string,
    payload: UpdateBlockPayload,
  ): Promise<Block> {
    const { data } = await api.patch(
      `/admin/programs/${programId}/blocks/${blockId}`,
      payload,
    );
    return data.data ?? data;
  },

  async removeBlock(programId: string, blockId: string): Promise<void> {
    await api.delete(`/admin/programs/${programId}/blocks/${blockId}`);
  },

  async cloneBlock(programId: string, blockId: string): Promise<Block> {
    const { data } = await api.post(
      `/admin/programs/${programId}/blocks/${blockId}/clone`,
      {},
    );
    return data.data ?? data;
  },

  // ---- Weeks ---------------------------------------------------------------
  async createWeek(
    programId: string,
    blockId: string,
    payload: CreateWeekPayload,
  ): Promise<Week> {
    const { data } = await api.post(
      `/admin/programs/${programId}/blocks/${blockId}/weeks`,
      payload,
    );
    return data.data ?? data;
  },

  async updateWeek(
    programId: string,
    weekId: string,
    payload: UpdateWeekPayload,
  ): Promise<Week> {
    const { data } = await api.patch(
      `/admin/programs/${programId}/weeks/${weekId}`,
      payload,
    );
    return data.data ?? data;
  },

  async removeWeek(programId: string, weekId: string): Promise<void> {
    await api.delete(`/admin/programs/${programId}/weeks/${weekId}`);
  },

  async cloneWeek(programId: string, weekId: string): Promise<Week> {
    const { data } = await api.post(
      `/admin/programs/${programId}/weeks/${weekId}/clone`,
      {},
    );
    return data.data ?? data;
  },

  // ---- Days ----------------------------------------------------------------
  async createDay(
    programId: string,
    weekId: string,
    payload: CreateDayPayload,
  ): Promise<Day> {
    const { data } = await api.post(
      `/admin/programs/${programId}/weeks/${weekId}/days`,
      payload,
    );
    return data.data ?? data;
  },

  async updateDay(
    programId: string,
    dayId: string,
    payload: UpdateDayPayload,
  ): Promise<Day> {
    const { data } = await api.patch(
      `/admin/programs/${programId}/days/${dayId}`,
      payload,
    );
    return data.data ?? data;
  },

  async removeDay(programId: string, dayId: string): Promise<void> {
    await api.delete(`/admin/programs/${programId}/days/${dayId}`);
  },

  // ---- Exercise rows -------------------------------------------------------
  async createExerciseRow(
    programId: string,
    dayId: string,
    payload: CreateExerciseRowPayload,
  ): Promise<ExerciseRow> {
    const { data } = await api.post(
      `/admin/programs/${programId}/days/${dayId}/exercises`,
      payload,
    );
    return data.data ?? data;
  },

  async updateExerciseRow(
    programId: string,
    rowId: string,
    payload: UpdateExerciseRowPayload,
  ): Promise<ExerciseRowUpdateResult> {
    const { data } = await api.patch(
      `/admin/programs/${programId}/exercises/${rowId}`,
      payload,
    );
    const raw = data.data ?? data;
    if (raw && typeof raw === "object" && "row" in raw) {
      return raw as ExerciseRowUpdateResult;
    }
    return { row: raw as ExerciseRow };
  },

  async removeExerciseRow(programId: string, rowId: string): Promise<void> {
    await api.delete(`/admin/programs/${programId}/exercises/${rowId}`);
  },

  async cloneExerciseRow(
    programId: string,
    rowId: string,
  ): Promise<ExerciseRow> {
    const { data } = await api.post(
      `/admin/programs/${programId}/exercises/${rowId}/clone`,
      {},
    );
    return data.data ?? data;
  },

  async reorderDayExercises(
    programId: string,
    dayId: string,
    orderedIds: string[],
  ): Promise<void> {
    await api.post(
      `/admin/programs/${programId}/days/${dayId}/exercises/reorder`,
      { orderedIds },
    );
  },

  // ---- Exercise sets (per-set prescription) --------------------------------
  async listExerciseSets(
    programId: string,
    rowId: string,
  ): Promise<ExerciseSet[]> {
    const { data } = await api.get(
      `/admin/programs/${programId}/exercises/${rowId}/sets`,
    );
    return data.data ?? data;
  },

  async createExerciseSet(
    programId: string,
    rowId: string,
    payload: CreateExerciseSetPayload,
  ): Promise<ExerciseSet> {
    const { data } = await api.post(
      `/admin/programs/${programId}/exercises/${rowId}/sets`,
      payload,
    );
    return data.data ?? data;
  },

  async updateExerciseSet(
    programId: string,
    rowId: string,
    setId: string,
    payload: UpdateExerciseSetPayload,
  ): Promise<ExerciseSetUpdateResult> {
    const { data } = await api.patch(
      `/admin/programs/${programId}/exercises/${rowId}/sets/${setId}`,
      payload,
    );
    const raw = data.data ?? data;
    if (raw && typeof raw === "object" && "set" in raw) {
      return raw as ExerciseSetUpdateResult;
    }
    return { set: raw as ExerciseSet };
  },

  async removeExerciseSet(
    programId: string,
    rowId: string,
    setId: string,
  ): Promise<void> {
    await api.delete(
      `/admin/programs/${programId}/exercises/${rowId}/sets/${setId}`,
    );
  },

  // ---- Resources -----------------------------------------------------------
  async getResources(programId: string): Promise<ProgramResource[]> {
    const { data } = await api.get(`/admin/programs/${programId}/resources`);
    return data.data ?? data;
  },

  async createResource(
    programId: string,
    payload: CreateResourcePayload,
  ): Promise<ProgramResource> {
    const { data } = await api.post(
      `/admin/programs/${programId}/resources`,
      payload,
    );
    return data.data ?? data;
  },

  async updateResource(
    programId: string,
    resourceId: string,
    payload: UpdateResourcePayload,
  ): Promise<ProgramResource> {
    const { data } = await api.patch(
      `/admin/programs/${programId}/resources/${resourceId}`,
      payload,
    );
    return data.data ?? data;
  },

  async removeResource(programId: string, resourceId: string): Promise<void> {
    await api.delete(`/admin/programs/${programId}/resources/${resourceId}`);
  },
};
