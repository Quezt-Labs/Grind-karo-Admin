import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Phone,
  Search,
  Video,
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

type BoardView = "attention" | "checkins" | "all";

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

function isCheckInDue(item: CoachOpsBoardItem, date: string): boolean {
  if (!item.nextCheckInDate) return false;
  return item.nextCheckInDate.slice(0, 10) <= date;
}

function needsAttention(item: CoachOpsBoardItem, date: string): boolean {
  return (
    item.setupStatus !== "ready" ||
    !item.formChecksDone ||
    !item.paymentDone ||
    isCheckInDue(item, date)
  );
}

function attentionScore(item: CoachOpsBoardItem, date: string): number {
  let score = 0;
  if (isCheckInDue(item, date)) score += 40;
  if (item.setupStatus === "awaiting_program") score += 30;
  if (item.setupStatus === "needs_sbd_videos") score += 25;
  if (item.setupStatus === "needs_intake") score += 20;
  if (!item.formChecksDone) score += 10;
  if (!item.paymentDone) score += 5;
  if (!item.coachId) score += 3;
  return score;
}

function parseView(raw: string | null): BoardView {
  if (raw === "checkins" || raw === "all" || raw === "attention") return raw;
  return "attention";
}

function OpsCheckbox({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
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
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40"
          : "border-amber-200 bg-amber-50 hover:bg-amber-100/80 dark:border-amber-900 dark:bg-amber-950/30 dark:hover:bg-amber-950/50",
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
  selectedDate,
  disabled,
  onSave,
}: {
  item: CoachOpsBoardItem;
  selectedDate: string;
  disabled?: boolean;
  onSave: (patch: {
    nextCheckInDate?: string | null;
    opsNotes?: string | null;
  }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(item.opsNotes ?? "");
  const [nextDate, setNextDate] = useState(item.nextCheckInDate ?? "");
  const due = isCheckInDue(item, selectedDate);

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
        className="group w-full min-w-36 text-left"
      >
        <p
          className={cn(
            "text-sm",
            due
              ? "font-semibold text-rose-700 dark:text-rose-300"
              : "text-gray-900 dark:text-gray-100",
          )}
        >
          {item.nextCheckInDate
            ? `${due ? "Due " : ""}${formatShortDate(item.nextCheckInDate)}`
            : "Set check-in"}
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));
  const [coachFilter, setCoachFilter] = useState("all");
  const [search, setSearch] = useState("");
  const view = parseView(searchParams.get("view"));

  function setView(next: BoardView) {
    const params = new URLSearchParams(searchParams);
    if (next === "attention") params.delete("view");
    else params.set("view", next);
    setSearchParams(params, { replace: true });
  }

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
      void queryClient.invalidateQueries({ queryKey: ["workspace-ops-board"] });
    },
    onError: () => toast.error("Failed to save"),
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const summary = useMemo(() => {
    const programGaps = items.filter((i) => i.setupStatus !== "ready").length;
    const formOpen = items.filter((i) => !i.formChecksDone).length;
    const paymentOpen = items.filter((i) => !i.paymentDone).length;
    const checkIns = items.filter((i) => isCheckInDue(i, selectedDate)).length;
    const attention = items.filter((i) =>
      needsAttention(i, selectedDate),
    ).length;
    const unassigned = items.filter((i) => !i.coachId).length;
    return {
      total: items.length,
      programGaps,
      formOpen,
      paymentOpen,
      checkIns,
      attention,
      unassigned,
    };
  }, [items, selectedDate]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = items;
    if (view === "attention") {
      rows = rows.filter((i) => needsAttention(i, selectedDate));
    } else if (view === "checkins") {
      rows = rows.filter((i) => isCheckInDue(i, selectedDate));
    }
    if (q) {
      rows = rows.filter((i) => {
        const hay =
          `${i.athleteName ?? ""} ${i.athleteEmail} ${i.coachName ?? ""} ${i.opsNotes ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return [...rows].sort((a, b) => {
      const score =
        attentionScore(b, selectedDate) - attentionScore(a, selectedDate);
      if (score !== 0) return score;
      return athleteLabel(a).localeCompare(athleteLabel(b));
    });
  }, [items, view, selectedDate, search]);

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

  const views: Array<{ id: BoardView; label: string; count: number }> = [
    { id: "attention", label: "Needs attention", count: summary.attention },
    { id: "checkins", label: "Check-ins due", count: summary.checkIns },
    { id: "all", label: "All athletes", count: summary.total },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily ops"
        description={
          isAdmin
            ? "Work the open list — don’t tick every athlete. Filter by coach when needed."
            : "Your open coaching checklist for today."
        }
      />

      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                <SelectTrigger className="w-[200px]">
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

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900/60">
            {views.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === v.id
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200",
                )}
              >
                {v.label}
                <span className="ml-1.5 tabular-nums text-xs text-gray-500">
                  {v.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search athlete, coach, notes…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-600 dark:bg-gray-900"
            />
          </div>
        </div>
      </div>

      {!isLoading && !isError && summary.total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatPill
            label="Needs attention"
            value={summary.attention}
            tone={summary.attention > 0 ? "amber" : "green"}
          />
          <StatPill
            label="Program gaps"
            value={summary.programGaps}
            tone={summary.programGaps > 0 ? "amber" : undefined}
          />
          <StatPill label="FC still open" value={summary.formOpen} />
          <StatPill label="Payment open" value={summary.paymentOpen} />
          <StatPill
            label="Check-ins due"
            value={summary.checkIns}
            tone={summary.checkIns > 0 ? "rose" : undefined}
          />
        </div>
      )}

      {isAdmin &&
      !isLoading &&
      summary.unassigned > 0 &&
      view !== "checkins" ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {summary.unassigned} athlete
          {summary.unassigned === 1 ? "" : "s"} have no assistant coach
          assigned.
        </p>
      ) : null}

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
                <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Why open
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
                <TableHead className="h-auto px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 7 : 6}
                    className="px-4 py-12 text-center text-sm text-gray-500"
                  >
                    <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    {view === "checkins"
                      ? "No check-ins due for this date."
                      : view === "attention"
                        ? "All clear — nothing needs attention."
                        : "No coaching athletes on this board."}
                  </TableCell>
                </TableRow>
              ) : (
                visibleItems.map((item) => {
                  const due = isCheckInDue(item, selectedDate);
                  const reasons: string[] = [];
                  if (item.setupStatus !== "ready") reasons.push("Program");
                  if (!item.formChecksDone) reasons.push("FC");
                  if (!item.paymentDone) reasons.push("Payment");
                  if (due) reasons.push("Check-in");

                  return (
                    <TableRow
                      key={item.athleteId}
                      className={cn(due && "bg-rose-50/40 dark:bg-rose-950/10")}
                    >
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
                            <span className="text-sm text-amber-700 dark:text-amber-300">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="px-4 py-3">
                        {item.setupStatus !== "ready" ? (
                          <Link
                            to={`/coaching/${item.athleteId}/editor`}
                            className="inline-block"
                          >
                            <CoachingSetupStatusBadge
                              status={item.setupStatus}
                            />
                          </Link>
                        ) : reasons.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {reasons.map((r) => (
                              <span
                                key={r}
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                  r === "Check-in"
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
                                )}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-emerald-700 dark:text-emerald-300">
                            Clear
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <OpsCheckbox
                          checked={item.formChecksDone}
                          disabled={patchMutation.isPending}
                          onChange={(next) =>
                            patchItem(item.athleteId, {
                              formChecksDone: next,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <OpsCheckbox
                          checked={item.paymentDone}
                          disabled={patchMutation.isPending}
                          onChange={(next) =>
                            patchItem(item.athleteId, { paymentDone: next })
                          }
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <NotesCell
                          item={item}
                          selectedDate={selectedDate}
                          disabled={patchMutation.isPending}
                          onSave={(patch) => patchItem(item.athleteId, patch)}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {item.setupStatus !== "ready" ? (
                            <Link
                              to={`/coaching/${item.athleteId}/editor`}
                              className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                              Build
                            </Link>
                          ) : null}
                          {!item.formChecksDone ? (
                            <Link
                              to={`/form-checks?review=pending&userId=${item.athleteId}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline dark:text-amber-300"
                            >
                              <Video className="h-3 w-3" />
                              Review
                            </Link>
                          ) : null}
                          {due ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-300">
                              <Phone className="h-3 w-3" />
                              Call
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
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
  tone?: "green" | "amber" | "rose";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        tone === "green"
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
          : tone === "amber"
            ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
            : tone === "rose"
              ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30"
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
