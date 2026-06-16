import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Headphones,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Type,
  Video,
} from "lucide-react";
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
import type { Announcement, AnnouncementKind } from "@/types/athleteEngagement";

type Row = {
  id: string;
  kind: string;
  title: string;
  preview: string;
  sortOrder: string;
  isActive: string;
};

const KIND_OPTIONS: Array<{
  value: AnnouncementKind;
  label: string;
  icon: typeof Type;
}> = [
  { value: "text", label: "Text", icon: Type },
  { value: "audio", label: "Audio", icon: Headphones },
  { value: "video", label: "Video", icon: Video },
];

function kindLabel(kind: AnnouncementKind): string {
  return KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind;
}

function previewText(item: Announcement): string {
  if (item.kind === "text") {
    return item.text ?? "—";
  }
  if (item.kind === "audio") {
    return item.mediaUrl ?? "—";
  }
  return item.mediaUrl ?? item.title ?? "—";
}

function canSave(
  kind: AnnouncementKind,
  title: string,
  text: string,
  mediaUrl: string,
): boolean {
  if (kind === "text") return text.trim().length > 0;
  if (kind === "audio")
    return title.trim().length > 0 && mediaUrl.trim().length > 0;
  return title.trim().length > 0 && mediaUrl.trim().length > 0;
}

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [kind, setKind] = useState<AnnouncementKind>("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: () => athleteEngagementService.listAnnouncements(),
  });

  const announcementMap = useMemo(() => {
    const map = new Map<string, Announcement>();
    data?.forEach((item) => map.set(item.id, item));
    return map;
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        kind,
        title: title.trim() || undefined,
        text: text.trim() || undefined,
        author: author.trim() || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
        sortOrder: parseInt(sortOrder, 10) || 0,
        isActive,
      };
      if (editing) {
        return athleteEngagementService.updateAnnouncement(editing.id, payload);
      }
      return athleteEngagementService.createAnnouncement(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Announcement updated" : "Announcement created");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      closeModal();
    },
    onError: () => {
      toast.error("Could not save announcement");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => athleteEngagementService.deleteAnnouncement(id),
    onSuccess: () => {
      toast.success("Announcement deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      setDeleteId(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setKind("text");
    setTitle("");
    setText("");
    setAuthor("");
    setMediaUrl("");
    setSortOrder("0");
    setIsActive(true);
    setModalOpen(true);
  }

  function openEdit(item: Announcement) {
    setEditing(item);
    setKind(item.kind);
    setTitle(item.title ?? "");
    setText(item.text ?? "");
    setAuthor(item.author ?? "");
    setMediaUrl(item.mediaUrl ?? "");
    setSortOrder(String(item.sortOrder));
    setIsActive(item.isActive);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  const rows: Row[] = (data ?? []).map((item) => ({
    id: item.id,
    kind: kindLabel(item.kind),
    title: item.title ?? (item.kind === "text" ? "Text" : "—"),
    preview: previewText(item),
    sortOrder: String(item.sortOrder),
    isActive: item.isActive ? "Active" : "Inactive",
  }));

  const columns: Column<Row>[] = [
    { key: "kind", header: "Type", sortable: true },
    { key: "title", header: "Title", sortable: true },
    { key: "preview", header: "Preview", sortable: false },
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
        const item = announcementMap.get(value as string);
        if (!item) return null;
        return (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => openEdit(item)}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteId(item.id)}
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
          title="Announcements"
          description="Text, audio, or video messages shown daily in the athlete app"
        />
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add announcement
        </Button>
      </div>

      {isError && <ErrorAlert message="Failed to load announcements" />}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <DataTable columns={columns} data={rows} />
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-indigo-500" />
              <h3 className="text-lg font-semibold">
                {editing ? "Edit announcement" : "New announcement"}
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {KIND_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = kind === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setKind(option.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs font-medium transition-colors ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700/40"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-3">
              {kind !== "text" && (
                <Input
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    kind === "audio" ? "Weekly coach note" : "Technique tip"
                  }
                />
              )}

              {kind === "text" && (
                <>
                  <Textarea
                    label="Message"
                    rows={4}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Announcement text shown to athletes"
                  />
                  <Input
                    label="Author (optional)"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                  />
                </>
              )}

              {kind === "audio" && (
                <>
                  <Input
                    label="Audio URL"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://…/coach-note.mp3"
                  />
                  <Textarea
                    label="Caption (optional)"
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </>
              )}

              {kind === "video" && (
                <>
                  <Input
                    label="YouTube URL"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…"
                  />
                  <Textarea
                    label="Caption (optional)"
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </>
              )}

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
                Active
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={
                  !canSave(kind, title, text, mediaUrl) ||
                  saveMutation.isPending
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
        title="Delete announcement?"
        message="This announcement will be removed from the daily rotation."
        confirmLabel="Delete"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
