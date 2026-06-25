import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, Plus, RefreshCw, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { movementSelectionService } from "@/services/movementSelectionService";
import { movementSlotService } from "@/services/movementSlotService";
import { OptionFormModal } from "@/pages/editor/OptionFormModal";
import type { MovementSelectionFormSlot } from "@/types/programs";

const SECTION_HEADER =
  "bg-red-600 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-white";

const POSITION_LABELS: Record<string, string> = {
  primary: "Primary",
  secondary: "Secondary",
  tertiary: "Tertiary",
  other: "Option",
};

interface MovementSelectionPanelProps {
  programId: string;
  userId?: string;
  mode: "configure" | "select";
  onSaved?: () => void;
}

function defaultOptionId(slot: MovementSelectionFormSlot): string | null {
  if (slot.selectedOptionId) return slot.selectedOptionId;
  const def = slot.options.find((o) => o.isDefault);
  if (def) return def.id;
  return slot.options[0]?.id ?? null;
}

export function MovementSelectionPanel({
  programId,
  userId,
  mode,
  onSaved,
}: MovementSelectionPanelProps) {
  const qc = useQueryClient();
  const [selectionOverrides, setSelectionOverrides] = useState<
    Record<string, string>
  >({});
  const [platesOverride, setPlatesOverride] = useState<boolean | undefined>(
    undefined,
  );
  const [optionModal, setOptionModal] = useState<{
    open: boolean;
    slotId?: string;
  }>({ open: false });
  const [resetConfirm, setResetConfirm] = useState(false);

  const queryKey = ["movement-selection-form", programId, userId ?? "config"];

  const {
    data: form,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => movementSelectionService.getForm(programId, userId),
    enabled: !!programId,
  });

  const isLocked = !!form?.profile?.selectionsLockedAt;
  const has125kgPlates =
    platesOverride ?? form?.profile?.has125kgPlates ?? true;

  const effectiveSelections = useMemo(() => {
    const base = { ...(form?.profile?.movementSelections ?? {}) };
    const allSlots = form?.sections.flatMap((s) => s.slots) ?? [];

    for (const slot of allSlots) {
      if (!base[slot.slot.id]) {
        const fallback = defaultOptionId(slot);
        if (fallback) base[slot.slot.id] = fallback;
      }
    }

    return { ...base, ...selectionOverrides };
  }, [form, selectionOverrides]);

  const allFilled = useMemo(() => {
    const slots = form?.sections.flatMap((s) => s.slots) ?? [];
    return (
      slots.length > 0 && slots.every((s) => effectiveSelections[s.slot.id])
    );
  }, [form, effectiveSelections]);

  const saveMut = useMutation({
    mutationFn: () => {
      const movementSelections: Record<string, string> = {};
      for (const section of form!.sections) {
        for (const slot of section.slots) {
          movementSelections[slot.slot.id] = effectiveSelections[slot.slot.id];
        }
      }
      return movementSelectionService.patchSelections(userId!, programId, {
        movementSelections,
        has125kgPlates,
      });
    },
    onSuccess: () => {
      toast.success("Movement selections saved");
      setSelectionOverrides({});
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["coaching-program", userId] });
      qc.invalidateQueries({ queryKey: ["athlete-selections", programId] });
      onSaved?.();
    },
    onError: () => toast.error("Failed to save movement selections"),
  });

  const bootstrapMut = useMutation({
    mutationFn: () => movementSelectionService.bootstrapDefaults(programId),
    onSuccess: (res) => {
      toast.success(`Created ${res.created} slot(s), skipped ${res.skipped}`);
      refetch();
      qc.invalidateQueries({ queryKey: ["movement-slots", programId] });
    },
    onError: () => toast.error("Failed to bootstrap slots"),
  });

  const syncMut = useMutation({
    mutationFn: (slotId: string) =>
      movementSelectionService.syncSlotOptions(programId, slotId),
    onSuccess: (res) => {
      toast.success(`Added ${res.created} option(s), skipped ${res.skipped}`);
      refetch();
      qc.invalidateQueries({ queryKey: ["movement-slots", programId] });
    },
    onError: () => toast.error("Failed to sync options from exercises"),
  });

  const resetMut = useMutation({
    mutationFn: () =>
      movementSlotService.resetAthleteSelections(programId, userId!),
    onSuccess: () => {
      toast.success("Movement selections reset");
      setResetConfirm(false);
      setSelectionOverrides({});
      refetch();
      qc.invalidateQueries({ queryKey: ["coaching-program", userId] });
      qc.invalidateQueries({ queryKey: ["athlete-selections", programId] });
    },
    onError: () => toast.error("Failed to reset selections"),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (isError || !form) {
    return (
      <p className="text-sm text-red-600">Failed to load movement selection.</p>
    );
  }

  const isEmpty = form.sections.length === 0;

  return (
    <div className="space-y-4">
      {mode === "configure" && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => bootstrapMut.mutate()}
            isLoading={bootstrapMut.isPending}
          >
            <Wand2 className="mr-1 h-3.5 w-3.5" />
            Bootstrap default slots
          </Button>
          {isEmpty && (
            <p className="text-xs text-gray-500">
              No movement slots yet — bootstrap creates Squat / Bench / Deadlift
              primary, secondary, tertiary slots.
            </p>
          )}
        </div>
      )}

      {mode === "select" && isLocked && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <Lock className="h-4 w-4 shrink-0" />
          Selections are locked. Reset before editing.
        </div>
      )}

      {form.sections.map((section) => (
        <div
          key={section.lift}
          className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className={SECTION_HEADER}>{section.label}</div>
          <div className="divide-y divide-gray-100 bg-gray-50 dark:divide-gray-700 dark:bg-gray-900/40">
            {section.slots.map((entry) => {
              const positionLabel =
                POSITION_LABELS[entry.position] ?? entry.slot.label;
              const selectedId = effectiveSelections[entry.slot.id] ?? "";

              return (
                <div
                  key={entry.slot.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="w-28 shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {positionLabel}
                  </div>

                  <div className="min-w-0 flex-1">
                    {mode === "select" ? (
                      <Select
                        id={`ms-${entry.slot.id}`}
                        options={entry.options.map((o) => ({
                          value: o.id,
                          label: o.isDefault
                            ? `${o.exerciseName} (default)`
                            : o.exerciseName,
                        }))}
                        value={selectedId}
                        onValueChange={(val) =>
                          setSelectionOverrides((prev) => ({
                            ...prev,
                            [entry.slot.id]: val,
                          }))
                        }
                        disabled={isLocked || entry.options.length === 0}
                        placeholder={
                          entry.options.length === 0
                            ? "No options — configure in program editor"
                            : "Select movement"
                        }
                      />
                    ) : (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {entry.slot.label}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          ({entry.options.length} option
                          {entry.options.length === 1 ? "" : "s"})
                        </span>
                        {entry.options.length > 0 && (
                          <p className="mt-1 truncate text-xs text-gray-500">
                            {entry.options
                              .slice(0, 3)
                              .map((o) => o.exerciseName)
                              .join(", ")}
                            {entry.options.length > 3 ? "…" : ""}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {mode === "configure" && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => syncMut.mutate(entry.slot.id)}
                        isLoading={syncMut.isPending}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Sync exercises
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setOptionModal({
                            open: true,
                            slotId: entry.slot.id,
                          })
                        }
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add option
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {(mode === "select" || mode === "configure") && (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <div className={SECTION_HEADER}>Equipment</div>
          <div className="bg-gray-50 px-3 py-3 dark:bg-gray-900/40">
            <CheckboxField
              id="has-125-plates"
              label="1.25 kg plates available?"
              checked={has125kgPlates}
              onCheckedChange={(checked) => setPlatesOverride(checked)}
              disabled={mode === "select" && isLocked}
            />
          </div>
        </div>
      )}

      {mode === "select" && userId && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => saveMut.mutate()}
            isLoading={saveMut.isPending}
            disabled={!allFilled || isLocked}
          >
            Save movements
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setResetConfirm(true)}
          >
            Reset selections
          </Button>
          {!allFilled && (
            <span className="text-xs text-gray-500">
              Fill all slots before saving.
            </span>
          )}
        </div>
      )}

      {optionModal.open && optionModal.slotId && (
        <OptionFormModal
          slotId={optionModal.slotId}
          onClose={() => setOptionModal({ open: false })}
          onSuccess={() => {
            setOptionModal({ open: false });
            refetch();
            qc.invalidateQueries({ queryKey: ["movement-slots", programId] });
          }}
        />
      )}

      {resetConfirm && userId && (
        <ConfirmModal
          open
          title="Reset movement selections?"
          message="This clears the athlete's movement picks and unlocks selection editing."
          confirmLabel="Reset"
          variant="danger"
          onConfirm={() => resetMut.mutate()}
          onCancel={() => setResetConfirm(false)}
        />
      )}
    </div>
  );
}
