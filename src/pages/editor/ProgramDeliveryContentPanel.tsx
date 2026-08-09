import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, UtensilsCrossed, Flame } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { programService } from "@/services/programService";
import { trackerGuidanceService } from "@/services/trackerGuidanceService";
import { toSlug } from "@/utils/toSlug";
import type { ProgramResource } from "@/types/programs";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

type DeliveryKind = "nutrition" | "warmup";

type DeliveryContentItem = {
  id: string;
  title: string;
  body: string;
  sortOrder: number;
  kind: DeliveryKind;
  source: "guidance" | "program";
};

function detectKind(resource: ProgramResource): DeliveryKind | null {
  const slug = resource.slug.toLowerCase();
  const title = resource.title.toLowerCase();
  if (slug.includes("nutrition") || title.includes("nutrition")) {
    return "nutrition";
  }
  if (
    slug.includes("warmup") ||
    slug.includes("warm-up") ||
    title.includes("warmup") ||
    title.includes("warm-up")
  ) {
    return "warmup";
  }
  return null;
}

function kindLabel(kind: DeliveryKind): string {
  return kind === "nutrition" ? "Nutrition" : "Warm-up";
}

function mapProgramResource(resource: ProgramResource): DeliveryContentItem | null {
  const kind = detectKind(resource);
  if (!kind || resource.resourceType === "pdf") return null;
  return {
    id: resource.id,
    title: resource.title,
    body: resource.body ?? "",
    sortOrder: resource.sortOrder ?? 0,
    kind,
    source: "program",
  };
}

