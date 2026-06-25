import { useMemo, useState, type ReactNode } from "react";
import type { MovementSlot, ExerciseRow } from "@/types/programs";
import { computeDayPreview } from "@/utils/programPreviewCompute";
import {
  ProgramPreviewContext,
  defaultPreviewInputs,
  type ProgramPreviewContextValue,
} from "./preview-context";

export function ProgramPreviewProvider({
  children,
  slots,
  enabled,
}: {
  children: ReactNode;
  slots: MovementSlot[];
  enabled: boolean;
}) {
  const [inputs, setInputs] = useState(defaultPreviewInputs);

  const value = useMemo<ProgramPreviewContextValue>(
    () => ({
      enabled,
      inputs,
      setInputs,
      slots,
      getPreviewRow: (dayExercises: ExerciseRow[], rowId: string) => {
        if (!enabled) return null;
        const preview = computeDayPreview(dayExercises, slots, inputs);
        return preview.get(rowId) ?? null;
      },
      getLoadForRow: (dayExercises: ExerciseRow[], rowId: string) => {
        if (!enabled) return null;
        const preview = computeDayPreview(dayExercises, slots, inputs);
        return preview.get(rowId)?.load ?? null;
      },
    }),
    [enabled, inputs, slots],
  );

  return (
    <ProgramPreviewContext.Provider value={value}>
      {children}
    </ProgramPreviewContext.Provider>
  );
}
