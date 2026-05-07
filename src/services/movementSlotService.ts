import api from "./api";
import type {
  MovementSlot,
  CreateSlotPayload,
  UpdateSlotPayload,
  MovementOption,
  CreateOptionPayload,
  UpdateOptionPayload,
  OverrideUpsertPayload,
  AthleteSelectionRecord,
} from "@/types/programs";

export const movementSlotService = {
  // ---- Slots ---------------------------------------------------------------
  async getSlots(programId: string): Promise<MovementSlot[]> {
    const { data } = await api.get(
      `/admin/programs/${programId}/movement-slots`,
    );
    return data.data ?? data;
  },

  async createSlot(
    programId: string,
    payload: CreateSlotPayload,
  ): Promise<MovementSlot> {
    const { data } = await api.post(
      `/admin/programs/${programId}/movement-slots`,
      payload,
    );
    return data.data ?? data;
  },

  async updateSlot(
    slotId: string,
    payload: UpdateSlotPayload,
  ): Promise<MovementSlot> {
    const { data } = await api.patch(
      `/admin/movement-slots/${slotId}`,
      payload,
    );
    return data.data ?? data;
  },

  async removeSlot(slotId: string): Promise<void> {
    await api.delete(`/admin/movement-slots/${slotId}`);
  },

  // ---- Options -------------------------------------------------------------
  async createOption(
    slotId: string,
    payload: CreateOptionPayload,
  ): Promise<MovementOption> {
    const { data } = await api.post(
      `/admin/movement-slots/${slotId}/options`,
      payload,
    );
    return data.data ?? data;
  },

  async updateOption(
    optionId: string,
    payload: UpdateOptionPayload,
  ): Promise<MovementOption> {
    const { data } = await api.patch(
      `/admin/movement-options/${optionId}`,
      payload,
    );
    return data.data ?? data;
  },

  async removeOption(optionId: string): Promise<void> {
    await api.delete(`/admin/movement-options/${optionId}`);
  },

  // ---- Overrides -----------------------------------------------------------
  async upsertOverrides(
    optionId: string,
    overrides: OverrideUpsertPayload[],
  ): Promise<void> {
    await api.put(`/admin/movement-options/${optionId}/overrides`, {
      overrides,
    });
  },

  // ---- Link / Unlink row to slot -------------------------------------------
  async linkRowToSlot(
    exerciseRowId: string,
    movementSlotId: string | null,
  ): Promise<void> {
    await api.put(`/admin/program-exercises/${exerciseRowId}/slot`, {
      movementSlotId,
    });
  },

  // ---- Athlete selections (admin/coach) ------------------------------------
  async getAthleteSelections(
    programId: string,
  ): Promise<AthleteSelectionRecord[]> {
    const { data } = await api.get(
      `/admin/programs/${programId}/athlete-selections`,
    );
    return data.data ?? data;
  },

  async resetAthleteSelections(
    programId: string,
    userId: string,
  ): Promise<void> {
    await api.post(`/programs/${programId}/profile/reset-selections`, {
      userId,
    });
  },
};
