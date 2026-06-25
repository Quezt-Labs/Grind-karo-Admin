import api from "./api";
import type {
  Exercise,
  ExercisesGrouped,
  CreateExercisePayload,
  UpdateExercisePayload,
} from "@/types/programs";
import { normalizeExercisesGrouped } from "@/utils/exerciseLibrary";

export const exerciseService = {
  async getAll(): Promise<ExercisesGrouped> {
    const { data } = await api.get("/admin/exercises");
    return normalizeExercisesGrouped(data.data ?? data);
  },

  async getById(id: string): Promise<Exercise> {
    const { data } = await api.get(`/admin/exercises/${id}`);
    return data.data ?? data;
  },

  async create(payload: CreateExercisePayload): Promise<Exercise> {
    const { data } = await api.post("/admin/exercises", payload);
    return data.data ?? data;
  },

  async update(id: string, payload: UpdateExercisePayload): Promise<Exercise> {
    const { data } = await api.patch(`/admin/exercises/${id}`, payload);
    return data.data ?? data;
  },

  async remove(id: string, hard = false): Promise<void> {
    await api.delete(`/admin/exercises/${id}`, {
      params: hard ? { hard: true } : undefined,
    });
  },
};
