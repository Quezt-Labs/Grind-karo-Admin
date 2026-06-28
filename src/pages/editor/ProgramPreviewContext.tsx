import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { MovementSlot, ExerciseRow } from "@/types/programs";
import { computeDayPreview } from "@/utils/programPreviewCompute";
import type { PreviewInputs } from "@/utils/programPreviewCompute";
import {
  ProgramPreviewContext,
  defaultPreviewInputs,
  type ProgramPreviewContextValue,
} from "./preview-context";

export function ProgramPreviewProvider({
  children,
  slots,
  enabled,
  programId,
}: {
  children: ReactNode;
  slots: MovementSlot[];
  enabled: boolean;
  programId?: string;
}) {
  const storageKey = programId
    ? `program-editor-e1rm:${programId}`
    : "program-editor-e1rm:default";

  const [inputs, setInputs] = useState<PreviewInputs>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        return { ...defaultPreviewInputs, ...JSON.parse(raw) } as PreviewInputs;
      }
    } catch {
      // ignore
    }
    return defaultPreviewInputs;
  });

  const setInputsPersisted = useCallback<
    React.Dispatch<React.SetStateAction<PreviewInputs>>
  >(
    (value) => {
      setInputs((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [storageKey],
  );

  const value = useMemo<ProgramPreviewContextValue>(
    () => ({
      enabled,
      inputs,
      setInputs: setInputsPersisted,
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
    [enabled, inputs, slots, setInputsPersisted],
  );

  return (
    <ProgramPreviewContext.Provider value={value}>
      {children}
    </ProgramPreviewContext.Provider>
  );
}
