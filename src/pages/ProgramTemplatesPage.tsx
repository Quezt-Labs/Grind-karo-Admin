import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LayoutList, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { TemplateFormModal } from "@/components/templates/TemplateFormModal";
import { programTemplateService } from "@/services/programTemplateService";
import type { ProgramTemplate } from "@/services/programTemplateService";
import { useIsAdmin } from "@/hooks/useRole";

export function ProgramTemplatesPage() {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProgramTemplate | null>(
    null,
  );
  const [restoreTarget, setRestoreTarget] = useState<ProgramTemplate | null>(
    null,
  );

  const {
    data: templates = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["program-templates"],
    queryFn: programTemplateService.getAll,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => programTemplateService.remove(id),
    onSuccess: () => {
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["program-templates"] });
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete template"),
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) => programTemplateService.demoteToRetail(id),
    onSuccess: (program) => {
      toast.success(`"${program.name}" restored as retail program`);
      queryClient.invalidateQueries({ queryKey: ["program-templates"] });
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      setRestoreTarget(null);
    },
    onError: () => toast.error("Failed to restore as retail program"),
  });

  const filtered = templates.filter((t) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Program templates"
        description={
          isAdmin
            ? "Reusable coaching program blueprints. Clone these onto athletes from the user page."
            : "Clone these templates onto your assigned athletes."
        }
      >
        {isAdmin ? (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New template
          </Button>
        ) : null}
      </PageHeader>

      <DebouncedSearch
        onSearch={setSearchTerm}
        placeholder="Search templates…"
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : isError ? (
        <ErrorAlert message="Failed to load program templates" />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <LayoutList className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">No templates yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Create a blank template or copy from an existing retail program."
              : "No coaching templates are available yet."}
          </p>
          {isAdmin ? (
            <Button className="mt-4" onClick={() => setShowCreate(true)}>
              Create first template
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Length</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((template) => (
                <tr
                  key={template.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-medium">{template.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {template.slug}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {template.programLengthWeeks
                      ? `${template.programLengthWeeks} weeks`
                      : (template.liftingFrequency ?? "—")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate(`/programs/${template.id}/editor`)
                        }
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        {isAdmin ? "Edit" : "Open"}
                      </Button>
                      {isAdmin ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            title="Restore as retail program"
                            onClick={() => setRestoreTarget(template)}
                          >
                            <RotateCcw className="mr-1 h-3.5 w-3.5" />
                            Retail
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setDeleteTarget(template)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && isAdmin && (
        <TemplateFormModal
          onClose={() => setShowCreate(false)}
          onSuccess={(templateId) => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ["program-templates"] });
            navigate(`/programs/${templateId}/editor`);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          open
          title="Delete template?"
          message={`Delete "${deleteTarget.name}"? Athletes already cloned from this template are not affected.`}
          confirmLabel="Delete"
          variant="danger"
          isLoading={deleteMut.isPending}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {restoreTarget && (
        <ConfirmModal
          open
          title="Restore as retail program?"
          message={`Convert "${restoreTarget.name}" back to a retail program (same id). Purchases stay valid and the program will show on the store again.`}
          confirmLabel="Restore retail"
          isLoading={restoreMut.isPending}
          onConfirm={() => restoreMut.mutate(restoreTarget.id)}
          onCancel={() => setRestoreTarget(null)}
        />
      )}
    </div>
  );
}
