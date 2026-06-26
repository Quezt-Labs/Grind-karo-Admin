import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Star, Settings2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { movementSlotService } from "@/services/movementSlotService";
import type {
  MovementSlot,
  MovementOption,
  ExerciseRow,
  ProgramTree,
} from "@/types/programs";
import { SlotFormModal } from "./SlotFormModal";
import { OptionFormModal } from "./OptionFormModal";
import { OverrideEditor } from "./OverrideEditor";

const CATEGORY_COLORS: Record<string, string> = {
  SQUAT: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  BENCH:
    "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  DEADLIFT: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  ACCESSORY: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

interface MovementSlotsPanelProps {
  programId: string;
  tree: ProgramTree;
}

export function MovementSlotsPanel({
  programId,
  tree,
}: MovementSlotsPanelProps) {
  const queryClient = useQueryClient();

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["movement-slots", programId],
    queryFn: () => movementSlotService.getSlots(programId),
  });

  // Collect all exercise rows from the tree that are linked to any slot
  const allExerciseRows = useMemo(() => {
    const rows: ExerciseRow[] = [];
    for (const block of tree.blocks) {
      for (const week of block.weeks) {
        for (const day of week.days) {
          for (const row of day.exercises) {
            rows.push(row);
          }
        }
      }
    }
    return rows;
  }, [tree]);

  function linkedRowsForSlot(slotId: string): ExerciseRow[] {
    return allExerciseRows.filter((r) => r.movementSlotId === slotId);
  }

  function refreshSlots() {
    queryClient.invalidateQueries({ queryKey: ["movement-slots", programId] });
    queryClient.invalidateQueries({ queryKey: ["program-tree", programId] });
  }

  // ── Modal state ──
  const [slotModal, setSlotModal] = useState<{
    open: boolean;
    slot?: MovementSlot;
  }>({ open: false });

  const [optionModal, setOptionModal] = useState<{
    open: boolean;
    slotId?: string;
    option?: MovementOption;
  }>({ open: false });

  const [overrideEditor, setOverrideEditor] = useState<{
    open: boolean;
    option?: MovementOption;
    slotId?: string;
  }>({ open: false });

  const [deleteTarget, setDeleteTarget] = useState<{
    type: "slot" | "option";
    id: string;
    name: string;
  } | null>(null);

  const deleteSlotMut = useMutation({
    mutationFn: (id: string) => movementSlotService.removeSlot(id),
    onSuccess: () => {
      toast.success("Slot deleted");
      refreshSlots();
      setDeleteTarget(null);
    },
  });

  const deleteOptionMut = useMutation({
    mutationFn: (id: string) => movementSlotService.removeOption(id),
    onSuccess: () => {
      toast.success("Option deleted");
      refreshSlots();
      setDeleteTarget(null);
    },
  });

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "slot") deleteSlotMut.mutate(deleteTarget.id);
    else deleteOptionMut.mutate(deleteTarget.id);
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-gray-400">
        Loading movement slots…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Movement Slots ({slots.length})
        </h3>
        <Button size="sm" onClick={() => setSlotModal({ open: true })}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Slot
        </Button>
      </div>

      {/* Empty state */}
      {slots.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center dark:border-gray-600">
          <Settings2 className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No movement slots yet
          </p>
          <p className="text-xs text-gray-400">
            Create a slot to allow athletes to choose between exercises
          </p>
        </div>
      )}

      {/* Slot cards */}
      {slots
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((slot) => {
          const linked = linkedRowsForSlot(slot.id);
          return (
            <div
              key={slot.id}
              className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              {/* Slot header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔀</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {slot.label}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      CATEGORY_COLORS[slot.category] ||
                        CATEGORY_COLORS.ACCESSORY,
                    )}
                  >
                    {slot.category}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-2 text-[10px] text-gray-400">
                    Key: {slot.slotKey}
                  </span>
                  <button
                    onClick={() => setSlotModal({ open: true, slot })}
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                    title="Edit slot"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      setDeleteTarget({
                        type: "slot",
                        id: slot.id,
                        name: slot.label,
                      })
                    }
                    className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    title="Delete slot"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Options list */}
              <div className="px-4 py-3">
                <div className="space-y-1.5">
                  {slot.options
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((opt) => (
                      <div
                        key={opt.id}
                        className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-750"
                      >
                        <div className="flex items-center gap-2">
                          {opt.isDefault && (
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          )}
                          <span className="text-sm text-gray-800 dark:text-gray-200">
                            {opt.exerciseName}
                          </span>
                          {opt.isDefault && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">
                              (default)
                            </span>
                          )}
                          {opt.overrides.length > 0 && (
                            <span className="text-[10px] text-gray-400">
                              · {opt.overrides.length} override
                              {opt.overrides.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() =>
                              setOverrideEditor({
                                open: true,
                                option: opt,
                                slotId: slot.id,
                              })
                            }
                            className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                            title="Edit overrides"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setOptionModal({
                                open: true,
                                slotId: slot.id,
                                option: opt,
                              })
                            }
                            className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                            title="Edit option"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                type: "option",
                                id: opt.id,
                                name: opt.exerciseName,
                              })
                            }
                            className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                            title="Delete option"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    onClick={() =>
                      setOptionModal({ open: true, slotId: slot.id })
                    }
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    + Add Option
                  </button>
                  <span className="text-[10px] text-gray-400">
                    {linked.length} linked row{linked.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

      {/* ── Modals ── */}
      {slotModal.open && (
        <SlotFormModal
          programId={programId}
          slot={slotModal.slot}
          onClose={() => setSlotModal({ open: false })}
          onSuccess={() => {
            setSlotModal({ open: false });
            refreshSlots();
          }}
        />
      )}

      {optionModal.open && optionModal.slotId && (
        <OptionFormModal
          slotId={optionModal.slotId}
          option={optionModal.option}
          onClose={() => setOptionModal({ open: false })}
          onSuccess={() => {
            setOptionModal({ open: false });
            refreshSlots();
          }}
        />
      )}

      {overrideEditor.open &&
        overrideEditor.option &&
        overrideEditor.slotId && (
          <OverrideEditor
            option={overrideEditor.option}
            linkedRows={linkedRowsForSlot(overrideEditor.slotId)}
            onClose={() => setOverrideEditor({ open: false })}
            onSuccess={() => {
              setOverrideEditor({ open: false });
              refreshSlots();
            }}
          />
        )}

      {deleteTarget && (
        <ConfirmModal
          open={true}
          title={`Delete ${deleteTarget.type === "slot" ? "Slot" : "Option"}`}
          message={`Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleteSlotMut.isPending || deleteOptionMut.isPending}
        />
      )}
    </div>
  );
}
