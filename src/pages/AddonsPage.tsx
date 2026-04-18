import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Puzzle } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { addonService } from "@/services/addonService";
import { AddonFormModal } from "@/components/coaching/AddonFormModal";
import type { Column } from "@/types/dashboard";
import type { CoachingAddon } from "@/types/program";

function formatPrice(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

type AddonRow = {
  id: string;
  name: string;
  slug: string;
  price: string;
  sortOrder: string;
  isActive: string;
};

const addonColumns: Column<AddonRow>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "slug", header: "Slug", sortable: true },
  { key: "price", header: "Price", sortable: true },
  { key: "sortOrder", header: "Sort Order", sortable: true },
  {
    key: "isActive",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
];

export function AddonsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CoachingAddon | null>(null);
  const [editTarget, setEditTarget] = useState<CoachingAddon | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: addons,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["coaching-addons"],
    queryFn: addonService.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => addonService.remove(id),
    onSuccess: () => {
      toast.success("Add-on deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["coaching-addons"] });
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error("Failed to delete add-on");
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const addonMap = useMemo(() => {
    const map = new Map<string, CoachingAddon>();
    addons?.forEach((a) => map.set(a.id, a));
    return map;
  }, [addons]);

  const tableData: AddonRow[] = useMemo(() => {
    if (!addons) return [];
    let filtered = addons;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = addons.filter(
        (a) =>
          a.name.toLowerCase().includes(term) ||
          a.slug.toLowerCase().includes(term),
      );
    }
    return filtered.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      price: formatPrice(a.price),
      sortOrder: String(a.sortOrder),
      isActive: a.isActive ? "Active" : "Inactive",
    }));
  }, [addons, searchTerm]);

  const actionsColumn = {
    key: "id" as keyof AddonRow & string,
    header: "Actions",
    render: (value: AddonRow[keyof AddonRow]) => {
      const addon = addonMap.get(value as string);
      if (!addon) return null;
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditTarget(addon)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(addon)}
            className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Add-ons"
          description="Manage coaching add-ons that can be linked to plans"
        />
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          Create Add-on
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search add-ons..."
          className="w-full sm:w-72"
        />
      </div>

      {isError ? (
        <ErrorAlert message="Failed to load add-ons. Please try again later." />
      ) : !isLoading && tableData.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <Puzzle className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            No add-ons yet
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Create add-ons to offer extra services with coaching plans.
          </p>
          <Button className="mt-5" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Create Your First Add-on
          </Button>
        </div>
      ) : (
        <DataTable
          data={tableData}
          columns={[...addonColumns, actionsColumn]}
          isLoading={isLoading}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Add-on"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      {(showCreateModal || editTarget) && (
        <AddonFormModal
          addon={editTarget}
          onClose={() => {
            setShowCreateModal(false);
            setEditTarget(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["coaching-addons"] });
            setShowCreateModal(false);
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
