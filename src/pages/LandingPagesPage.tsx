import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  Zap,
  ZapOff,
  MonitorSmartphone,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Shimmer } from "@/components/ui/Shimmer";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { LandingPageFormModal } from "@/components/landing/LandingPageFormModal";
import { landingPageService } from "@/services/landingPageService";
import type { LandingPageConfig } from "@/types/landingPage";

export function LandingPagesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LandingPageConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LandingPageConfig | null>(
    null,
  );
  const [activateTarget, setActivateTarget] =
    useState<LandingPageConfig | null>(null);
  const [deactivateTarget, setDeactivateTarget] =
    useState<LandingPageConfig | null>(null);

  const {
    data: configs,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["landing-pages"],
    queryFn: landingPageService.getAll,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => landingPageService.remove(id),
    onSuccess: () => {
      toast.success("Configuration deleted");
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      setDeleteTarget(null);
    },
  });

  const activateMut = useMutation({
    mutationFn: (id: string) => landingPageService.activate(id),
    onSuccess: () => {
      toast.success("Configuration published");
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      setActivateTarget(null);
    },
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => landingPageService.deactivate(id),
    onSuccess: () => {
      toast.success("Configuration taken offline");
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      setDeactivateTarget(null);
    },
  });

  function handleFormSuccess() {
    queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
    setFormOpen(false);
    setEditTarget(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Landing Page"
        description="Manage marketing landing page configurations"
      >
        <Button
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New Configuration
        </Button>
      </PageHeader>

      {isError && (
        <ErrorAlert message="Failed to load landing page configurations." />
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Shimmer key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : configs && configs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <MonitorSmartphone className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No configurations yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Create your first landing page configuration to get started.
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              setEditTarget(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create Configuration
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {configs?.map((config) => (
            <div
              key={config.id}
              className={cn(
                "rounded-xl border bg-white p-5 shadow-sm transition-colors dark:bg-gray-800",
                config.isActive
                  ? "border-green-300 ring-1 ring-green-200 dark:border-green-700 dark:ring-green-900"
                  : "border-gray-200 dark:border-gray-700",
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {config.name}
                    </h3>
                    <StatusBadge
                      status={config.isActive ? "active" : "draft"}
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 truncate">
                    {config.title}
                    {config.subtitle && ` — ${config.subtitle}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                    {config.heroBannerWebUrl && <span>Hero banner</span>}
                    {config.heroVideoUrl && <span>Hero video</span>}
                    {config.ctaLabel && <span>CTA: {config.ctaLabel}</span>}
                    <span>
                      Updated {new Date(config.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => navigate(`/landing-pages/${config.id}`)}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                    title="View & manage carousel"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditTarget(config);
                      setFormOpen(true);
                    }}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {config.isActive ? (
                    <button
                      onClick={() => setDeactivateTarget(config)}
                      className="rounded p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                      title="Take offline"
                    >
                      <ZapOff className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setActivateTarget(config)}
                      className="rounded p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                      title="Publish"
                    >
                      <Zap className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteTarget(config)}
                    className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {formOpen && (
        <LandingPageFormModal
          config={editTarget}
          onClose={() => {
            setFormOpen(false);
            setEditTarget(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Confirm modals */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Configuration"
        message={`Delete "${deleteTarget?.name}"? This will also remove all carousel items. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={!!activateTarget}
        title="Publish Configuration"
        message={`Publish "${activateTarget?.name}"? The currently active configuration will be automatically deactivated.`}
        confirmLabel="Publish"
        variant="primary"
        isLoading={activateMut.isPending}
        onConfirm={() =>
          activateTarget && activateMut.mutate(activateTarget.id)
        }
        onCancel={() => setActivateTarget(null)}
      />

      <ConfirmModal
        open={!!deactivateTarget}
        title="Take Offline"
        message={`Take "${deactivateTarget?.name}" offline? The public landing page will show the default state until another configuration is published.`}
        confirmLabel="Take Offline"
        variant="danger"
        isLoading={deactivateMut.isPending}
        onConfirm={() =>
          deactivateTarget && deactivateMut.mutate(deactivateTarget.id)
        }
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
