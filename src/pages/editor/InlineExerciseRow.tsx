import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { programService } from "@/services/programService";
import { exerciseService } from "@/services/exerciseService";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
import type { ExerciseCategory } from "@/types/programs";
import {
  EXERCISE_CATEGORY_ORDER,
  EXERCISE_CATEGORY_LABELS,
  flattenExercises,
} from "@/utils/exerciseLibrary";

const CATEGORY_OPTIONS: { value: ExerciseCategory; label: string }[] =
  EXERCISE_CATEGORY_ORDER.map((value) => ({
    value,
    label: EXERCISE_CATEGORY_LABELS[value],
  }));

interface InlineExerciseRowProps {
  programId: string;
  dayId: string;
  nextSortOrder: number;
  compact?: boolean;
  onSuccess: () => void;
}

interface RowData {
  category: ExerciseCategory;
  exerciseId: string;
  exerciseNameOverride: string;
  sets: string;
  repScheme: string;
  targetRpe: string;
  percentOneRm: string;
  loadNote: string;
  notes: string;
}

const emptyRow: RowData = {
  category: "ACCESSORY",
  exerciseId: "",
  exerciseNameOverride: "",
  sets: "",
  repScheme: "",
  targetRpe: "",
  percentOneRm: "",
  loadNote: "",
  notes: "",
};

