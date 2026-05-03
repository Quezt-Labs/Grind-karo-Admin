import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Zap, ZapOff } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Shimmer } from "@/components/ui/Shimmer";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { CarouselItemFormModal } from "@/components/landing/CarouselItemFormModal";
import { landingPageService } from "@/services/landingPageService";
import { HeroSection } from "./landingDetail/HeroSection";
import { CarouselSection } from "./landingDetail/CarouselSection";
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

  const handleAdd = useCallback(() => {
    setEditItem(null);
    setItemFormOpen(true);
  }, []);

  const handleEdit = useCallback((item: CarouselItem) => {
    setEditItem(item);
    setItemFormOpen(true);
  }, []);

  const handleDelete = useCallback((item: CarouselItem) => {
    setDeleteItem(item);
  }, []);

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

      <HeroSection config={config} />

      <CarouselSection
        items={config.carouselItems ?? []}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

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
