import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Checkbox } from "@/components/ui/ShadCheckbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/ShadTable";
import { CoachingSetupStatusBadge } from "@/pages/users/CoachingSetupStatusBadge";
import { coachOpsService } from "@/services/coachOpsService";
import { useAuth } from "@/hooks/useAuth";
import type { CoachOpsBoardItem } from "@/types/coachOps";
import { cn } from "@/utils/cn";

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d);
}

function formatBoardDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  return parseIsoDate(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function athleteLabel(item: CoachOpsBoardItem): string {
  return item.athleteName?.trim() || item.athleteEmail;
}

function OpsCheckbox({
  checked,
  disabled,
  onChange,
  variant,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  variant: "success" | "neutral";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? variant === "success"
            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40"
            : "border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-950/40"
          : "border-red-200 bg-red-50 hover:bg-red-100/80 dark:border-red-900 dark:bg-red-950/30 dark:hover:bg-red-950/50",
      )}
      aria-label={checked ? "Done" : "Pending"}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        className="pointer-events-none"
        tabIndex={-1}
      />
    </button>
  );
}

function NotesCell({
  item,
  disabled,
  onSave,
}: {
  item: CoachOpsBoardItem;
  disabled?: boolean;
  onSave: (patch: {
    nextCheckInDate?: string | null;
    opsNotes?: string | null;
  }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(item.opsNotes ?? "");
  const [nextDate, setNextDate] = useState(item.nextCheckInDate ?? "");

  if (!editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setNotes(item.opsNotes ?? "");
          setNextDate(item.nextCheckInDate ?? "");
          setEditing(true);
        }}
        className="group w-full min-w-[8rem] text-left"
      >
        <p className="text-sm text-gray-900 dark:text-gray-100">
          {formatShortDate(item.nextCheckInDate)}
        </p>
        {item.opsNotes ? (
          <p className="mt-0.5 truncate text-xs text-gray-500 group-hover:text-gray-700 dark:text-gray-400">
            {item.opsNotes}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-gray-400 opacity-0 group-hover:opacity-100">
            Add notes
          </p>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="date"
        value={nextDate}
        onChange={(e) => setNextDate(e.target.value)}
        className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900"
      />
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Break, call, etc."
        className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-900"
      />
      <div className="flex gap-1">
        <button
          type="button"
          className="rounded bg-primary-600 px-2 py-0.5 text-xs text-white"
          onClick={() => {
            onSave({
              nextCheckInDate: nextDate.trim() || null,
              opsNotes: notes.trim() || null,
            });
            setEditing(false);
          }}
        >
          Save
        </button>
        <button
          type="button"
          className="rounded px-2 py-0.5 text-xs text-gray-500"
          onClick={() => setEditing(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function CoachOpsBoardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "ADMIN";

  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));
  const [coachFilter, setCoachFilter] = useState("all");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["coach-ops-board", selectedDate, coachFilter],
    queryFn: () =>
      coachOpsService.getBoard({
        date: selectedDate,
        coachFilter: isAdmin ? coachFilter : undefined,
      }),
  });

  const patchMutation = useMutation({
    mutationFn: ({
      athleteId,
      patch,
    }: {
      athleteId: string;
      patch: Parameters<typeof coachOpsService.patchEntry>[1];
    }) => coachOpsService.patchEntry(athleteId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["coach-ops-board"] });
    },
    onError: () => toast.error("Failed to save"),
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const summary = useMemo(() => {
    const programReady = items.filter((i) => i.setupStatus === "ready").length;
    const formDone = items.filter((i) => i.formChecksDone).length;
    const paymentDone = items.filter((i) => i.paymentDone).length;
    return { programReady, formDone, paymentDone, total: items.length };
  }, [items]);

  function shiftDate(days: number) {
    const d = parseIsoDate(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(toIsoDate(d));
  }

  function patchItem(
    athleteId: string,
    patch: Omit<Parameters<typeof coachOpsService.patchEntry>[1], "date">,
  ) {
    patchMutation.mutate({
      athleteId,
      patch: { date: selectedDate, ...patch },
    });
  }

  function athleteHref(item: CoachOpsBoardItem): string {
    return isAdmin
      ? `/users/${item.athleteId}`
      : `/coach/athletes/${item.athleteId}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily ops"
        description={
          isAdmin
            ? "Coaching checklist for all athletes — filter by coach."
            : "Your daily coaching checklist."
        }
      />

      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 px-2">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {data
                ? formatBoardDate(data.date)
                : formatBoardDate(selectedDate)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            aria-label="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(toIsoDate(new Date()))}
            className="ml-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Today
          </button>
        </div>

        {isAdmin && (data?.coachFilters.length ?? 0) > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Coach
            </span>
            <Select value={coachFilter} onValueChange={setCoachFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All coaches" />
              </SelectTrigger>
              <SelectContent>
                {(data?.coachFilters ?? []).map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label} ({opt.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!isLoading && !isError && summary.total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill label="Athletes" value={summary.total} />
          <StatPill
            label="Program built"
            value={`${summary.programReady}/${summary.total}`}
            tone="green"
          />
          <StatPill
            label="Form checks"
            value={`${summary.formDone}/${summary.total}`}
          />
          <StatPill
            label="Payment"
            value={`${summary.paymentDone}/${summary.total}`}
          />
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}
      {isError && <ErrorAlert message="Failed to load ops board." />}

      {!isLoading && !isError && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-900/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Athlete
                </TableHead>
                {isAdmin && (
                  <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Coach
                  </TableHead>
                )}
                <TableHead className="h-auto px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Program
                </TableHead>
                <TableHead className="h-auto px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Form checks
                </TableHead>
                <TableHead className="h-auto px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Payment
                </TableHead>
                <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Next call / Notes
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 6 : 5}
                    className="px-4 py-12 text-center text-sm text-gray-500"
                  >
                    <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    No coaching athletes on this board.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.athleteId}>
                    <TableCell className="px-4 py-3">
                      <Link
                        to={athleteHref(item)}
                        className="text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
                      >
                        {athleteLabel(item)}
                      </Link>
                      {item.athleteName && (
                        <p className="text-xs text-gray-500">
                          {item.athleteEmail}
                        </p>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="px-4 py-3">
                        {item.coachId ? (
                          <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                            {item.coachName ?? "Assistant coach"}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="px-4 py-3 text-center">
                      {item.setupStatus === "ready" ? (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40">
                          <Checkbox
                            checked
                            disabled
                            className="pointer-events-none"
                          />
                        </span>
                      ) : (
                        <Link to={athleteHref(item)} className="inline-block">
                          <CoachingSetupStatusBadge status={item.setupStatus} />
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <OpsCheckbox
                        checked={item.formChecksDone}
                        disabled={patchMutation.isPending}
                        variant="neutral"
                        onChange={(next) =>
                          patchItem(item.athleteId, { formChecksDone: next })
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <OpsCheckbox
                        checked={item.paymentDone}
                        disabled={patchMutation.isPending}
                        variant="neutral"
                        onChange={(next) =>
                          patchItem(item.athleteId, { paymentDone: next })
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <NotesCell
                        item={item}
                        disabled={patchMutation.isPending}
                        onSave={(patch) => patchItem(item.athleteId, patch)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "green";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        tone === "green"
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
          : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40",
      )}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
