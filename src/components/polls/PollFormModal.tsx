import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { ImageUploadField } from "@/components/shared/ImageUploadField";
import { pollService } from "@/services/pollService";
import type { CouponScope } from "@/types/coupon";
import type { CreatePollPayload, Poll, PollOptionInput } from "@/types/poll";

const SCOPE_OPTIONS = [
  {
    value: "PROGRAMS",
    label: "Programs only",
    info: "Valid only on program checkout",
  },
  {
    value: "COACHING_PLANS",
    label: "Coaching only",
    info: "Valid only on coaching plan checkout",
  },
  {
    value: "ALL",
    label: "Programs + coaching",
    info: "Valid on both programs and coaching",
  },
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
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(
    poll?.heroImageUrl ?? null,
  );
  const [participationDiscountValue, setParticipationDiscountValue] = useState(
    String(poll?.participationDiscountValue ?? 10),
  );
  const [winnerDiscountValue, setWinnerDiscountValue] = useState(
    String(poll?.winnerDiscountValue ?? 25),
  );
  const [participationScope, setParticipationScope] = useState<CouponScope>(
    poll?.participationScope ?? "PROGRAMS",
  );
  const [winnerScope, setWinnerScope] = useState<CouponScope>(
    poll?.winnerScope ?? "PROGRAMS",
  );
  const [participationExpiresAt, setParticipationExpiresAt] = useState(
    toLocalInput(poll?.participationExpiresAt),
  );
  const [winnerExpiresAt, setWinnerExpiresAt] = useState(
    toLocalInput(poll?.winnerExpiresAt),
  );
  const [bindRewardsToVoter, setBindRewardsToVoter] = useState(
    poll?.bindRewardsToVoter ?? true,
  );
  const [revealCodesAfterClose, setRevealCodesAfterClose] = useState(
    poll?.revealCodesAfterClose ?? true,
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
        participationScope,
        participationExpiresAt: participationExpiresAt
          ? new Date(participationExpiresAt).toISOString()
          : null,
        winnerDiscountType: "PERCENT",
        winnerDiscountValue: Number(winnerDiscountValue),
        winnerScope,
        winnerExpiresAt: winnerExpiresAt
          ? new Date(winnerExpiresAt).toISOString()
          : null,
        bindRewardsToVoter,
        revealCodesAfterClose,
        heroEyebrow: heroEyebrow.trim() || null,
        heroHeadline: heroHeadline.trim() || null,
        ctaLabel: ctaLabel.trim() || null,
        heroImageUrl: heroImageUrl || null,
        options: options.map((o, i) => ({
          ...o,
          label: o.label.trim(),
          subtitle: o.subtitle?.trim() || null,
          imageUrl: o.imageUrl || null,
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

          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              Hero background
            </p>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Shows behind the poll hero on the site.
            </p>
            <ImageUploadField
              imageUrl={heroImageUrl}
              onImageChange={setHeroImageUrl}
            />
          </div>

          <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Coupon rewards
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Set discount, where each code can be used, and expiry separately
                for participation vs winner.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Participation coupon
                </p>
                <Input
                  label="% off"
                  type="number"
                  min={1}
                  max={100}
                  value={participationDiscountValue}
                  onChange={(e) =>
                    setParticipationDiscountValue(e.target.value)
                  }
                />
                <Select
                  label="Applicable on"
                  labelInfo="Where this coupon can be redeemed at checkout"
                  value={participationScope}
                  onValueChange={(value) =>
                    setParticipationScope(value as CouponScope)
                  }
                  options={SCOPE_OPTIONS}
                />
                <Input
                  label="Expires"
                  type="datetime-local"
                  value={participationExpiresAt}
                  onChange={(e) => setParticipationExpiresAt(e.target.value)}
                />
              </div>

              <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/60">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Winner coupon
                </p>
                <Input
                  label="% off"
                  type="number"
                  min={1}
                  max={100}
                  value={winnerDiscountValue}
                  onChange={(e) => setWinnerDiscountValue(e.target.value)}
                />
                <Select
                  label="Applicable on"
                  labelInfo="Where the winner coupon can be redeemed at checkout"
                  value={winnerScope}
                  onValueChange={(value) =>
                    setWinnerScope(value as CouponScope)
                  }
                  options={SCOPE_OPTIONS}
                />
                <Input
                  label="Expires"
                  type="datetime-local"
                  value={winnerExpiresAt}
                  onChange={(e) => setWinnerExpiresAt(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-700">
              <CheckboxField
                id="bind-rewards-to-voter"
                label="Bind coupon to voter account"
                description="Only the logged-in voter who earned it can redeem."
                checked={bindRewardsToVoter}
                onCheckedChange={setBindRewardsToVoter}
              />
              <CheckboxField
                id="reveal-codes-after-close"
                label="Reveal code when results are declared"
                description="Hide participation codes until you click Show results (or Resolve). Redeem also unlocks then."
                checked={revealCodesAfterClose}
                onCheckedChange={setRevealCodesAfterClose}
              />
            </div>
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
                className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
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
                <div>
                  <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Option background photo
                  </p>
                  <ImageUploadField
                    imageUrl={opt.imageUrl ?? null}
                    onImageChange={(url) => updateOption(i, { imageUrl: url })}
                  />
                </div>
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
