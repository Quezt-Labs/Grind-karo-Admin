import { useState, useMemo } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Undo2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { programService } from "@/services/programService";
import type { Block, Week, Day, ExerciseRow } from "@/types/programs";
import { BlockFormModal } from "./editor/BlockFormModal";
import { ProgramStructureEditor } from "./editor/ProgramStructureEditor";
import { WeekFormModal } from "./editor/WeekFormModal";
import { DayFormModal } from "./editor/DayFormModal";
import { ExerciseRowFormModal } from "./editor/ExerciseRowFormModal";
import { MovementSelectionPanel } from "@/components/movement/MovementSelectionPanel";
import {
  ProgramEditorTabs,
  type ProgramEditorTab,
} from "./editor/ProgramEditorTabs";
import { PreviewInputsBar } from "./editor/PreviewInputsBar";
import { ProgramPreviewProvider } from "./editor/ProgramPreviewContext";
import { useProgramEditorRoute } from "@/hooks/useProgramEditorRoute";
import { useCoachAthleteContext } from "@/hooks/useCoachAthleteContext";
import { useIsAssistantCoach } from "@/hooks/useRole";
import { ProgramComparePanel } from "./editor/ProgramComparePanel";
import { ProgramHistoryPanel } from "./editor/ProgramHistoryPanel";
import { UserAthleteProgramPanel } from "@/components/users/UserAthleteProgramPanel";
import { UserRetailProgramPanel } from "@/components/users/UserRetailProgramPanel";
import { hasPersonalCoachingSubscription } from "@/utils/coachingCapabilities";
import { coachingProgramService } from "@/services/coachingProgramService";
import { defaultPreviewInputs } from "./editor/preview-context";
import type { PreviewInputs } from "@/utils/programPreviewCompute";
import { useProgramEditorUndo } from "./editor/useProgramEditorChrome";

type DeleteTarget = {
  type: string;
  id: string;
  name: string;
  exerciseSnapshot?: ExerciseRow;
};

