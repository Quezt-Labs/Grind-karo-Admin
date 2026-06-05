import api from "./api";
import type {
  SheetsMyProgramResponse,
  MovementSelectionResponse,
  PatchMovementSelectionPayload,
  CreateClientSheetPayload,
  CreateClientSheetResponse,
} from "@/types/programs";

export const sheetsService = {
  /**
   * GET /sheets/my-program
   * Returns parsed rows for all coach-template tabs for the authenticated athlete.
   * Admin: useful for previewing a client's workbook state.
   */
  async getMyProgram(): Promise<SheetsMyProgramResponse> {
    const { data } = await api.get("/sheets/my-program");
    return data;
  },

  /**
   * GET /sheets/my-program/movement-selection
   * Reads Athlete Dashboard movement cells (squat/bench/deadlift primary/secondary/tertiary).
   */
  async getMovementSelection(): Promise<MovementSelectionResponse> {
    const { data } = await api.get("/sheets/my-program/movement-selection");
    return data;
  },

  /**
   * PATCH /sheets/my-program/movement-selection
   * Updates one movement selection cell; sheet formulas recalculate loads on next read.
   */
  async patchMovementSelection(
    payload: PatchMovementSelectionPayload,
  ): Promise<{ success: true; message: string }> {
    const { data } = await api.patch(
      "/sheets/my-program/movement-selection",
      payload,
    );
    return data;
  },

  /**
   * POST /sheets/admin/create-client-sheet
   * Admin only — copies the coach template workbook for a specific user and
   * stores the resulting spreadsheet_id on that user record.
   */
  async createClientSheet(
    payload: CreateClientSheetPayload,
  ): Promise<CreateClientSheetResponse> {
    const { data } = await api.post(
      "/sheets/admin/create-client-sheet",
      payload,
    );
    return data;
  },

  /** Coach edited athlete sheet — athlete app refreshes cached layout. */
  async notifySheetUpdated(
    userId: string,
  ): Promise<{ success: true; sheetContentRevision: number }> {
    const { data } = await api.post(
      `/sheets/admin/users/${userId}/notify-sheet-updated`,
    );
    return data;
  },
};
