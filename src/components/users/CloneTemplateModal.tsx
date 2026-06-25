import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { FormModal } from "@/components/ui/FormModal";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { programService } from "@/services/programService";
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

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["admin-programs-list"],
    queryFn: () => programService.getAll(),
  });

  const retailPrograms = programs.filter(
    (p) => p.kind !== "COACHING" && p.isActive,
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
        ) : (
          <div className="space-y-4">
            <Select
              id="template-program"
              label="Retail program template"
              options={retailPrograms.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
              value={selectedId}
              onValueChange={setSelectedId}
              placeholder="Select program…"
            />
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
