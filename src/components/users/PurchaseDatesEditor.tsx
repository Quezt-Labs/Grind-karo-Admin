import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Loader2, Pencil, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { coachingSubscriptionService } from "@/services/coachingSubscriptionService";
import { programPurchaseService } from "@/services/programPurchaseService";
import type { Purchase } from "@/types/user";

function isoToDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/**
 * Add whole calendar months to a "YYYY-MM-DD" value, clamping the day so month
 * overflow (e.g. 31 Jan + 1 month) stays inside the target month instead of
 * rolling into the next one. Returns "" for invalid input.
 */
function addMonthsToDateInput(dateInput: string, months: number): string {
  if (!dateInput) return "";
  const d = new Date(`${dateInput}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const daysInTargetMonth = new Date(
    d.getFullYear(),
    d.getMonth() + 1,
    0,
  ).getDate();
  d.setDate(Math.min(day, daysInTargetMonth));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const END_DATE_PRESETS = Array.from({ length: 12 }, (_, i) => {
  const months = i + 1;
  return { months, label: String(months) };
});

type Props = {
  userId: string;
  purchase: Purchase;
  onUpdated?: () => void;
};

export function PurchaseDatesEditor({ userId, purchase, onUpdated }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const isCoaching = purchase.kind === "coaching_subscription";
  const isProgram =
    purchase.kind === "program_purchase" && purchase.status === "PAID";

  const canEdit =
    (isCoaching &&
      (purchase.status === "ACTIVE" || purchase.status === "EXPIRED")) ||
    isProgram;

  const [startDate, setStartDate] = useState(() =>
    isCoaching
      ? isoToDateInput(purchase.startDate)
      : purchase.kind === "program_purchase" && purchase.paidAt
        ? isoToDateInput(purchase.paidAt)
        : "",
  );
  const [endDate, setEndDate] = useState(() =>
    isCoaching ? isoToDateInput(purchase.expiresAt) : "",
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["admin-user-purchases", userId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["coaching-billing-adjustments", userId],
    });
    onUpdated?.();
  };

  const coachingMutation = useMutation({
    mutationFn: () => {
      if (purchase.kind !== "coaching_subscription") {
        throw new Error("Invalid purchase type");
      }
      const body: {
        startDate?: string;
        expiresAt?: string;
        reason: string;
      } = { reason: reason.trim() };

      const currentStart = isoToDateInput(purchase.startDate);
      const currentEnd = isoToDateInput(purchase.expiresAt);
      if (startDate && startDate !== currentStart) {
        body.startDate = new Date(`${startDate}T00:00:00`).toISOString();
      }
      if (endDate && endDate !== currentEnd) {
        body.expiresAt = new Date(`${endDate}T23:59:59`).toISOString();
      }
      if (!body.startDate && !body.expiresAt) {
        throw new Error("Change at least one date before saving");
      }
      return coachingSubscriptionService.patchSubscriptionDates(
        purchase.id,
        body,
      );
    },
    onSuccess: () => {
      toast.success("Coaching dates updated");
      setOpen(false);
      setReason("");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to update coaching dates"),
  });

  const programMutation = useMutation({
    mutationFn: () => {
      if (purchase.kind !== "program_purchase" || !purchase.paidAt) {
        throw new Error("Invalid purchase type");
      }
      const currentStart = isoToDateInput(purchase.paidAt);
      if (!startDate || startDate === currentStart) {
        throw new Error("Change the start date before saving");
      }
      return programPurchaseService.patchStartDate(purchase.id, {
        startDate: new Date(`${startDate}T00:00:00`).toISOString(),
        reason: reason.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Program start date updated");
      setOpen(false);
      setReason("");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to update program start date"),
  });

  const busy = coachingMutation.isPending || programMutation.isPending;

  const startInvalid =
    open &&
    (!startDate || Number.isNaN(new Date(`${startDate}T12:00:00`).getTime()));
  const endInvalid =
    open &&
    isCoaching &&
    (!endDate || Number.isNaN(new Date(`${endDate}T12:00:00`).getTime()));

  const canSave =
    open && reason.trim().length >= 3 && !startInvalid && !endInvalid && !busy;

  if (!canEdit) return null;

  const resetForm = () => {
    if (isCoaching) {
      setStartDate(isoToDateInput(purchase.startDate));
      setEndDate(isoToDateInput(purchase.expiresAt));
    } else if (purchase.kind === "program_purchase" && purchase.paidAt) {
      setStartDate(isoToDateInput(purchase.paidAt));
    }
    setReason("");
  };

  return (
    <div className="mt-2">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200"
        >
          <Pencil className="h-3 w-3" />
          Edit dates
        </button>
      ) : (
        <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/40">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
              <CalendarDays className="h-3.5 w-3.5" />
              {isCoaching ? "Coaching dates" : "Program start date"}
            </span>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              label={isCoaching ? "Payment / start date" : "Program start date"}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              error={startInvalid ? "Enter a valid date" : undefined}
            />
            {isCoaching && (
              <div>
                <Input
                  label="End date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  error={endInvalid ? "Enter a valid date" : undefined}
                />
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="mr-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                    From start (months):
                  </span>
                  {END_DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.months}
                      type="button"
                      disabled={!startDate || startInvalid}
                      onClick={() =>
                        setEndDate(
                          addMonthsToDateInput(startDate, preset.months),
                        )
                      }
                      className="min-w-[26px] rounded-md border border-indigo-200 bg-white px-1.5 py-0.5 text-center text-[11px] font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-800 dark:bg-gray-800 dark:text-indigo-300 dark:hover:bg-gray-700"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required) — e.g. Wrong date entered during onboarding"
            rows={2}
            className="mt-2 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!canSave}
              onClick={() =>
                isCoaching
                  ? coachingMutation.mutate()
                  : programMutation.mutate()
              }
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Save dates"
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
