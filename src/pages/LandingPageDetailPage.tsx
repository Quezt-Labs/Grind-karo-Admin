import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Image,
  ExternalLink,
  Zap,
  ZapOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Shimmer } from "@/components/ui/Shimmer";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { CarouselItemFormModal } from "@/components/landing/CarouselItemFormModal";
import { landingPageService } from "@/services/landingPageService";
import type { CarouselItem } from "@/types/landingPage";

export function LandingPageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<CarouselItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<CarouselItem | null>(null);

  const {
    data: config,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["landing-page", id],
    queryFn: () => landingPageService.getById(id!),
    enabled: !!id,
  });

  const activateMut = useMutation({
    mutationFn: () => landingPageService.activate(id!),
    onSuccess: () => {
      toast.success("Published");
      queryClient.invalidateQueries({ queryKey: ["landing-page", id] });
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
    },
  });

  const deactivateMut = useMutation({
    mutationFn: () => landingPageService.deactivate(id!),
    onSuccess: () => {
      toast.success("Taken offline");
      queryClient.invalidateQueries({ queryKey: ["landing-page", id] });
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
    },
  });

  const deleteItemMut = useMutation({
    mutationFn: (itemId: string) =>
      landingPageService.removeCarouselItem(id!, itemId),
    onSuccess: () => {
      toast.success("Carousel item deleted");
      queryClient.invalidateQueries({ queryKey: ["landing-page", id] });
      setDeleteItem(null);
    },
  });

  function handleItemSuccess() {
    queryClient.invalidateQueries({ queryKey: ["landing-page", id] });
    setItemFormOpen(false);
    setEditItem(null);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-10 w-48 rounded-lg" />
        <Shimmer className="h-64 rounded-xl" />
        <Shimmer className="h-48 rounded-xl" />
      </div>
    );
  }

  if (isError || !config) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/landing-pages")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <ErrorAlert message="Failed to load configuration." />
      </div>
    );
  }

  const items = config.carouselItems ?? [];

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <button
          onClick={() => navigate("/landing-pages")}
          className="mb-3 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          <ArrowLeft className="h-4 w-4" /> Back to configurations
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {config.name}
              </h1>
              <StatusBadge status={config.isActive ? "active" : "draft"} />
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {config.title}
              {config.subtitle ? ` — ${config.subtitle}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {config.isActive ? (
              <Button
                variant="secondary"
                onClick={() => deactivateMut.mutate()}
                isLoading={deactivateMut.isPending}
              >
                <ZapOff className="mr-1.5 h-4 w-4" /> Take Offline
              </Button>
            ) : (
              <Button
                onClick={() => activateMut.mutate()}
                isLoading={activateMut.isPending}
              >
                <Zap className="mr-1.5 h-4 w-4" /> Publish
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hero section preview */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
          Hero Section
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Banner previews */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Banner (Web)
            </p>
            {config.heroBannerWebUrl ? (
              <img
                src={config.heroBannerWebUrl}
                alt={config.heroBannerAlt ?? "Hero banner"}
                className="h-40 w-full rounded-lg border object-cover dark:border-gray-600"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-400 dark:border-gray-600">
                No web banner
              </div>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Banner (Mobile)
            </p>
            {config.heroBannerMobileUrl ? (
              <img
                src={config.heroBannerMobileUrl}
                alt={config.heroBannerAlt ?? "Hero banner"}
                className="h-40 w-auto mx-auto rounded-lg border object-cover dark:border-gray-600"
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-400 dark:border-gray-600">
                No mobile banner
              </div>
            )}
          </div>
        </div>

        {/* Video + CTA info */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCell
            label="Banner Link"
            value={config.heroBannerLinkUrl}
            isUrl
          />
          <InfoCell label="Video URL" value={config.heroVideoUrl} isUrl />
          <InfoCell
            label="Video Poster"
            value={config.heroVideoPosterUrl}
            isUrl
          />
          <InfoCell
            label="CTA"
            value={
              config.ctaLabel
                ? `${config.ctaLabel} → ${config.ctaUrl ?? "—"}`
                : null
            }
          />
        </div>
      </div>

      {/* Carousel items */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Carousel Items ({items.length})
          </h2>
          <Button
            size="sm"
            onClick={() => {
              setEditItem(null);
              setItemFormOpen(true);
            }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Slide
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
            <Image className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No carousel slides yet. Add your first slide above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/50"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-gray-400" />

                <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white dark:border-gray-600 dark:bg-gray-800">
                  {item.imageWebUrl ? (
                    <img
                      src={item.imageWebUrl}
                      alt={item.alt ?? ""}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {item.title || item.alt || `Slide ${item.sortOrder}`}
                  </p>
                  {item.subtitle && (
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {item.subtitle}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-gray-400">
                    Order: {item.sortOrder}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {item.linkUrl && (
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                      title="Open link"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setEditItem(item);
                      setItemFormOpen(true);
                    }}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteItem(item)}
                    className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
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

      {/* Carousel item form modal */}
      {itemFormOpen && (
        <CarouselItemFormModal
          configId={id!}
          item={editItem}
          onClose={() => {
            setItemFormOpen(false);
            setEditItem(null);
          }}
          onSuccess={handleItemSuccess}
        />
      )}

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteItem}
        title="Delete Carousel Item"
        message={`Delete "${deleteItem?.title || deleteItem?.alt || "this slide"}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteItemMut.isPending}
        onConfirm={() => deleteItem && deleteItemMut.mutate(deleteItem.id)}
        onCancel={() => setDeleteItem(null)}
      />
    </div>
  );
}

/* Small helper */
function InfoCell({
  label,
  value,
  isUrl,
}: {
  label: string;
  value?: string | null;
  isUrl?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </p>
      {value ? (
        isUrl ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 truncate text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            {new URL(value).pathname.slice(0, 40)}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <p className="mt-0.5 truncate text-sm text-gray-700 dark:text-gray-300">
            {value}
          </p>
        )
      ) : (
        <p className="mt-0.5 text-sm text-gray-400">—</p>
      )}
    </div>
  );
}
