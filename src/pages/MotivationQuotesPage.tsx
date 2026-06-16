import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import type { MotivationQuote } from "@/types/athleteEngagement";

type Row = {
  id: string;
  text: string;
  author: string;
  sortOrder: string;
  isActive: string;
};

export function MotivationQuotesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MotivationQuote | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-motivation-quotes"],
    queryFn: () => athleteEngagementService.listQuotes(),
  });

  const quoteMap = useMemo(() => {
    const map = new Map<string, MotivationQuote>();
    data?.forEach((q) => map.set(q.id, q));
    return map;
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        text: text.trim(),
        author: author.trim() || undefined,
        sortOrder: parseInt(sortOrder, 10) || 0,
        isActive,
      };
      if (editing) {
        return athleteEngagementService.updateQuote(editing.id, payload);
      }
      return athleteEngagementService.createQuote(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Quote updated" : "Quote created");
      queryClient.invalidateQueries({ queryKey: ["admin-motivation-quotes"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => athleteEngagementService.deleteQuote(id),
    onSuccess: () => {
      toast.success("Quote deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-motivation-quotes"] });
      setDeleteId(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setText("");
    setAuthor("");
    setSortOrder("0");
    setIsActive(true);
    setModalOpen(true);
  }

  function openEdit(quote: MotivationQuote) {
    setEditing(quote);
    setText(quote.text);
    setAuthor(quote.author ?? "");
    setSortOrder(String(quote.sortOrder));
    setIsActive(quote.isActive);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  const rows: Row[] = (data ?? []).map((q) => ({
    id: q.id,
    text: q.text,
    author: q.author ?? "—",
    sortOrder: String(q.sortOrder),
    isActive: q.isActive ? "Active" : "Inactive",
  }));

  const columns: Column<Row>[] = [
    { key: "text", header: "Quote", sortable: true },
    { key: "author", header: "Author", sortable: true },
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
        const quote = quoteMap.get(value as string);
        if (!quote) return null;
        return (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => openEdit(quote)}
              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteId(quote.id)}
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
          title="Motivation Quotes"
          description="Daily gym quotes shown to athletes in the app"
        />
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add quote
        </Button>
      </div>

      {isError && <ErrorAlert message="Failed to load quotes" />}

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
              {editing ? "Edit quote" : "New quote"}
            </h3>
            <div className="mt-4 space-y-3">
              <Textarea
                label="Quote"
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <Input
                label="Author (optional)"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
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
                Active
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!text.trim() || saveMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Delete quote?"
        message="This quote will be removed from the rotation."
        confirmLabel="Delete"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
