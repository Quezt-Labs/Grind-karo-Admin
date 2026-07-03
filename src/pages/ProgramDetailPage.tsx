import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Pencil,
  LayoutList,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { programService } from "@/services/programService";
import type { ProgramResource } from "@/types/programs";
import { ResourceFormModal } from "./editor/ResourceFormModal";
import { formatINR } from "./editor/programConstants";
import { EmptySection } from "./editor/ProgramShared";
import { ProgramPurchasersPanel } from "./editor/ProgramPurchasersPanel";
import { AthleteSelectionsPanel } from "./editor/AthleteSelectionsPanel";
import { ProgramAddonsPanel } from "@/components/programs/ProgramAddonsPanel";
import { ProgramFormModal } from "@/components/programs/ProgramFormModal";

import { useResolveProgramKey } from "@/hooks/useResolveProgramKey";

/* ─── Main Page ───────────────────────────────────────────────────────── */

export function ProgramDetailPage() {
  const { programKey } = useParams<{ programKey: string }>();
  const { programId, isResolving, resolveError } =
    useResolveProgramKey(programKey);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [resourceModal, setResourceModal] = useState<{
    open: boolean;
    resource?: ProgramResource;
  }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<{
    type: string;
    id: string;
    name: string;
  } | null>(null);
  const [showEditProgramModal, setShowEditProgramModal] = useState(false);

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
    if (deleteTarget.type === "resource") {
      deleteResourceMutation.mutate(deleteTarget.id);
    }
  }

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

  const guideResources = tree.resources.filter((r) => r.resourceType !== "pdf");

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
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowEditProgramModal(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit Details
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() => navigate(`/programs/${tree.slug}/editor`)}
        >
          <LayoutList className="h-3.5 w-3.5" />
          Build Content
        </Button>
      </div>

      {/* ── Purchasers ─────────────────────────────────────────────────── */}
      <ProgramPurchasersPanel programId={programId!} />

      <ProgramAddonsPanel programId={programId!} />

      {/* ── Athlete movement selections ────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Athlete movement selections
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View each athlete&apos;s exercise choices. Use Reset to unlock after
            their first workout log so they can pick again.
          </p>
        </div>
        <AthleteSelectionsPanel
          programId={programId!}
          slots={tree.movementSlots ?? []}
        />
      </div>

      {/* ── Resources (markdown) ───────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Resources
          </h2>
          <Button size="sm" onClick={() => setResourceModal({ open: true })}>
            <Plus className="h-3.5 w-3.5" /> Add Resource
          </Button>
        </div>

        {guideResources.length === 0 ? (
          <EmptySection
            icon={<FileText className="h-8 w-8" />}
            message="No resources yet."
            actionLabel="Add Resource"
            onAction={() => setResourceModal({ open: true })}
          />
        ) : (
          <div className="space-y-2">
            {guideResources
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
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteResourceMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      {showEditProgramModal && (
        <ProgramFormModal
          program={tree}
          onClose={() => setShowEditProgramModal(false)}
          onSuccess={() => {
            refreshTree();
            setShowEditProgramModal(false);
          }}
        />
      )}
    </div>
  );
}
