import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { LinkAddonModal } from "@/components/coaching/LinkAddonModal";
import { programAddonService } from "@/services/programAddonService";
import type { Column } from "@/types/dashboard";
import type { CoachingAddon, ProgramAddon } from "@/types/program";

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
};

const columns: Column<Row>[] = [
  { key: "name", header: "Add-on", sortable: true },
  { key: "slug", header: "Slug" },
  { key: "price", header: "Effective Price", sortable: true },
];

interface ProgramAddonsPanelProps {
  programId: string;
}

export function ProgramAddonsPanel({ programId }: ProgramAddonsPanelProps) {
  const queryClient = useQueryClient();
  const [showLink, setShowLink] = useState(false);
  const [unlinkId, setUnlinkId] = useState<string | null>(null);

  const { data: linked = [], isLoading } = useQuery({
    queryKey: ["program-linked-addons", programId],
    queryFn: () => programAddonService.listForProgram(programId),
  });

  const { data: allAddons = [] } = useQuery({
    queryKey: ["program-addons"],
    queryFn: programAddonService.getAll,
  });

  const linkMutation = useMutation({
    mutationFn: (args: { addonId: string; priceOverride: number | null }) =>
      programAddonService.linkAddon(
        programId,
        args.addonId,
        args.priceOverride,
      ),
    onSuccess: () => {
      toast.success("Add-on linked");
      queryClient.invalidateQueries({
        queryKey: ["program-linked-addons", programId],
      });
      setShowLink(false);
    },
    onError: () => toast.error("Failed to link add-on"),
  });

  const unlinkMutation = useMutation({
    mutationFn: (addonId: string) =>
      programAddonService.unlinkAddon(programId, addonId),
    onSuccess: () => {
      toast.success("Add-on unlinked");
      queryClient.invalidateQueries({
        queryKey: ["program-linked-addons", programId],
      });
      setUnlinkId(null);
    },
    onError: () => toast.error("Failed to unlink add-on"),
  });

  const linkedIds = useMemo(() => new Set(linked.map((a) => a.id)), [linked]);

  const available: CoachingAddon[] = useMemo(() => {
    return allAddons
      .filter((a: ProgramAddon) => a.isActive && !linkedIds.has(a.id))
      .map((a) => ({
        id: a.id,
        slug: a.slug,
        name: a.name,
        description: a.description,
        price: a.price,
        isActive: a.isActive,
        sortOrder: a.sortOrder,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }));
  }, [allAddons, linkedIds]);

  const rows: Row[] = linked.map((a) => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    price: formatINR(a.price),
  }));

  const actionsColumn: Column<Row> = {
    key: "id",
    header: "",
    render: (value) => (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setUnlinkId(value as string)}
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    ),
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Program add-ons
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Optional upsells at checkout (Form Check, etc.).
          </p>
        </div>
        <Button size="sm" onClick={() => setShowLink(true)}>
          <Plus className="h-3.5 w-3.5" /> Link Add-on
        </Button>
      </div>

      <DataTable columns={[...columns, actionsColumn]} data={rows} />

      {showLink && (
        <LinkAddonModal
          availableAddons={available}
          onLink={(addonId, priceOverride) =>
            linkMutation.mutate({ addonId, priceOverride })
          }
          onClose={() => setShowLink(false)}
          isLoading={linkMutation.isPending}
        />
      )}

      <ConfirmModal
        open={!!unlinkId}
        title="Unlink add-on?"
        message="This add-on will no longer appear at checkout for this program."
        confirmLabel="Unlink"
        onConfirm={() => unlinkId && unlinkMutation.mutate(unlinkId)}
        onCancel={() => setUnlinkId(null)}
        isLoading={unlinkMutation.isPending}
      />
    </div>
  );
}
