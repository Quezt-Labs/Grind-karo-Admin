import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Layers,
  Calendar,
  Sun,
  FileText,
  Pencil,
  Expand,
  Shrink,
  Dumbbell,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { programService } from "@/services/programService";
import type {
  Block,
  Week,
  Day,
  ExerciseRow,
  ProgramResource,
} from "@/types/programs";
import { BlockFormModal } from "./editor/BlockFormModal";
import { WeekFormModal } from "./editor/WeekFormModal";
import { DayFormModal } from "./editor/DayFormModal";
import { ExerciseRowFormModal } from "./editor/ExerciseRowFormModal";
import { ResourceFormModal } from "./editor/ResourceFormModal";
import { formatINR } from "./editor/programConstants";
import { StatCard, EmptySection } from "./editor/ProgramShared";
import { BlockNode } from "./editor/BlockNode";

/* ─── Main Page ───────────────────────────────────────────────────────── */

export function ProgramDetailPage() {
  const { id: programId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Expand / collapse — start with everything expanded
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [initialExpanded, setInitialExpanded] = useState(false);

  // Modal state
  const [blockModal, setBlockModal] = useState<{
    open: boolean;
    block?: Block;
  }>({ open: false });
  const [weekModal, setWeekModal] = useState<{
    open: boolean;
    blockId?: string;
    week?: Week;
  }>({ open: false });
  const [dayModal, setDayModal] = useState<{
    open: boolean;
    weekId?: string;
    day?: Day;
  }>({ open: false });
  const [exerciseRowModal, setExerciseRowModal] = useState<{
    open: boolean;
    dayId?: string;
    row?: ExerciseRow;
  }>({ open: false });
  const [resourceModal, setResourceModal] = useState<{
    open: boolean;
    resource?: ProgramResource;
  }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{
    type: string;
    id: string;
    name: string;
  } | null>(null);

  const {
    data: tree,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["program-tree", programId],
    queryFn: () => programService.getTree(programId!),
    enabled: !!programId,
  });

  // Auto-expand all on first load
  if (tree && !initialExpanded) {
    const blockIds = new Set(tree.blocks.map((b) => b.id));
    const weekIds = new Set(
      tree.blocks.flatMap((b) => b.weeks.map((w) => w.id)),
    );
    const dayIds = new Set(
      tree.blocks.flatMap((b) =>
        b.weeks.flatMap((w) => w.days.map((d) => d.id)),
      ),
    );
    setExpandedBlocks(blockIds);
    setExpandedWeeks(weekIds);
    setExpandedDays(dayIds);
    setInitialExpanded(true);
  }

  function refreshTree() {
    queryClient.invalidateQueries({ queryKey: ["program-tree", programId] });
  }

  // Expand / collapse all
  function expandAll() {
    if (!tree) return;
    setExpandedBlocks(new Set(tree.blocks.map((b) => b.id)));
    setExpandedWeeks(
      new Set(tree.blocks.flatMap((b) => b.weeks.map((w) => w.id))),
    );
    setExpandedDays(
      new Set(
        tree.blocks.flatMap((b) =>
          b.weeks.flatMap((w) => w.days.map((d) => d.id)),
        ),
      ),
    );
  }

  function collapseAll() {
    setExpandedBlocks(new Set());
    setExpandedWeeks(new Set());
    setExpandedDays(new Set());
  }

  // Summary counts
  const summaryStats = useMemo(() => {
    if (!tree) return null;
    const totalBlocks = tree.blocks.length;
    const totalWeeks = tree.blocks.reduce((acc, b) => acc + b.weeks.length, 0);
    const totalDays = tree.blocks.reduce(
      (acc, b) => acc + b.weeks.reduce((wa, w) => wa + w.days.length, 0),
      0,
    );
    const totalExercises = tree.blocks.reduce(
      (acc, b) =>
        acc +
        b.weeks.reduce(
          (wa, w) => wa + w.days.reduce((da, d) => da + d.exercises.length, 0),
          0,
        ),
      0,
    );
    return { totalBlocks, totalWeeks, totalDays, totalExercises };
  }, [tree]);

  // Delete mutations
  const deleteBlockMutation = useMutation({
    mutationFn: (blockId: string) =>
      programService.removeBlock(programId!, blockId),
    onSuccess: () => {
      toast.success("Block deleted");
      refreshTree();
      setDeleteTarget(null);
    },
  });
  const deleteWeekMutation = useMutation({
    mutationFn: (weekId: string) =>
      programService.removeWeek(programId!, weekId),
    onSuccess: () => {
      toast.success("Week deleted");
      refreshTree();
      setDeleteTarget(null);
    },
  });
  const deleteDayMutation = useMutation({
    mutationFn: (dayId: string) => programService.removeDay(programId!, dayId),
    onSuccess: () => {
      toast.success("Day deleted");
      refreshTree();
      setDeleteTarget(null);
    },
  });
  const deleteExerciseRowMutation = useMutation({
    mutationFn: (rowId: string) =>
      programService.removeExerciseRow(programId!, rowId),
    onSuccess: () => {
      toast.success("Exercise removed");
      refreshTree();
      setDeleteTarget(null);
    },
  });
  const deleteResourceMutation = useMutation({
    mutationFn: (resourceId: string) =>
      programService.removeResource(programId!, resourceId),
    onSuccess: () => {
      toast.success("Resource deleted");
      refreshTree();
      setDeleteTarget(null);
    },
  });

  function handleDelete() {
    if (!deleteTarget) return;
    switch (deleteTarget.type) {
      case "block":
        deleteBlockMutation.mutate(deleteTarget.id);
        break;
      case "week":
        deleteWeekMutation.mutate(deleteTarget.id);
        break;
      case "day":
        deleteDayMutation.mutate(deleteTarget.id);
        break;
      case "exercise":
        deleteExerciseRowMutation.mutate(deleteTarget.id);
        break;
      case "resource":
        deleteResourceMutation.mutate(deleteTarget.id);
        break;
    }
  }

  const isDeleting =
    deleteBlockMutation.isPending ||
    deleteWeekMutation.isPending ||
    deleteDayMutation.isPending ||
    deleteExerciseRowMutation.isPending ||
    deleteResourceMutation.isPending;

  function toggleBlock(id: string) {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleWeek(id: string) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleDay(id: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (isError || !tree) {
    return <ErrorAlert message="Failed to load program." />;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate("/programs")}
          className="mt-1 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {tree.name}
            </h1>
            <StatusBadge status={tree.isActive ? "Active" : "Inactive"} />
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {tree.slug} · {formatINR(tree.salePrice ?? tree.regularPrice)}
            {tree.programLengthWeeks
              ? ` · ${tree.programLengthWeeks} weeks`
              : ""}
          </p>
        </div>
      </div>

      {/* ── Summary Stats ──────────────────────────────────────────────── */}
      {summaryStats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Blocks"
            value={summaryStats.totalBlocks}
            icon={<Layers className="h-4 w-4" />}
            color="text-blue-500"
          />
          <StatCard
            label="Weeks"
            value={summaryStats.totalWeeks}
            icon={<Calendar className="h-4 w-4" />}
            color="text-orange-500"
          />
          <StatCard
            label="Training Days"
            value={summaryStats.totalDays}
            icon={<Sun className="h-4 w-4" />}
            color="text-yellow-500"
          />
          <StatCard
            label="Total Exercises"
            value={summaryStats.totalExercises}
            icon={<Dumbbell className="h-4 w-4" />}
            color="text-purple-500"
          />
        </div>
      )}

      {/* ── Content Tree ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Program Structure
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Expand All"
            >
              <Expand className="h-3.5 w-3.5" /> Expand All
            </button>
            <button
              onClick={collapseAll}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Collapse All"
            >
              <Shrink className="h-3.5 w-3.5" /> Collapse All
            </button>
            <Button size="sm" onClick={() => setBlockModal({ open: true })}>
              <Plus className="h-3.5 w-3.5" /> Add Block
            </Button>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Tip:</strong> Click &quot;Add Exercise&quot; in any day to
            type directly like a spreadsheet. Press{" "}
            <kbd className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[10px] dark:bg-blue-800">
              Enter
            </kbd>{" "}
            to save &amp; continue adding,{" "}
            <kbd className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[10px] dark:bg-blue-800">
              Esc
            </kbd>{" "}
            to cancel.
          </span>
        </div>

        {tree.blocks.length === 0 ? (
          <EmptySection
            icon={<Layers className="h-8 w-8" />}
            message="No blocks yet. Add a block to start building the program."
            actionLabel="Add First Block"
            onAction={() => setBlockModal({ open: true })}
          />
        ) : (
          <div className="space-y-3">
            {tree.blocks
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((block) => (
                <BlockNode
                  key={block.id}
                  programId={programId!}
                  block={block}
                  expanded={expandedBlocks.has(block.id)}
                  onToggle={() => toggleBlock(block.id)}
                  expandedWeeks={expandedWeeks}
                  toggleWeek={toggleWeek}
                  expandedDays={expandedDays}
                  toggleDay={toggleDay}
                  onEditBlock={() => setBlockModal({ open: true, block })}
                  onDeleteBlock={() =>
                    setDeleteTarget({
                      type: "block",
                      id: block.id,
                      name: block.name,
                    })
                  }
                  onAddWeek={(blockId) => setWeekModal({ open: true, blockId })}
                  onEditWeek={(week) => setWeekModal({ open: true, week })}
                  onDeleteWeek={(week) =>
                    setDeleteTarget({
                      type: "week",
                      id: week.id,
                      name: week.title,
                    })
                  }
                  onAddDay={(weekId) => setDayModal({ open: true, weekId })}
                  onEditDay={(day) => setDayModal({ open: true, day })}
                  onDeleteDay={(day) =>
                    setDeleteTarget({
                      type: "day",
                      id: day.id,
                      name: day.title,
                    })
                  }
                  onEditExercise={(row) =>
                    setExerciseRowModal({ open: true, row })
                  }
                  onDeleteExercise={(row) =>
                    setDeleteTarget({
                      type: "exercise",
                      id: row.id,
                      name:
                        row.resolvedName ||
                        row.exerciseNameOverride ||
                        "exercise",
                    })
                  }
                  onRefresh={refreshTree}
                />
              ))}
          </div>
        )}
      </div>

      {/* ── Resources ──────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Resources
          </h2>
          <Button size="sm" onClick={() => setResourceModal({ open: true })}>
            <Plus className="h-3.5 w-3.5" /> Add Resource
          </Button>
        </div>

        {tree.resources.length === 0 ? (
          <EmptySection
            icon={<FileText className="h-8 w-8" />}
            message="No resources yet. Add markdown reference pages."
            actionLabel="Add Resource"
            onAction={() => setResourceModal({ open: true })}
          />
        ) : (
          <div className="space-y-2">
            {tree.resources
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((res) => (
                <div
                  key={res.id}
                  className="flex items-center justify-between rounded-lg border bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {res.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {res.slug} · {res.body.length} chars
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setResourceModal({ open: true, resource: res })
                      }
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteTarget({
                          type: "resource",
                          id: res.id,
                          name: res.title,
                        })
                      }
                      className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {blockModal.open && (
        <BlockFormModal
          programId={programId!}
          block={blockModal.block}
          onClose={() => setBlockModal({ open: false })}
          onSuccess={() => {
            refreshTree();
            setBlockModal({ open: false });
          }}
        />
      )}
      {weekModal.open && (
        <WeekFormModal
          programId={programId!}
          blockId={weekModal.blockId}
          week={weekModal.week}
          onClose={() => setWeekModal({ open: false })}
          onSuccess={() => {
            refreshTree();
            setWeekModal({ open: false });
          }}
        />
      )}
      {dayModal.open && (
        <DayFormModal
          programId={programId!}
          weekId={dayModal.weekId}
          day={dayModal.day}
          onClose={() => setDayModal({ open: false })}
          onSuccess={() => {
            refreshTree();
            setDayModal({ open: false });
          }}
        />
      )}
      {exerciseRowModal.open && (
        <ExerciseRowFormModal
          programId={programId!}
          dayId={exerciseRowModal.dayId}
          row={exerciseRowModal.row}
          onClose={() => setExerciseRowModal({ open: false })}
          onSuccess={() => {
            refreshTree();
            setExerciseRowModal({ open: false });
          }}
        />
      )}
      {resourceModal.open && (
        <ResourceFormModal
          programId={programId!}
          resource={resourceModal.resource}
          onClose={() => setResourceModal({ open: false })}
          onSuccess={() => {
            refreshTree();
            setResourceModal({ open: false });
          }}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.type}`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will cascade to all nested content.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
