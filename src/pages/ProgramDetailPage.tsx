import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
  Calendar,
  Sun,
  FileText,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { programService } from "@/services/programService";
import type {
  ProgramTree,
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

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function formatPercent(basisPoints: number | null): string {
  if (basisPoints === null) return "—";
  return `${(basisPoints / 100).toFixed(1)}%`;
}

export function ProgramDetailPage() {
  const { id: programId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Expand/collapse state
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

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

  function refreshTree() {
    queryClient.invalidateQueries({ queryKey: ["program-tree", programId] });
  }

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
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/programs")}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {tree.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {tree.slug} · {formatINR(tree.salePrice ?? tree.regularPrice)}
            {tree.programLengthWeeks
              ? ` · ${tree.programLengthWeeks} weeks`
              : ""}
          </p>
        </div>
        <StatusBadge status={tree.isActive ? "Active" : "Inactive"} />
      </div>

      {/* Content Tree */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Content Tree
          </h2>
          <Button size="sm" onClick={() => setBlockModal({ open: true })}>
            <Plus className="h-3.5 w-3.5" /> Add Block
          </Button>
        </div>

        {tree.blocks.length === 0 ? (
          <EmptySection
            icon={<Layers className="h-6 w-6" />}
            message="No blocks yet. Add a block to start building the program."
          />
        ) : (
          <div className="space-y-2">
            {tree.blocks
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((block) => (
                <BlockNode
                  key={block.id}
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
                  onAddExercise={(dayId) =>
                    setExerciseRowModal({ open: true, dayId })
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
                />
              ))}
          </div>
        )}
      </div>

      {/* Resources */}
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
            icon={<FileText className="h-6 w-6" />}
            message="No resources yet. Add markdown reference pages."
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

      {/* Modals */}
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

// ---- Sub-components -------------------------------------------------------

function EmptySection({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-600 dark:bg-gray-800">
      <div className="mx-auto mb-2 text-gray-300 dark:text-gray-600">
        {icon}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

interface BlockNodeProps {
  block: ProgramTree["blocks"][number];
  expanded: boolean;
  onToggle: () => void;
  expandedWeeks: Set<string>;
  toggleWeek: (id: string) => void;
  expandedDays: Set<string>;
  toggleDay: (id: string) => void;
  onEditBlock: () => void;
  onDeleteBlock: () => void;
  onAddWeek: (blockId: string) => void;
  onEditWeek: (week: Week) => void;
  onDeleteWeek: (week: Week) => void;
  onAddDay: (weekId: string) => void;
  onEditDay: (day: Day) => void;
  onDeleteDay: (day: Day) => void;
  onAddExercise: (dayId: string) => void;
  onEditExercise: (row: ExerciseRow) => void;
  onDeleteExercise: (row: ExerciseRow) => void;
}

function BlockNode({
  block,
  expanded,
  onToggle,
  expandedWeeks,
  toggleWeek,
  expandedDays,
  toggleDay,
  onEditBlock,
  onDeleteBlock,
  onAddWeek,
  onEditWeek,
  onDeleteWeek,
  onAddDay,
  onEditDay,
  onDeleteDay,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
}: BlockNodeProps) {
  return (
    <div className="rounded-lg border bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between p-3">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <Layers className="h-4 w-4 text-primary-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {block.name}
          </span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              block.blockType === "MAIN"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : block.blockType === "DELOAD"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : block.blockType === "PEAK"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
            )}
          >
            {block.blockType}
          </span>
          <span className="text-xs text-gray-400">
            {block.weeks.length} weeks
          </span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddWeek(block.id)}
            className="rounded p-1 text-gray-400 hover:text-primary-500"
            title="Add week"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onEditBlock}
            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDeleteBlock}
            className="rounded p-1 text-gray-400 hover:text-red-500"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t pb-2 pl-8 pr-3 pt-2 dark:border-gray-700">
          {block.weeks.length === 0 ? (
            <p className="py-2 text-xs text-gray-400">No weeks</p>
          ) : (
            <div className="space-y-1">
              {block.weeks
                .sort((a, b) => a.weekNumber - b.weekNumber)
                .map((week) => (
                  <WeekNode
                    key={week.id}
                    week={week}
                    expanded={expandedWeeks.has(week.id)}
                    onToggle={() => toggleWeek(week.id)}
                    expandedDays={expandedDays}
                    toggleDay={toggleDay}
                    onEdit={() => onEditWeek(week)}
                    onDelete={() => onDeleteWeek(week)}
                    onAddDay={() => onAddDay(week.id)}
                    onEditDay={onEditDay}
                    onDeleteDay={onDeleteDay}
                    onAddExercise={onAddExercise}
                    onEditExercise={onEditExercise}
                    onDeleteExercise={onDeleteExercise}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface WeekNodeProps {
  week: ProgramTree["blocks"][number]["weeks"][number];
  expanded: boolean;
  onToggle: () => void;
  expandedDays: Set<string>;
  toggleDay: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddDay: () => void;
  onEditDay: (day: Day) => void;
  onDeleteDay: (day: Day) => void;
  onAddExercise: (dayId: string) => void;
  onEditExercise: (row: ExerciseRow) => void;
  onDeleteExercise: (row: ExerciseRow) => void;
}

function WeekNode({
  week,
  expanded,
  onToggle,
  expandedDays,
  toggleDay,
  onEdit,
  onDelete,
  onAddDay,
  onEditDay,
  onDeleteDay,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
}: WeekNodeProps) {
  return (
    <div className="rounded-md border bg-gray-50 dark:border-gray-600 dark:bg-gray-750">
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
          <Calendar className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {week.title}
          </span>
          <span className="text-xs text-gray-400">{week.days.length} days</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddDay}
            className="rounded p-1 text-gray-400 hover:text-primary-500"
            title="Add day"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            onClick={onEdit}
            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-gray-400 hover:text-red-500"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t pb-2 pl-7 pr-2 pt-1 dark:border-gray-600">
          {week.days.length === 0 ? (
            <p className="py-2 text-xs text-gray-400">No days</p>
          ) : (
            <div className="space-y-1">
              {week.days
                .sort((a, b) => a.dayNumber - b.dayNumber)
                .map((day) => (
                  <DayNode
                    key={day.id}
                    day={day}
                    expanded={expandedDays.has(day.id)}
                    onToggle={() => toggleDay(day.id)}
                    onEdit={() => onEditDay(day)}
                    onDelete={() => onDeleteDay(day)}
                    onAddExercise={() => onAddExercise(day.id)}
                    onEditExercise={onEditExercise}
                    onDeleteExercise={onDeleteExercise}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface DayNodeProps {
  day: ProgramTree["blocks"][number]["weeks"][number]["days"][number];
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddExercise: () => void;
  onEditExercise: (row: ExerciseRow) => void;
  onDeleteExercise: (row: ExerciseRow) => void;
}

function DayNode({
  day,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
}: DayNodeProps) {
  return (
    <div className="rounded border bg-white dark:border-gray-600 dark:bg-gray-800">
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-gray-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-gray-400" />
          )}
          <Sun className="h-3.5 w-3.5 text-yellow-500" />
          <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
            {day.title}
          </span>
          {day.focus && (
            <span className="text-[10px] text-gray-400">({day.focus})</span>
          )}
          <span className="text-[10px] text-gray-400">
            {day.exercises.length} exercises
          </span>
        </button>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onAddExercise}
            className="rounded p-1 text-gray-400 hover:text-primary-500"
            title="Add exercise"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            onClick={onEdit}
            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="rounded p-1 text-gray-400 hover:text-red-500"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {expanded && day.exercises.length > 0 && (
        <div className="border-t px-2.5 pb-2 pt-1 dark:border-gray-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400">
                <th className="py-1 font-medium">#</th>
                <th className="py-1 font-medium">Exercise</th>
                <th className="py-1 font-medium">Cat</th>
                <th className="py-1 font-medium">Sets</th>
                <th className="py-1 font-medium">Reps</th>
                <th className="py-1 font-medium">RPE</th>
                <th className="py-1 font-medium">%1RM</th>
                <th className="py-1 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {day.exercises
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((row, i) => (
                  <tr
                    key={row.id}
                    className="border-t border-gray-100 dark:border-gray-700"
                  >
                    <td className="py-1 text-gray-400">{i + 1}</td>
                    <td className="py-1 font-medium text-gray-900 dark:text-white">
                      {row.resolvedName || row.exerciseNameOverride || "—"}
                    </td>
                    <td className="py-1 text-gray-500">{row.category}</td>
                    <td className="py-1 text-gray-700 dark:text-gray-300">
                      {row.sets ?? "—"}
                    </td>
                    <td className="py-1 text-gray-700 dark:text-gray-300">
                      {row.repScheme || "—"}
                    </td>
                    <td className="py-1 text-gray-700 dark:text-gray-300">
                      {row.targetRpe || "—"}
                    </td>
                    <td className="py-1 text-gray-700 dark:text-gray-300">
                      {formatPercent(row.percentOneRm)}
                    </td>
                    <td className="py-1">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => onEditExercise(row)}
                          className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onDeleteExercise(row)}
                          className="rounded p-0.5 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
