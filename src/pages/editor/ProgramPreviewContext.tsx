import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { MovementSlot, ExerciseRow } from "@/types/programs";
import { computeDayPreview } from "@/utils/programPreviewCompute";
import type { PreviewInputs } from "@/utils/programPreviewCompute";
import {
  ProgramPreviewContext,
  defaultPreviewInputs,
  type ProgramPreviewContextValue,
} from "./preview-context";

function readStoredInputs(storageKey: string): PreviewInputs | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      return { ...defaultPreviewInputs, ...JSON.parse(raw) } as PreviewInputs;
    }
  } catch {
    // ignore
  }
  return null;
}

function mergePreviewInputs(
  athleteProfileInputs?: Partial<PreviewInputs> | null,
): PreviewInputs {
  return { ...defaultPreviewInputs, ...athleteProfileInputs };
}

export function ProgramPreviewProvider({
  children,
  slots,
  enabled,
  programId,
  athleteProfileInputs,
}: {
  children: ReactNode;
  slots: MovementSlot[];
  enabled: boolean;
  programId?: string;
  /** Athlete SBD 1RMs — used when no saved preview inputs exist (coaching editor). */
  athleteProfileInputs?: Partial<PreviewInputs> | null;
}) {
  const storageKey = programId
    ? `program-editor-e1rm:${programId}`
    : "program-editor-e1rm:default";

  const [savedInputs, setSavedInputs] = useState<PreviewInputs | null>(() =>
    readStoredInputs(storageKey),
  );

  const inputs = useMemo(
    () => savedInputs ?? mergePreviewInputs(athleteProfileInputs),
    [savedInputs, athleteProfileInputs],
  );

  const setInputsPersisted = useCallback<
    React.Dispatch<React.SetStateAction<PreviewInputs>>
  >(
    (value) => {
      setSavedInputs((prev) => {
        const current = prev ?? mergePreviewInputs(athleteProfileInputs);
        const next = typeof value === "function" ? value(current) : value;
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [storageKey, athleteProfileInputs],
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
