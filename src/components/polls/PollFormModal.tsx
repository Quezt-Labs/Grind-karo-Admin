import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { pollService } from "@/services/pollService";
import type { CreatePollPayload, Poll, PollOptionInput } from "@/types/poll";

const SCOPE_OPTIONS = [
  { value: "ALL", label: "All products" },
  { value: "PROGRAMS", label: "Programs only" },
  { value: "COACHING_PLANS", label: "Coaching plans only" },
];

interface PollFormModalProps {
  poll: Poll | null;
  onClose: () => void;
  onSuccess: (poll: Poll) => void;
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PollFormModal({
  poll,
  onClose,
  onSuccess,
}: PollFormModalProps) {
  const isEdit = !!poll;
  const [slug, setSlug] = useState(poll?.slug ?? "");
  const [title, setTitle] = useState(poll?.title ?? "");
  const [subtitle, setSubtitle] = useState(poll?.subtitle ?? "");
  const [closesAt, setClosesAt] = useState(() => toLocalInput(poll?.closesAt));
  const [heroEyebrow, setHeroEyebrow] = useState(poll?.heroEyebrow ?? "");
  const [heroHeadline, setHeroHeadline] = useState(poll?.heroHeadline ?? "");
  const [ctaLabel, setCtaLabel] = useState(poll?.ctaLabel ?? "");
  const [participationDiscountValue, setParticipationDiscountValue] = useState(
    String(poll?.participationDiscountValue ?? 10),
  );
  const [winnerDiscountValue, setWinnerDiscountValue] = useState(
    String(poll?.winnerDiscountValue ?? 25),
  );
  const [participationScope, setParticipationScope] = useState(
    poll?.participationScope ?? "ALL",
  );
  const [winnerScope, setWinnerScope] = useState(poll?.winnerScope ?? "ALL");
  const [participationExpiresAt, setParticipationExpiresAt] = useState(
    toLocalInput(poll?.participationExpiresAt),
  );
  const [winnerExpiresAt, setWinnerExpiresAt] = useState(
    toLocalInput(poll?.winnerExpiresAt),
  );
  const [options, setOptions] = useState<PollOptionInput[]>(
    poll?.options.map((o) => ({
      id: o.id,
      label: o.label,
      subtitle: o.subtitle,
      imageUrl: o.imageUrl,
      sortOrder: o.sortOrder,
    })) ?? [
      { label: "Finalist A", subtitle: "TBD", sortOrder: 0 },
      { label: "Finalist B", subtitle: "TBD", sortOrder: 1 },
    ],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: CreatePollPayload = {
        slug: slug.trim(),
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        closesAt: new Date(closesAt).toISOString(),
        participationDiscountType: "PERCENT",
        participationDiscountValue: Number(participationDiscountValue),
        participationScope:
          participationScope as CreatePollPayload["participationScope"],
        participationExpiresAt: participationExpiresAt
          ? new Date(participationExpiresAt).toISOString()
          : null,
        winnerDiscountType: "PERCENT",
        winnerDiscountValue: Number(winnerDiscountValue),
        winnerScope: winnerScope as CreatePollPayload["winnerScope"],
        winnerExpiresAt: winnerExpiresAt
          ? new Date(winnerExpiresAt).toISOString()
          : null,
        heroEyebrow: heroEyebrow.trim() || null,
        heroHeadline: heroHeadline.trim() || null,
        ctaLabel: ctaLabel.trim() || null,
        options: options.map((o, i) => ({
          ...o,
          label: o.label.trim(),
          subtitle: o.subtitle?.trim() || null,
          sortOrder: o.sortOrder ?? i,
        })),
      };

      if (isEdit && poll) {
        const { slug: _slug, ...update } = payload;
        return pollService.update(poll.id, update);
      }
      return pollService.create(payload);
    },
    onSuccess: (result) => {
      toast.success(isEdit ? "Poll updated" : "Poll created");
      onSuccess(result);
    },
    onError: () => toast.error(isEdit ? "Update failed" : "Create failed"),
  });

  function updateOption(index: number, patch: Partial<PollOptionInput>) {
    setOptions((prev) =>
      prev.map((o, i) => (i === index ? { ...o, ...patch } : o)),
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? "Edit poll" : "New poll"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {!isEdit && (
            <Input
              label="Slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="fifa-final"
            />
          )}
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            label="Subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            rows={2}
          />
          <Input
            label="End date & time"
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
          />
          <p className="-mt-2 text-xs text-gray-500 dark:text-gray-400">
            Required. Voting auto-stops after this (local time). You can still
            Close manually earlier from the poll page.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Hero eyebrow"
              value={heroEyebrow}
              onChange={(e) => setHeroEyebrow(e.target.value)}
            />
            <Input
              label="Hero headline"
              value={heroHeadline}
              onChange={(e) => setHeroHeadline(e.target.value)}
            />
            <Input
              label="CTA label"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Participation % off"
              type="number"
              min={1}
              max={100}
              value={participationDiscountValue}
              onChange={(e) => setParticipationDiscountValue(e.target.value)}
            />
            <Input
              label="Winner % off"
              type="number"
              min={1}
              max={100}
              value={winnerDiscountValue}
              onChange={(e) => setWinnerDiscountValue(e.target.value)}
            />
            <Select
              label="Participation scope"
              value={participationScope}
              onValueChange={setParticipationScope}
              options={SCOPE_OPTIONS}
            />
            <Select
              label="Winner scope"
              value={winnerScope}
              onValueChange={setWinnerScope}
              options={SCOPE_OPTIONS}
            />
            <Input
              label="Participation coupon expires"
              type="datetime-local"
              value={participationExpiresAt}
              onChange={(e) => setParticipationExpiresAt(e.target.value)}
            />
            <Input
              label="Winner coupon expires"
              type="datetime-local"
              value={winnerExpiresAt}
              onChange={(e) => setWinnerExpiresAt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Options</p>
              {(!poll || poll.status === "DRAFT") && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setOptions((prev) => [
                      ...prev,
                      { label: "", subtitle: "", sortOrder: prev.length },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              )}
            </div>
            {options.map((opt, i) => (
              <div
                key={opt.id ?? `new-${i}`}
                className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <Input
                  label="Label"
                  value={opt.label}
                  onChange={(e) => updateOption(i, { label: e.target.value })}
                />
                <Input
                  label="Subtitle"
                  value={opt.subtitle ?? ""}
                  onChange={(e) =>
                    updateOption(i, { subtitle: e.target.value })
                  }
                />
                {(!poll || poll.status === "DRAFT") && options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-end"
                    onClick={() =>
                      setOptions((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            isLoading={mutation.isPending}
            onClick={() => mutation.mutate()}
            disabled={
              !title.trim() ||
              (!isEdit && !slug.trim()) ||
              !closesAt ||
              options.length < 2 ||
              options.some((o) => !o.label.trim())
            }
          >
            {isEdit ? "Save" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
