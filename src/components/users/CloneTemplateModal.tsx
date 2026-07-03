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

interface CloneTemplateModalProps {
  userId: string;
  replace: boolean;
  onClose: () => void;
  onSuccess: (programId: string) => void;
}

export function CloneTemplateModal({
  userId,
  replace,
  onClose,
  onSuccess,
}: CloneTemplateModalProps) {
  const [selectedId, setSelectedId] = useState("");
  const [confirmReplace, setConfirmReplace] = useState(false);

  const { data: templates = [], isLoading, isError } = useQuery({
    queryKey: ["program-templates"],
    queryFn: programTemplateService.getAll,
  });

  const templateOptions = [...templates].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
  );

  const cloneMut = useMutation({
    mutationFn: (sourceProgramId: string) =>
      replace
        ? coachingProgramService.replaceFromTemplate(userId, sourceProgramId)
        : coachingProgramService.cloneFromTemplate(userId, sourceProgramId),
    onSuccess: (program: { id: string }) => {
      toast.success(
        replace ? "Program replaced from template" : "Program cloned",
      );
      onSuccess(program.id);
    },
  });

  function handleSubmit() {
    if (!selectedId) {
      toast.error("Select a template program");
      return;
    }
    if (replace) {
      setConfirmReplace(true);
      return;
    }
    cloneMut.mutate(selectedId);
  }

  return (
    <>
      <FormModal
        title={replace ? "Replace from Template" : "Clone from Template"}
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
              >
                {replace ? "Replace" : "Clone"}
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
          onConfirm={() => cloneMut.mutate(selectedId)}
          onCancel={() => setConfirmReplace(false)}
        />
      )}
    </>
  );
}