export function ProgramDeliveryContentPanel({
  programId,
  programName,
  coachingUserId,
  athleteLabel,
}: {
  programId: string;
  programName: string;
  coachingUserId?: string | null;
  athleteLabel?: string | null;
}) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<DeliveryKind>("nutrition");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [editing, setEditing] = useState<DeliveryContentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryContentItem | null>(null);

  const { data: deliveryResources = [], isLoading, isError } = useQuery({
    queryKey: ["delivery-content", coachingUserId ?? null, programId],
    queryFn: async (): Promise<DeliveryContentItem[]> => {
      if (coachingUserId) {
        try {
          const guidanceRows = await trackerGuidanceService.list(coachingUserId);
          return guidanceRows
            .map((row) => ({
              id: row.id,
              title: row.title,
              body: row.body,
              sortOrder: row.sortOrder ?? 0,
              kind: row.kind,
              source: "guidance" as const,
            }))
            .sort((a, b) => a.sortOrder - b.sortOrder);
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            if (status !== 404 && status !== 405) throw error;
          } else {
            throw error;
          }
        }
      }
      const resources = await programService.getResources(programId);
      return resources
        .map(mapProgramResource)
        .filter((resource): resource is DeliveryContentItem => resource != null)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    enabled: !!programId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const sort = Number.parseInt(sortOrder, 10) || 0;
      if (coachingUserId) {
        try {
          return await trackerGuidanceService.create(coachingUserId, {
            kind,
            title: title.trim(),
            body: body.trim(),
            sortOrder: sort,
            programId,
          });
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            if (status !== 404 && status !== 405) throw error;
          } else {
            throw error;
          }
        }
      }
      return programService.createResource(programId, {
        slug: `${kind}-${toSlug(title).slice(0, 48) || Date.now().toString()}`,
        title: title.trim(),
        body: body.trim(),
        resourceType: "markdown",
        sortOrder: sort,
      });
    },
    onSuccess: () => {
      toast.success(`${kindLabel(kind)} content created`);
      void queryClient.invalidateQueries({
        queryKey: ["delivery-content", coachingUserId ?? null, programId],
      });
      setTitle("");
      setBody("");
      setSortOrder("0");
    },
    onError: () => toast.error("Failed to create content"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("No content selected");
      const sort = Number.parseInt(sortOrder, 10) || 0;
      if (editing.source === "guidance" && coachingUserId) {
        return trackerGuidanceService.update(coachingUserId, editing.id, {
          kind,
          title: title.trim(),
          body: body.trim(),
          sortOrder: sort,
          programId,
        });
      }
      return programService.updateResource(programId, editing.id, {
        title: title.trim(),
        body: body.trim(),
        sortOrder: sort,
        resourceType: "markdown",
      });
    },
    onSuccess: () => {
      toast.success("Content updated");
      void queryClient.invalidateQueries({
        queryKey: ["delivery-content", coachingUserId ?? null, programId],
      });
      setEditing(null);
      setTitle("");
      setBody("");
      setSortOrder("0");
    },
    onError: () => toast.error("Failed to update content"),
  });

  const deleteMutation = useMutation({
    mutationFn: (item: DeliveryContentItem) => {
      if (item.source === "guidance" && coachingUserId) {
        return trackerGuidanceService.remove(coachingUserId, item.id);
      }
      return programService.removeResource(programId, item.id);
    },
    onSuccess: () => {
      toast.success("Content removed");
      void queryClient.invalidateQueries({
        queryKey: ["delivery-content", coachingUserId ?? null, programId],
      });
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to remove content"),
  });

  const saving = createMutation.isPending || updateMutation.isPending;
  const titleOk = title.trim().length >= 3;
  const bodyOk = body.trim().length >= 8;

  const grouped = useMemo(
    () => ({
      nutrition: deliveryResources.filter((r) => r.kind === "nutrition"),
      warmup: deliveryResources.filter((r) => r.kind === "warmup"),
    }),
    [deliveryResources],
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Delivery content authoring
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage nutrition guidance and warm-up instructions tied to{" "}
          <strong>{programName}</strong>
          {coachingUserId && athleteLabel
            ? ` for ${athleteLabel}.`
            : " across this program."}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Content type
            </label>
            <Select
              value={kind}
              onValueChange={(next) => setKind(next as DeliveryKind)}
              disabled={!!editing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nutrition">Nutrition</SelectItem>
                <SelectItem value="warmup">Warm-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Input
            label="Sort order"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
        <div className="mt-3 space-y-3">
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              kind === "nutrition"
                ? "High-protein meal structure"
                : "Day 1 squat warm-up sequence"
            }
          />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            placeholder={
              kind === "nutrition"
                ? "Write actionable athlete nutrition guidance..."
                : "Write warm-up steps with progression cues..."
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={saving || !titleOk || !bodyOk}
              onClick={() =>
                editing ? updateMutation.mutate() : createMutation.mutate()
              }
            >
              {editing ? "Update content" : `Add ${kindLabel(kind)}`}
            </Button>
            {editing ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditing(null);
                  setTitle("");
                  setBody("");
                  setSortOrder("0");
                }}
                disabled={saving}
              >
                Cancel edit
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading content…
        </p>
      ) : isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Could not load delivery content.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-emerald-500" />
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Nutrition
              </h4>
            </div>
            {grouped.nutrition.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No nutrition guidance yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {grouped.nutrition.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                          {item.body}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          onClick={() => {
                            setEditing(item);
                            setKind("nutrition");
                            setTitle(item.title);
                            setBody(item.body || "");
                            setSortOrder(String(item.sortOrder ?? 0));
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex items-center gap-2">
              <Flame className="h-4 w-4 text-indigo-500" />
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Warm-up
              </h4>
            </div>
            {grouped.warmup.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No warm-up content yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {grouped.warmup.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                          {item.body}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                          onClick={() => {
                            setEditing(item);
                            setKind("warmup");
                            setTitle(item.title);
                            setBody(item.body || "");
                            setSortOrder(String(item.sortOrder ?? 0));
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          onClick={() => setDeleteTarget(item)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {deleteTarget ? (
        <ConfirmModal
          open
          title="Delete content?"
          message={`Remove "${deleteTarget.title}" from this program?`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          isLoading={deleteMutation.isPending}
        />
      ) : null}
    </div>
  );
}
