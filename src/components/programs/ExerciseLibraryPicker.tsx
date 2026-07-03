import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEventHandler,
} from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/utils/cn";
import { FieldInfoIcon } from "@/components/ui/FieldInfoIcon";
import type { Exercise, ExercisesGrouped } from "@/types/programs";
import {
  EXERCISE_CATEGORY_LABELS,
  EXERCISE_CATEGORY_ORDER,
  countFilteredExercises,
  filterGroupedExercisesForPicker,
  findExerciseById,
  type ExerciseLibraryCategoryFilter,
} from "@/utils/exerciseLibrary";

const CATEGORY_TABS: { value: ExerciseLibraryCategoryFilter; label: string }[] =
  [
    { value: "ALL", label: "All" },
    ...EXERCISE_CATEGORY_ORDER.filter((c) => c !== "OTHER").map((value) => ({
      value,
      label: EXERCISE_CATEGORY_LABELS[value],
    })),
  ];

type ExerciseLibraryPickerProps = {
  id?: string;
  label?: string;
  labelInfo?: string;
  value: string;
  onValueChange: (exerciseId: string) => void;
  onExercisePick?: (exercise: Exercise) => void;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
  groupedExercises?: ExercisesGrouped;
  activeOnly?: boolean;
  manualOptionLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  compact?: boolean;
};

export function ExerciseLibraryPicker({
  id,
  label,
  labelInfo,
  value,
  onValueChange,
  onExercisePick,
  onBlur,
  groupedExercises,
  activeOnly = true,
  manualOptionLabel = "— Manual name only —",
  placeholder = "Search or pick from library…",
  disabled,
  error,
  compact,
}: ExerciseLibraryPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryTab, setCategoryTab] =
    useState<ExerciseLibraryCategoryFilter>("ALL");

  const selected = findExerciseById(groupedExercises, value);

  const filtered = useMemo(() => {
    if (!groupedExercises) {
      return { categories: {} } as ExercisesGrouped;
    }
    return filterGroupedExercisesForPicker(groupedExercises, {
      search,
      category: categoryTab,
      activeOnly,
    });
  }, [groupedExercises, search, categoryTab, activeOnly]);

  const resultCount = groupedExercises ? countFilteredExercises(filtered) : 0;

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
    setCategoryTab("ALL");
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  function pickManual() {
    onValueChange("");
    close();
  }

  function pickExercise(exercise: Exercise) {
    onValueChange(exercise.id);
    onExercisePick?.(exercise);
    close();
  }

  const triggerLabel = selected?.name ?? (value ? "Selected exercise" : "");

  return (
    <div ref={rootRef} className="relative w-full">
      {label && (
        <div className="mb-1.5 flex items-center gap-1.5">
          <label
            htmlFor={id}
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
          {labelInfo && <FieldInfoIcon title={labelInfo} />}
        </div>
      )}

      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onBlur={onBlur}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm transition-colors",
          "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100",
          compact && "h-7 px-2 py-1 text-xs",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
        )}
      >
        <span className={cn("truncate", !triggerLabel && "text-gray-400")}>
          {triggerLabel || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 opacity-50 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-[250] mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg",
            "dark:border-gray-700 dark:bg-gray-800",
          )}
        >
          <div className="border-b border-gray-100 p-2 dark:border-gray-700">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search squat, bench, paused…"
                className="w-full rounded-md border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setCategoryTab(tab.value)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors",
                    categoryTab === tab.value
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <ul
            id={listId}
            role="listbox"
            className="max-h-64 overflow-y-auto p-1"
          >
            <li role="option" aria-selected={!value}>
              <button
                type="button"
                onClick={pickManual}
                className={cn(
                  "flex w-full rounded-md px-2 py-2 text-left text-sm transition-colors",
                  !value
                    ? "bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700",
                )}
              >
                {manualOptionLabel}
              </button>
            </li>

            {!groupedExercises && (
              <li className="px-2 py-3 text-center text-xs text-gray-400">
                Loading exercises…
              </li>
            )}

            {groupedExercises && resultCount === 0 && (
              <li className="px-2 py-3 text-center text-xs text-gray-400">
                No exercises match your search
              </li>
            )}

            {EXERCISE_CATEGORY_ORDER.map((cat) => {
              const rows = filtered.categories[cat] ?? [];
              if (rows.length === 0) return null;
              return (
                <li key={cat}>
                  <p className="sticky top-0 z-10 bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:bg-gray-800">
                    {EXERCISE_CATEGORY_LABELS[cat]}
                  </p>
                  <ul>
                    {rows.map((exercise) => (
                      <li
                        key={exercise.id}
                        role="option"
                        aria-selected={value === exercise.id}
                      >
                        <button
                          type="button"
                          onClick={() => pickExercise(exercise)}
                          className={cn(
                            "flex w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                            value === exercise.id
                              ? "bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                              : "text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700",
                          )}
                        >
                          {exercise.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>

          {groupedExercises && (
            <div className="border-t border-gray-100 px-2 py-1.5 text-[10px] text-gray-400 dark:border-gray-700">
              {resultCount} exercise{resultCount === 1 ? "" : "s"}
              {search ? ` matching “${search}”` : ""}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
