import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { athleteEngagementService } from "@/services/athleteEngagementService";
import type { Column } from "@/types/dashboard";
import type { VideoLibraryItem } from "@/types/athleteEngagement";

type Row = {
  id: string;
  title: string;
  category: string;
  youtubeUrl: string;
  sortOrder: string;
  isActive: string;
};

export function VideoLibraryPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VideoLibraryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-video-library"],
    queryFn: () => athleteEngagementService.listVideos(),
  });

  const videoMap = useMemo(() => {
    const map = new Map<string, VideoLibraryItem>();
    data?.forEach((v) => map.set(v.id, v));
    return map;
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        sortOrder: parseInt(sortOrder, 10) || 0,
        isActive,
      };
      if (editing) {
        return athleteEngagementService.updateVideo(editing.id, payload);
      }
      return athleteEngagementService.createVideo(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Video updated" : "Video added");
      queryClient.invalidateQueries({ queryKey: ["admin-video-library"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => athleteEngagementService.deleteVideo(id),
    onSuccess: () => {
      toast.success("Video removed");
      queryClient.invalidateQueries({ queryKey: ["admin-video-library"] });
      setDeleteId(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setTitle("");
    setYoutubeUrl("");
    setDescription("");
    setCategory("");
    setSortOrder("0");
    setIsActive(true);
    setModalOpen(true);
  }

  function openEdit(video: VideoLibraryItem) {
    setEditing(video);
    setTitle(video.title);
    setYoutubeUrl(video.youtubeUrl);
    setDescription(video.description ?? "");
    setCategory(video.category ?? "");
    setSortOrder(String(video.sortOrder));
    setIsActive(video.isActive);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  const rows: Row[] = (data ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    category: v.category ?? "—",
    youtubeUrl: v.youtubeUrl,
    sortOrder: String(v.sortOrder),
    isActive: v.isActive ? "Active" : "Inactive",
  }));

  const columns: Column<Row>[] = [
    { key: "title", header: "Title", sortable: true },
    { key: "category", header: "Category", sortable: true },
    {
      key: "youtubeUrl",
      header: "YouTube",
      sortable: false,
      render: (value) => (
        <a
          href={value as string}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400"
        >
          Open
          <ExternalLink className="h-3 w-3" />
        </a>
      ),
    },
    { key: "sortOrder", header: "Order", sortable: true },
    {
      key: "isActive",
      header: "Status",
      sortable: true,
      render: (value) => (
        <StatusBadge status={value === "Active" ? "active" : "inactive"} />
      ),
    },
    {
      key: "id",
      header: "Actions",
      sortable: false,
      render: (value) => {
        const video = videoMap.get(value as string);
        if (!video) return null;
        return (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => openEdit(video)}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteId(video.id)}
              className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Video Library"
          description="YouTube URLs shown to athletes (Coming Soon section in app)"
        />
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add video
        </Button>
      </div>

      {isError && <ErrorAlert message="Failed to load videos" />}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <DataTable columns={columns} data={rows} />
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl dark:bg-gray-800">
            <h3 className="text-lg font-semibold">
              {editing ? "Edit video" : "Add video"}
            </h3>
            <div className="mt-4 space-y-3">
              <Input
                label="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Input
                label="YouTube URL"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              <Input
                label="Category (optional)"
                placeholder="Technique, Mindset..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <Textarea
                label="Description (optional)"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Input
                label="Sort order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Active (visible to athletes)
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={
                  !title.trim() || !youtubeUrl.trim() || saveMutation.isPending
                }
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Remove video?"
        message="Athletes will no longer see this video in the library."
        confirmLabel="Remove"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
