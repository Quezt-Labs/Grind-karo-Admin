import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
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
import { programService } from "@/services/programService";
import { programPurchaseService } from "@/services/programPurchaseService";
import { formatINR } from "@/pages/users/usersConstants";
import { todayDateInput } from "@/utils/coachingBilling";
import type { Purchase } from "@/types/user";

type Props = {
  userId: string;
  purchases: Purchase[];
  onUpdated?: () => void;
};

function programPrice(p: {
  salePrice: number | null;
  regularPrice: number;
}): number {
  return p.salePrice ?? p.regularPrice;
}

export function ProgramGrantPanel({ userId, purchases, onUpdated }: Props) {
  const queryClient = useQueryClient();
  const [programId, setProgramId] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(todayDateInput);
  const [reason, setReason] = useState("");

  const ownedProgramIds = useMemo(
    () =>
      new Set(
        purchases
          .filter(
            (p): p is Extract<Purchase, { kind: "program_purchase" }> =>
              p.kind === "program_purchase" && p.status === "PAID",
          )
          .map((p) => p.programId),
      ),
    [purchases],
  );

  const { data: programs = [] } = useQuery({
    queryKey: ["admin-programs"],
    queryFn: () => programService.getAll(),
  });

  const availablePrograms = useMemo(
    () => programs.filter((p) => p.isActive && !ownedProgramIds.has(p.id)),
    [programs, ownedProgramIds],
  );

  const selectedProgram = programs.find((p) => p.id === programId);

  const grantMutation = useMutation({
    mutationFn: () =>
      programPurchaseService.recordManualGrant({
        userId,
        programId,
        amount: amount.trim() ? Number(amount.trim()) : undefined,
        startDate: new Date(`${startDate}T00:00:00`).toISOString(),
        reason: reason.trim(),
      }),
    onSuccess: () => {
      toast.success("Program access granted");
      setProgramId("");
      setAmount("");
      setStartDate(todayDateInput());
      setReason("");
      void queryClient.invalidateQueries({
        queryKey: ["admin-user-purchases", userId],
      });
      void queryClient.invalidateQueries({ queryKey: ["admin-purchasers"] });
      onUpdated?.();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to grant program"),
  });

  const amountInvalid =
    amount.trim().length > 0 &&
    (!Number.isFinite(Number(amount)) || Number(amount) <= 0);

  const startDateInvalid =
    programId.length > 0 &&
    (!startDate || Number.isNaN(new Date(`${startDate}T12:00:00`).getTime()));

  const canSubmit =
    programId.length > 0 &&
    startDate.length > 0 &&
    reason.trim().length >= 3 &&
    !amountInvalid &&
    !startDateInvalid &&
    !grantMutation.isPending;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Grant program
        </h2>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Give lifetime program access for offline payments or legacy athletes.
        Set the start date for when their program week 1 should begin.
      </p>

      {availablePrograms.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No programs available to grant — user may already own all active
          programs.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Program
              </label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {availablePrograms.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name} ({formatINR(programPrice(program))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Amount (INR)"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={
                selectedProgram
                  ? `Default ${formatINR(programPrice(selectedProgram))}`
                  : "Optional"
              }
              disabled={!programId}
              error={
                amountInvalid
                  ? "Enter a valid amount greater than zero"
                  : undefined
              }
            />
            <Input
              label="Program start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={!programId}
              error={startDateInvalid ? "Enter a valid start date" : undefined}
            />
          </div>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required) — e.g. Offline UPI for 9to5 Powerbuilder"
            rows={2}
            className="text-sm"
          />
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => grantMutation.mutate()}
          >
            {grantMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            Grant program access
          </Button>
        </div>
      )}
    </div>
  );
}
