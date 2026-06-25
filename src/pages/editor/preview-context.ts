import { createContext } from "react";
import type { MovementSlot, ExerciseRow } from "@/types/programs";
import type {
  PreviewInputs,
  PreviewRowState,
} from "@/utils/programPreviewCompute";

export interface ProgramPreviewContextValue {
  enabled: boolean;
  inputs: PreviewInputs;
  setInputs: React.Dispatch<React.SetStateAction<PreviewInputs>>;
  slots: MovementSlot[];
  getPreviewRow: (
    dayExercises: ExerciseRow[],
    rowId: string,
  ) => PreviewRowState | null;
  getLoadForRow: (dayExercises: ExerciseRow[], rowId: string) => number | null;
}

export const defaultPreviewInputs: PreviewInputs = {
  squat: 150,
  bench: 100,
  deadlift: 180,
  has125kgPlates: true,
  movementSelections: {},
};

export const ProgramPreviewContext =
  createContext<ProgramPreviewContextValue | null>(null);
