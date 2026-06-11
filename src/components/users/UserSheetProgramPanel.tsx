import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { FormCheckSheetContextBadges } from "@/components/shared/FormCheckSheetContext";
import { sheetsSetVideoService } from "@/services/sheetsSetVideoService";
import { cn } from "@/utils/cn";

interface SheetExerciseRow {
  weekNumber: number;
  dayNumber: number;
  dayFocus?: string;
  category: string;
  exerciseName: string;
  goalRpe: string;
  sets: number | null;
  repScheme: string;
  loadKg: string;
  sortOrder: number;
  actualLoad?: string;
  actualRpe?: string;
}

interface SheetTabPayload {
  exercises: SheetExerciseRow[];
}

function toSheetContext(row: SheetExerciseRow) {
  return {
    category: row.category?.trim() || null,
    sortOrder: row.sortOrder,
    prescriptionSets: row.sets,
    repScheme: row.repScheme?.trim() || null,
    goalRpe: row.goalRpe?.trim() || null,
    loadKg: row.loadKg?.trim() || null,
    actualLoad: row.actualLoad?.trim() || null,
    actualRpe: row.actualRpe?.trim() || null,
  };
}

interface UserSheetProgramPanelProps {
  userId: string;
}

export function UserSheetProgramPanel({ userId }: UserSheetProgramPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-user-sheet-program", userId],
    queryFn: () => sheetsSetVideoService.getUserProgram(userId),
    retry: false,
  });

  const tabs = useMemo(() => {
    if (!data) return [];
    return Object.entries(data)
      .filter(([, tab]) => (tab.exercises?.length ?? 0) > 0)
      .map(([name]) => name)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [data]);

  const [tabName, setTabName] = useState<string>("");
  const [weekFilter, setWeekFilter] = useState<number | "all">("all");
  const [dayFilter, setDayFilter] = useState<number | "all">("all");

  const activeTab = tabName || tabs[0] || "";

  const exercises = useMemo(() => {
    if (!data || !activeTab) return [];
    const tab = data[activeTab] as SheetTabPayload | undefined;
    return tab?.exercises ?? [];
  }, [data, activeTab]);

  const weeks = useMemo(() => {
    const set = new Set<number>();
    for (const row of exercises) set.add(row.weekNumber);
    return [...set].sort((a, b) => a - b);
  }, [exercises]);

  const days = useMemo(() => {
    const set = new Set<number>();
    for (const row of exercises) {
      if (weekFilter === "all" || row.weekNumber === weekFilter) {
        set.add(row.dayNumber);
      }
    }
    return [...set].sort((a, b) => a - b);
  }, [exercises, weekFilter]);

  const filtered = useMemo(() => {
    return exercises.filter((row) => {
      if (weekFilter !== "all" && row.weekNumber !== weekFilter) return false;
      if (dayFilter !== "all" && row.dayNumber !== dayFilter) return false;
      return true;
    });
  }, [exercises, weekFilter, dayFilter]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
        No program sheet linked for this athlete yet.
      </div>
    );
  }

  if (tabs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
        Sheet is linked but no workout rows were parsed yet.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Sheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sheet program
        </h2>
        <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {filtered.length} rows
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setTabName(tab);
              setWeekFilter("all");
              setDayFilter("all");
            }}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              activeTab === tab
                ? "bg-indigo-600 text-white"
                : "border border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <select
          value={weekFilter === "all" ? "all" : String(weekFilter)}
          onChange={(e) => {
            const v = e.target.value;
            setWeekFilter(v === "all" ? "all" : Number.parseInt(v, 10));
            setDayFilter("all");
          }}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
        >
          <option value="all">All weeks</option>
          {weeks.map((w) => (
            <option key={w} value={w}>
              Week {w}
            </option>
          ))}
        </select>
        <select
          value={dayFilter === "all" ? "all" : String(dayFilter)}
          onChange={(e) => {
            const v = e.target.value;
            setDayFilter(v === "all" ? "all" : Number.parseInt(v, 10));
          }}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
        >
          <option value="all">All days</option>
          {days.map((d) => (
            <option key={d} value={d}>
              Day {d}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((row) => (
          <div
            key={`${row.weekNumber}-${row.dayNumber}-${row.sortOrder}-${row.exerciseName}`}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {row.exerciseName}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  W{row.weekNumber} · Day {row.dayNumber}
                  {row.dayFocus ? ` · ${row.dayFocus}` : ""}
                </p>
              </div>
            </div>
            <FormCheckSheetContextBadges ctx={toSheetContext(row)} />
          </div>
        ))}
      </div>
    </div>
  );
}
