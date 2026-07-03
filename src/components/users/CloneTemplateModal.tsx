import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { FormModal } from "@/components/ui/FormModal";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { programTemplateService } from "@/services/programTemplateService";
import { coachingProgramService } from "@/services/coachingProgramService";
import { cn } from "@/utils/cn";

type MergeMode = "append" | "replace";

interface CloneTemplateModalProps {
  userId: string;
  hasExistingProgram: boolean;
  onClose: () => void;
  onSuccess: (programId: string) => void;
}

export function CloneTemplateModal({
  userId,
  hasExistingProgram,
  onClose,
  onSuccess,
}: CloneTemplateModalProps) {
  const [selectedId, setSelectedId] = useState("");
  const [mergeMode, setMergeMode] = useState<MergeMode>("append");
  const [confirmReplace, setConfirmReplace] = useState(false);

  const {
    data: templates = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["program-templates"],
    queryFn: programTemplateService.getAll,
  });

  const templateOptions = [...templates].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
  );

  const cloneMut = useMutation({
    mutationFn: ({
      sourceProgramId,
      mode,
    }: {
      sourceProgramId: string;
      mode: MergeMode | "create";
    }) => {
      if (mode === "create") {
        return coachingProgramService.cloneFromTemplate(
          userId,
          sourceProgramId,
        );
      }
      if (mode === "append") {
        return coachingProgramService.appendFromTemplate(
          userId,
          sourceProgramId,
        );
      }
      return coachingProgramService.replaceFromTemplate(
        userId,
        sourceProgramId,
      );
    },
    onSuccess: (program: { id: string }, { mode }) => {
      toast.success(
        mode === "replace"
          ? "Program replaced from template"
          : mode === "append"
            ? "Template blocks added to program"
            : "Program cloned from template",
      );
      onSuccess(program.id);
    },
  });

  function runClone(mode: MergeMode | "create") {
    if (!selectedId) {
      toast.error("Select a template program");
      return;
    }
    cloneMut.mutate({ sourceProgramId: selectedId, mode });
  }

  function handleSubmit() {
    if (!selectedId) {
      toast.error("Select a template program");
      return;
    }
    const mode = hasExistingProgram ? mergeMode : "create";
    if (mode === "replace") {
      setConfirmReplace(true);
      return;
    }
    runClone(mode);
  }

  const modalTitle = hasExistingProgram
    ? "Add template to program"
    : "Clone from Template";

  return (
    <>
      <FormModal
        title={modalTitle}
        onClose={onClose}
        contentClassName="max-w-md"
      >
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">
            Failed to load templates. Refresh and try again.
          </p>
        ) : cloneMut.isPending ? (
          <div className="space-y-3 py-6 text-center">
            <Spinner className="mx-auto" />
            <p className="text-sm font-medium">Copying program structure…</p>
            <p className="text-sm text-muted-foreground">
              Large templates can take up to a minute. Please keep this window
              open.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Select
              id="template-program"
              label="Program template"
              options={templateOptions.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
              value={selectedId}
              onValueChange={setSelectedId}
              disabled={cloneMut.isPending}
              placeholder={
                templateOptions.length === 0
                  ? "No templates found"
                  : "Select template…"
              }
            />

            {hasExistingProgram && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  How should this template be applied?
                </p>
                <div className="grid gap-2">
                  <label
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition-colors",
                      mergeMode === "append"
                        ? "border-primary-500 bg-primary-50/50 dark:border-primary-400 dark:bg-primary-900/20"
                        : "border-gray-200 dark:border-gray-700",
                    )}
                  >
                    <input
                      type="radio"
                      name="merge-mode"
                      className="mt-0.5"
                      checked={mergeMode === "append"}
                      onChange={() => setMergeMode("append")}
                    />
                    <span>
                      <span className="font-medium">Add as new block(s)</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Keep the current program and append the template blocks
                        at the end.
                      </span>
                    </span>
                  </label>
                  <label
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition-colors",
                      mergeMode === "replace"
                        ? "border-red-500 bg-red-50/40 dark:border-red-400 dark:bg-red-900/10"
                        : "border-gray-200 dark:border-gray-700",
                    )}
                  >
                    <input
                      type="radio"
                      name="merge-mode"
                      className="mt-0.5"
                      checked={mergeMode === "replace"}
                      onChange={() => setMergeMode("replace")}
                    />
                    <span>
                      <span className="font-medium">
                        Replace entire program
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Delete the athlete&apos;s current program and clone the
                        template from scratch.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            )}

            {templateOptions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Create templates under Programs → Templates, then clone them
                onto athletes here.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                isLoading={cloneMut.isPending}
                variant={mergeMode === "replace" ? "danger" : "primary"}
              >
                {hasExistingProgram
                  ? mergeMode === "replace"
                    ? "Replace program"
                    : "Add blocks"
                  : "Clone"}
              </Button>
            </div>
          </div>
        )}
      </FormModal>

      {confirmReplace && (
        <ConfirmModal
          open
          title="Replace athlete program?"
          message="This will delete the current program and clone the selected template. This cannot be undone."
          confirmLabel="Replace"
          variant="danger"
          isLoading={cloneMut.isPending}
          onConfirm={() => runClone("replace")}
          onCancel={() => setConfirmReplace(false)}
        />
      )}
    </>
  );
}