export function InlineExerciseRow({
  programId,
  dayId,
  nextSortOrder,
  onSuccess,
}: InlineExerciseRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [row, setRow] = useState<RowData>(emptyRow);
  const nameRef = useRef<HTMLInputElement>(null);

  const { data: groupedExercises } = useQuery({
    queryKey: ["exercises"],
    queryFn: exerciseService.getAll,
    enabled: isAdding,
  });

  const categories = groupedExercises?.categories;
  const activeExercises = groupedExercises
    ? flattenExercises(groupedExercises).filter((e) => e.isActive)
    : [];

  const createMut = useMutation({
    mutationFn: () => {
      const pctValue = row.percentOneRm
        ? Math.round(parseFloat(row.percentOneRm) * 100)
        : null;
      return programService.createExerciseRow(programId, dayId, {
        sortOrder: nextSortOrder,
        category: row.category,
        exerciseId: row.exerciseId || null,
        exerciseNameOverride: row.exerciseNameOverride || null,
        sets: row.sets ? parseInt(row.sets) : null,
        repScheme: row.repScheme || null,
        targetRpe: row.targetRpe || null,
        percentOneRm: pctValue,
        loadNote: row.loadNote || null,
        notes: row.notes || null,
      });
    },
    onSuccess: () => {
      toast.success("Exercise added!");
      setRow(emptyRow);
      onSuccess();
      // Keep adding mode open for quick sequential adds
      setTimeout(() => nameRef.current?.focus(), 100);
    },
    onError: () => {
      toast.error("Failed to add exercise");
    },
  });

  useEffect(() => {
    if (isAdding) {
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [isAdding]);

  function handleExerciseSelect(exerciseId: string) {
    const ex = activeExercises.find((e) => e.id === exerciseId);
    if (ex) {
      setRow((prev) => ({
        ...prev,
        exerciseId: ex.id,
        category: ex.category,
        exerciseNameOverride: "",
      }));
    } else {
      setRow((prev) => ({ ...prev, exerciseId: "" }));
    }
  }

  function handleSubmit() {
    if (!row.exerciseId && !row.exerciseNameOverride) {
      toast.error("Enter an exercise name or select from library");
      return;
    }
    createMut.mutate();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setIsAdding(false);
      setRow(emptyRow);
    }
  }

  if (!isAdding) {
    return (
      <tr>
        <td colSpan={10} className="py-2">
          <button
            onClick={() => setIsAdding(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs font-medium text-primary-600 transition-colors hover:border-primary-400 hover:bg-primary-50 dark:border-gray-600 dark:text-primary-400 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Exercise
          </button>
        </td>
      </tr>
    );
  }

  return (
    <>
      {/* Row 1: Main fields */}
      <tr className="border-t border-dashed border-primary-300 bg-primary-50/50 dark:border-primary-700 dark:bg-primary-900/10">
        <td className="py-1.5 pl-2 text-xs text-gray-400">
          {nextSortOrder + 1}
        </td>
        <td className="py-1.5" colSpan={2}>
          {/* Exercise picker: library dropdown + manual override, side by side */}
          <div className="flex items-center gap-1">
            <Select
              value={row.exerciseId || undefined}
              onValueChange={(v) => handleExerciseSelect(v)}
            >
              <SelectTrigger className="w-44 shrink-0 rounded border border-gray-300 bg-white px-1.5 py-1 text-xs h-7 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
                <SelectValue placeholder="-- Library --" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((cat) => {
                  const catExercises = (categories?.[cat.value] ?? []).filter(
                    (e) => e.isActive,
                  );
                  if (catExercises.length === 0) return null;
                  return (
                    <SelectGroup key={cat.value}>
                      <SelectLabel>{cat.label}</SelectLabel>
                      {catExercises.map((ex) => (
                        <SelectItem key={ex.id} value={ex.id}>
                          {ex.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
            <span className="shrink-0 text-[10px] text-gray-400">or</span>
            <input
              ref={nameRef}
              value={row.exerciseNameOverride}
              onChange={(e) =>
                setRow((prev) => ({
                  ...prev,
                  exerciseNameOverride: e.target.value,
                  exerciseId: e.target.value ? "" : prev.exerciseId,
                }))
              }
              onKeyDown={handleKeyDown}
              placeholder="type name manually…"
              disabled={!!row.exerciseId}
              className="min-w-0 flex-1 rounded border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:disabled:bg-gray-800"
            />
          </div>
        </td>
        <td className="py-1.5 px-1">
          <Select
            value={row.category}
            onValueChange={(v) =>
              setRow((prev) => ({
                ...prev,
                category: v as ExerciseCategory,
              }))
            }
          >
            <SelectTrigger className="w-full rounded border border-gray-300 bg-white px-1 py-1 text-xs h-7 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="py-1.5 px-1">
          <input
            value={row.sets}
            onChange={(e) =>
              setRow((prev) => ({ ...prev, sets: e.target.value }))
            }
            onKeyDown={handleKeyDown}
            type="number"
            min={0}
            placeholder="3"
            className="w-14 rounded border border-gray-300 bg-white px-1.5 py-1 text-center text-xs text-gray-900 focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </td>
        <td className="py-1.5 px-1">
          <input
            value={row.repScheme}
            onChange={(e) =>
              setRow((prev) => ({ ...prev, repScheme: e.target.value }))
            }
            onKeyDown={handleKeyDown}
            placeholder="5-8"
            className="w-16 rounded border border-gray-300 bg-white px-1.5 py-1 text-center text-xs text-gray-900 focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </td>
        <td className="py-1.5 px-1">
          <input
            value={row.targetRpe}
            onChange={(e) =>
              setRow((prev) => ({ ...prev, targetRpe: e.target.value }))
            }
            onKeyDown={handleKeyDown}
            placeholder="@7"
            className="w-14 rounded border border-gray-300 bg-white px-1.5 py-1 text-center text-xs text-gray-900 focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </td>
        <td className="py-1.5 px-1">
          <input
            value={row.percentOneRm}
            onChange={(e) =>
              setRow((prev) => ({ ...prev, percentOneRm: e.target.value }))
            }
            onKeyDown={handleKeyDown}
            placeholder="53%"
            className="w-16 rounded border border-gray-300 bg-white px-1.5 py-1 text-center text-xs text-gray-900 focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </td>
        <td className="py-1.5 px-1">
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleSubmit}
              disabled={createMut.isPending}
              className="rounded p-1 text-green-600 hover:bg-green-50 disabled:opacity-50 dark:hover:bg-green-900/20"
              title="Save (Enter)"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setRow(emptyRow);
              }}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Cancel (Esc)"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {/* Row 2: Extra fields (load note, notes) */}
      <tr className="bg-primary-50/50 dark:bg-primary-900/10">
        <td></td>
        <td colSpan={5} className="pb-2 pr-1">
          <input
            value={row.loadNote}
            onChange={(e) =>
              setRow((prev) => ({ ...prev, loadNote: e.target.value }))
            }
            onKeyDown={handleKeyDown}
            placeholder="Load note: e.g. ascending sets @8,9,9"
            className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </td>
        <td colSpan={4} className="pb-2 pr-2">
          <input
            value={row.notes}
            onChange={(e) =>
              setRow((prev) => ({ ...prev, notes: e.target.value }))
            }
            onKeyDown={handleKeyDown}
            placeholder="Notes: e.g. pause at bottom, slow eccentric"
            className="w-full rounded border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </td>
      </tr>
    </>
  );
}
