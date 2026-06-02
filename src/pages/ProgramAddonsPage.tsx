import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { programAddonService } from "@/services/programAddonService";
import { ProgramAddonFormModal } from "@/components/programs/ProgramAddonFormModal";
import type { Column } from "@/types/dashboard";
import type { ProgramAddon } from "@/types/program";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

type Row = {
  id: string;
  name: string;
  slug: string;
  price: string;
  grantsFormCheck: string;
  isActive: string;
};

const columns: Column<Row>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "slug", header: "Slug", sortable: true },
  { key: "price", header: "Price", sortable: true },
  { key: "grantsFormCheck", header: "Form Check", sortable: true },
  {
    key: "isActive",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
];

export function ProgramAddonsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProgramAddon | null>(null);
  const [editTarget, setEditTarget] = useState<ProgramAddon | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: addons,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["program-addons"],
    queryFn: programAddonService.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => programAddonService.remove(id),
    onSuccess: () => {
      toast.success("Program add-on deactivated");
      queryClient.invalidateQueries({ queryKey: ["program-addons"] });
      setDeleteTarget(null);
    },
  });

  const handleSearch = useCallback((value: string) => setSearchTerm(value), []);

  const addonMap = useMemo(() => {
    const map = new Map<string, ProgramAddon>();
    addons?.forEach((a) => map.set(a.id, a));
    return map;
  }, [addons]);

  const tableData: Row[] = useMemo(() => {
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
      price: formatINR(a.price),
      grantsFormCheck: a.grantsFormCheck ? "Yes" : "No",
      isActive: a.isActive ? "Active" : "Inactive",
    }));
  }, [addons, searchTerm]);

  const actionsColumn: Column<Row> = {
    key: "id",
    header: "Actions",
    render: (value) => {
      const addon = addonMap.get(value as string);
      if (!addon) return null;
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditTarget(addon)}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(addon)}
            className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      );
    },
  };

  if (isError) return <ErrorAlert message="Failed to load program add-ons." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Program Add-ons"
          description="Upsells at program checkout and in-app (Form Check, etc.)"
        />
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" /> New Add-on
        </Button>
      </div>

      <DebouncedSearch placeholder="Search add-ons…" onSearch={handleSearch} />

      <DataTable
        columns={[...columns, actionsColumn]}
        data={tableData}
        isLoading={isLoading}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Deactivate add-on?"
        message={`Deactivate "${deleteTarget?.name}"? Existing purchases stay valid.`}
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />

      {(showCreateModal || editTarget) && (
        <ProgramAddonFormModal
          addon={editTarget}
          onClose={() => {
            setShowCreateModal(false);
            setEditTarget(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["program-addons"] });
            setShowCreateModal(false);
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