export function ProgramEditorPage() {
  const {
    scope,
    programId,
    programSlug,
    coachingUserId,
    coachingNeedsSetup,
    isResolving,
    resolveError,
  } = useProgramEditorRoute();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<ProgramEditorTab>("structure");

  // ---- modals -----------------------------------------------------------
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
  const [exerciseModal, setExerciseModal] = useState<{
    open: boolean;
    dayId?: string;
    row?: ExerciseRow;
    dayExercises?: ExerciseRow[];
    nextSortOrder?: number;
  }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [expandExerciseRowId, setExpandExerciseRowId] = useState<string | null>(
    null,
  );
  const isAssistantCoach = useIsAssistantCoach();
  const { canUndo, isUndoing, push: pushUndo, undo } = useProgramEditorUndo();

  // ---- data -------------------------------------------------------------
  const {
    data: tree,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["program-tree", programId],
    queryFn: () => programService.getTree(programId!),
    enabled: !!programId,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["program-tree", programId] });
  }

  const {
    athleteLabel: coachingAthleteLabel,
    purchases: coachingPurchaseList,
  } = useCoachAthleteContext(coachingUserId, {
    loadPurchases: coachingNeedsSetup,
  });

  const { data: coachingRecord } = useQuery({
    queryKey: ["coaching-program", coachingUserId],
    queryFn: () => coachingProgramService.getForUser(coachingUserId!),
    enabled: !!coachingUserId && !coachingNeedsSetup,
  });

  const athletePreviewInputs = useMemo((): Partial<PreviewInputs> | null => {
    if (!coachingRecord) return null;
    const { profile, intake } = coachingRecord;
    const squat = profile?.squatOneRm ?? intake?.squatMax ?? null;
    const bench = profile?.benchOneRm ?? intake?.benchMax ?? null;
    const deadlift = profile?.deadliftOneRm ?? intake?.deadliftMax ?? null;
    if (squat == null && bench == null && deadlift == null) return null;
    return {
      squat: squat ?? defaultPreviewInputs.squat,
      bench: bench ?? defaultPreviewInputs.bench,
      deadlift: deadlift ?? defaultPreviewInputs.deadlift,
      has125kgPlates:
        profile?.has125kgPlates ?? defaultPreviewInputs.has125kgPlates,
    };
  }, [coachingRecord]);

  const subscriptionId = searchParams.get("subscriptionId");
  const backHref = coachingUserId
    ? isAssistantCoach
      ? `/coach/athletes/${coachingUserId}`
      : `/users/${coachingUserId}${subscriptionId ? `?subscriptionId=${subscriptionId}` : ""}`
    : `/programs/${programSlug ?? programId}`;

  // ---- mutations --------------------------------------------------------
  const deleteBlockMut = useMutation({
    mutationFn: (id: string) => programService.removeBlock(programId!, id),
    onSuccess: () => {
      toast.success("Block deleted");
      setDeleteTarget(null);
      refresh();
    },
  });
  const deleteWeekMut = useMutation({
    mutationFn: (id: string) => programService.removeWeek(programId!, id),
    onSuccess: () => {
      toast.success("Week deleted");
      setDeleteTarget(null);
      refresh();
    },
  });
  const cloneWeekMut = useMutation({
    mutationFn: (weekId: string) =>
      programService.cloneWeek(programId!, weekId),
    onSuccess: (newWeek) => {
      toast.success(`Week ${newWeek.weekNumber} cloned`);
      refresh();
    },
    onError: () => toast.error("Failed to clone week"),
  });
  const cloneBlockMut = useMutation({
    mutationFn: (blockId: string) =>
      programService.cloneBlock(programId!, blockId),
    onSuccess: (newBlock) => {
      toast.success(`Block "${newBlock.name}" cloned`);
      refresh();
    },
    onError: () => toast.error("Failed to clone block"),
  });
  const deleteDayMut = useMutation({
    mutationFn: (id: string) => programService.removeDay(programId!, id),
    onSuccess: () => {
      toast.success("Day deleted");
      setDeleteTarget(null);
      refresh();
    },
  });
  const deleteExerciseMut = useMutation({
    mutationFn: async (target: { id: string; snapshot?: ExerciseRow }) => {
      await programService.removeExerciseRow(programId!, target.id);
      return target.snapshot;
    },
    onSuccess: (snapshot) => {
      toast.success("Exercise deleted");
      setDeleteTarget(null);
      refresh();
      if (snapshot) {
        pushUndo({
          label: `Restore ${snapshot.resolvedName ?? snapshot.exerciseNameOverride ?? "exercise"}`,
          undo: async () => {
            const restored = await programService.createExerciseRow(
              programId!,
              snapshot.dayId,
              {
                sortOrder: snapshot.sortOrder,
                category: snapshot.category,
                exerciseId: snapshot.exerciseId,
                exerciseNameOverride: snapshot.exerciseNameOverride,
                sets: snapshot.sets,
                repScheme: snapshot.repScheme,
                targetRpe: snapshot.targetRpe,
                percentOneRm: snapshot.percentOneRm,
                loadKg: snapshot.loadKg,
                computedLoadKg: snapshot.computedLoadKg,
                loadSource: snapshot.loadSource,
                loadNote: snapshot.loadNote,
                notes: snapshot.notes,
                movementSlotId: snapshot.movementSlotId,
                loadComputation: snapshot.loadComputation,
                loadRefFactor: snapshot.loadRefFactor,
                loadRefExerciseId: snapshot.loadRefExerciseId,
                hasPlateCheck: snapshot.hasPlateCheck,
              },
            );
            if (snapshot.exerciseSets?.length) {
              for (const set of snapshot.exerciseSets) {
                await programService.createExerciseSet(
                  programId!,
                  restored.id,
                  {
                    setNumber: set.setNumber,
                    reps: set.reps,
                    repScheme: set.repScheme,
                    targetRpe: set.targetRpe,
                    percentOneRm: set.percentOneRm,
                    absoluteWeightKg: set.absoluteWeightKg,
                    notes: set.notes,
                  },
                );
              }
            }
            toast.success("Exercise restored");
            refresh();
          },
        });
      }
    },
  });

  function handleDelete() {
    if (!deleteTarget) return;
    switch (deleteTarget.type) {
      case "block":
        deleteBlockMut.mutate(deleteTarget.id);
        break;
      case "week":
        deleteWeekMut.mutate(deleteTarget.id);
        break;
      case "day":
        deleteDayMut.mutate(deleteTarget.id);
        break;
      case "exercise":
        deleteExerciseMut.mutate({
          id: deleteTarget.id,
          snapshot: deleteTarget.exerciseSnapshot,
        });
        break;
    }
  }

  function openExerciseModal(
    row: ExerciseRow | undefined,
    dayId: string | undefined,
    dayExercises: ExerciseRow[],
    nextSortOrder = 0,
  ) {
    setExerciseModal({
      open: true,
      dayId,
      row,
      dayExercises,
      nextSortOrder,
    });
  }

  // ---- render -----------------------------------------------------------
  if (isResolving) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (resolveError) {
    return <ErrorAlert message={resolveError} />;
  }

  if (coachingNeedsSetup && coachingUserId) {
    const athleteLabel = coachingAthleteLabel;
    const purchases = coachingPurchaseList;
    const isPersonalCoaching = hasPersonalCoachingSubscription(purchases);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start gap-3">
          <Link
            to={backHref}
            className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {athleteLabel}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isPersonalCoaching
                ? "Coaching setup — clone a template or start blank"
                : "Open a purchased retail program"}
            </p>
          </div>
        </div>
        {isPersonalCoaching ? (
          <UserAthleteProgramPanel
            userId={coachingUserId}
            userName={athleteLabel}
            purchases={purchases}
          />
        ) : (
          <UserRetailProgramPanel
            purchases={purchases}
            userId={coachingUserId}
          />
        )}
      </div>
    );
  }

  if (!programId) {
    return <ErrorAlert message="Program not found." />;
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

  const movementSlots = tree.movementSlots ?? [];
  const previewEnabled =
    activeTab === "structure" ||
    activeTab === "preview" ||
    activeTab === "loads";

  const structureEditor = (
    <ProgramStructureEditor
      programId={programId!}
      tree={tree}
      coachingUserId={coachingUserId}
      onAddBlock={() => setBlockModal({ open: true })}
      onEditBlock={(block) => setBlockModal({ open: true, block })}
      onDeleteBlock={(block) =>
        setDeleteTarget({
          type: "block",
          id: block.id,
          name: block.name,
        })
      }
      onCloneBlock={(blockId) => cloneBlockMut.mutate(blockId)}
      onAddWeek={(blockId) => setWeekModal({ open: true, blockId })}
      onEditWeek={(week) => setWeekModal({ open: true, week })}
      onDeleteWeek={(week) =>
        setDeleteTarget({
          type: "week",
          id: week.id,
          name: `Week ${week.weekNumber}`,
        })
      }
      onCloneWeek={(week) => cloneWeekMut.mutate(week.id)}
      onAddDay={(weekId) => setDayModal({ open: true, weekId })}
      onEditDay={(day) => setDayModal({ open: true, day })}
      onDeleteDay={(day) =>
        setDeleteTarget({
          type: "day",
          id: day.id,
          name: day.title,
        })
      }
      onEditExercise={(row, dayId, dayExercises) =>
        openExerciseModal(row, dayId, dayExercises)
      }
      onAddExercise={(dayId, dayExercises, nextSortOrder) =>
        openExerciseModal(undefined, dayId, dayExercises, nextSortOrder)
      }
      onDeleteExercise={(row) =>
        setDeleteTarget({
          type: "exercise",
          id: row.id,
          name: row.resolvedName ?? row.exerciseNameOverride ?? "Exercise",
          exerciseSnapshot: row,
        })
      }
      onRefresh={refresh}
      expandExerciseRowId={expandExerciseRowId}
      onExpandConsumed={() => setExpandExerciseRowId(null)}
    />
  );

  const athleteLabel = coachingUserId ? coachingAthleteLabel : null;

  return (
    <ProgramPreviewProvider
      slots={movementSlots}
      enabled={previewEnabled}
      programId={programId}
      athleteProfileInputs={athletePreviewInputs}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start gap-2 sm:gap-3">
          <button
            onClick={() => navigate(backHref)}
            className="shrink-0 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">
                {scope === "coaching" && athleteLabel
                  ? athleteLabel
                  : tree.name}
              </h1>
              <span className="text-xs text-gray-400">
                —{" "}
                {scope === "coaching"
                  ? "Coaching Editor"
                  : "Program Editor (template)"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {scope === "coaching" && athleteLabel ? (
                <>
                  <span className="line-clamp-1">{tree.name}</span>
                  <span className="mx-1.5 hidden sm:inline">·</span>
                </>
              ) : null}
              <Link to={backHref} className="hover:underline text-primary-600">
                ← Back {coachingUserId ? "to athlete" : "to program details"}
              </Link>
            </p>
          </div>
          {activeTab === "structure" && (
            <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">
              <Button
                size="sm"
                variant="secondary"
                disabled={!canUndo || isUndoing}
                onClick={() => void undo()}
                title="Undo last exercise delete (Ctrl/Cmd+Z)"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo
              </Button>
              <Button
                size="sm"
                onClick={() => setBlockModal({ open: true })}
                className="w-full sm:w-auto"
              >
                <Plus className="h-3.5 w-3.5" /> Add Block
              </Button>
            </div>
          )}
        </div>

        <ProgramEditorTabs active={activeTab} onChange={setActiveTab} />

        {activeTab === "structure" && (
          <div className="space-y-4">
            <PreviewInputsBar slots={movementSlots} />
            {structureEditor}
          </div>
        )}

        {activeTab === "compare" && <ProgramComparePanel tree={tree} />}

        {activeTab === "loads" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Reference 1RMs and movement slot preview are shared with the
              Structure and Preview tabs (saved per program in this browser).
              Use <strong>Recalculate loads</strong> on each day in Structure to
              persist template weights for all rows.
            </p>
            <PreviewInputsBar slots={movementSlots} />
          </div>
        )}

        {activeTab === "movement-selection" && (
          <div className="space-y-6">
            <MovementSelectionPanel programId={programId!} mode="configure" />
            {coachingUserId && (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-4 dark:border-gray-600 dark:bg-gray-800/40">
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Athlete selections
                </h3>
                <MovementSelectionPanel
                  programId={programId!}
                  userId={coachingUserId}
                  mode="select"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pick movement variations above to see how the same program
              resolves for different athlete choices. Expand days below to
              review computed loads.
            </p>
            <PreviewInputsBar slots={movementSlots} />
            {structureEditor}
          </div>
        )}

        {activeTab === "history" && programId && (
          <ProgramHistoryPanel programId={programId} />
        )}

        {/* Modals */}
        {blockModal.open && (
          <BlockFormModal
            programId={programId!}
            block={blockModal.block}
            onClose={() => setBlockModal({ open: false })}
            onSuccess={() => {
              setBlockModal({ open: false });
              refresh();
            }}
          />
        )}
        {weekModal.open && (
          <WeekFormModal
            key={
              weekModal.week?.id ??
              `${weekModal.blockId ?? "block"}-${
                weekModal.blockId
                  ? (tree?.blocks.find((b) => b.id === weekModal.blockId)?.weeks
                      .length ?? 0)
                  : 0
              }`
            }
            programId={programId!}
            blockId={weekModal.blockId}
            week={weekModal.week}
            siblingWeeks={
              weekModal.blockId
                ? tree?.blocks.find((b) => b.id === weekModal.blockId)?.weeks
                : weekModal.week
                  ? tree?.blocks
                      .find((b) => b.id === weekModal.week!.blockId)
                      ?.weeks.filter((w) => w.id !== weekModal.week!.id)
                  : undefined
            }
            onClose={() => setWeekModal({ open: false })}
            onSuccess={() => {
              setWeekModal({ open: false });
              refresh();
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
              setDayModal({ open: false });
              refresh();
            }}
          />
        )}
        {exerciseModal.open && (
          <ExerciseRowFormModal
            programId={programId!}
            dayId={exerciseModal.dayId}
            row={exerciseModal.row}
            dayExercises={exerciseModal.dayExercises}
            nextSortOrder={exerciseModal.nextSortOrder}
            movementSlots={movementSlots}
            onClose={() => setExerciseModal({ open: false })}
            onSuccess={(result) => {
              setExerciseModal({ open: false });
              if (result?.expandSets) {
                setExpandExerciseRowId(result.rowId);
              }
              refresh();
            }}
          />
        )}
        {deleteTarget && (
          <ConfirmModal
            open={!!deleteTarget}
            title={`Delete ${deleteTarget.type}`}
            message={`Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`}
            confirmLabel="Delete"
            variant="danger"
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </div>
    </ProgramPreviewProvider>
  );
}
