import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
import { cn } from "@/utils/cn";
import { userService } from "@/services/userService";
import { planService } from "@/services/planService";
import { programService } from "@/services/programService";
import { assistantCoachService } from "@/services/athleteAssignmentService";
import { CoachingBillingFields } from "@/components/users/CoachingBillingFields";
import {
  coachingBillingPayload,
  initialCoachingBillingState,
  todayDateInput,
  type FeeCoversMonths,
} from "@/utils/coachingBilling";
import type { CreateAdminUserPayload } from "@/types/user";
import { planGrantsFormCheck } from "@/utils/coachingPlanCapabilities";

type Props = {
  onClose: () => void;
};

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function programPrice(p: {
  salePrice: number | null;
  regularPrice: number;
}): number {
  return p.salePrice ?? p.regularPrice;
}

export function AddUserSection({ onClose }: Props) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<CreateAdminUserPayload["role"]>("USER");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [planId, setPlanId] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [programId, setProgramId] = useState("");
  const [programAmount, setProgramAmount] = useState("");
  const [programStartDate, setProgramStartDate] = useState(todayDateInput);
  const [billing, setBilling] = useState(() => initialCoachingBillingState());
  const [assistantCoachId, setAssistantCoachId] = useState("");
  const [personalCoaching, setPersonalCoaching] = useState(true);
  const [formCheckSupport, setFormCheckSupport] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ["coaching-plans"],
    queryFn: () => planService.getAll(),
    enabled: role === "USER",
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["admin-programs"],
    queryFn: () => programService.getAll(),
    enabled: role === "USER",
  });

  const { data: coaches = [] } = useQuery({
    queryKey: ["assistant-coaches"],
    queryFn: () => assistantCoachService.list(),
    enabled: role === "USER",
  });

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planId),
    [plans, planId],
  );

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === programId),
    [programs, programId],
  );

  const createMutation = useMutation({
    mutationFn: () => {
      const payload: CreateAdminUserPayload = {
        email: email.trim(),
        name: name.trim() || undefined,
        role,
        password: role === "ASSISTANT_COACH" ? password : undefined,
      };

      if (role === "USER") {
        if (planId) {
          payload.coaching = coachingBillingPayload(
            planId,
            customPrice,
            billing,
          );
        }
        if (programId) {
          payload.program = {
            programId,
            amount: programAmount.trim()
              ? Number(programAmount.trim())
              : undefined,
            startDate: programStartDate
              ? new Date(`${programStartDate}T00:00:00`).toISOString()
              : undefined,
          };
        }
        if (assistantCoachId) {
          payload.assignment = {
            assistantCoachId,
            personalCoachingEnabled: personalCoaching,
            formCheckEnabled: formCheckSupport,
          };
        }
      }

      return userService.create(payload);
    },
    onSuccess: (result) => {
      const parts = [
        result.user.created
          ? `${role === "ASSISTANT_COACH" ? "Assistant coach" : "User"} created`
          : "User updated",
      ];
      if (result.coaching) {
        parts.push(
          `coaching ${result.coaching.planName} (${formatINR(result.coaching.totalAmount)})`,
        );
      }
      if (result.program) {
        parts.push(
          `program ${result.program.programName} (${formatINR(result.program.amount)})`,
        );
      }
      if (result.assignment) {
        parts.push("assistant coach assigned");
      }
      toast.success(parts.join(" · "));
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-purchasers"] });
      void queryClient.invalidateQueries({ queryKey: ["assistant-coaches"] });
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create user");
    },
  });

  const customPriceInvalid =
    customPrice.trim().length > 0 &&
    (!Number.isFinite(Number(customPrice)) || Number(customPrice) <= 0);

  const programAmountInvalid =
    programAmount.trim().length > 0 &&
    (!Number.isFinite(Number(programAmount)) || Number(programAmount) <= 0);

  const canSubmit =
    email.trim().length > 0 &&
    (role === "USER" || password.length >= 8) &&
    !customPriceInvalid &&
    !programAmountInvalid &&
    !createMutation.isPending;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
        Add user
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        App users sign in with OTP. Assistant coaches use the admin login with
        email and password. Existing emails update the user and grant access.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Role
          </label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as CreateAdminUserPayload["role"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USER">App user</SelectItem>
              <SelectItem value="ASSISTANT_COACH">Assistant coach</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
        />
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional"
        />
        {role === "ASSISTANT_COACH" && (
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
          />
        )}
      </div>

      {role === "USER" && (
        <div className="mt-5 space-y-4 border-t border-gray-100 pt-4 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Coaching (optional)
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Grant a paid coaching plan with fee period and optional dates for
              legacy athletes.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Coaching plan
                </label>
                <Select
                  value={planId || "__none__"}
                  onValueChange={(v) => {
                    const next = v === "__none__" ? "" : v;
                    setPlanId(next);
                    setCustomPrice("");
                    const plan = plans.find((p) => p.id === next);
                    setBilling(initialCoachingBillingState(plan));
                    setFormCheckSupport(
                      plan ? planGrantsFormCheck(plan.slug) : false,
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No plan yet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} ({formatINR(plan.price)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                label="Custom price (INR)"
                type="number"
                min={1}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder={
                  selectedPlan
                    ? `Default ${formatINR(selectedPlan.price)}`
                    : "Optional"
                }
                disabled={!planId}
                error={
                  customPriceInvalid
                    ? "Enter a valid amount greater than zero"
                    : undefined
                }
              />
            </div>
            <CoachingBillingFields
              plan={selectedPlan}
              feeCoversMonths={billing.feeCoversMonths}
              startDate={billing.startDate}
              endDate={billing.endDate}
              endDateTouched={billing.endDateTouched}
              onFeeCoversMonthsChange={(feeCoversMonths: FeeCoversMonths) =>
                setBilling((b) => ({ ...b, feeCoversMonths }))
              }
              onStartDateChange={(startDate) =>
                setBilling((b) => ({ ...b, startDate }))
              }
              onEndDateChange={(endDate) =>
                setBilling((b) => ({ ...b, endDate }))
              }
              onEndDateTouchedChange={(endDateTouched) =>
                setBilling((b) => ({ ...b, endDateTouched }))
              }
            />
            {!planId && (
              <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                Coaching plan select karo — Start date &amp; End date fields
                yahan dikhenge.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Program (optional)
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Lifetime program access. Set when week 1 should start for the
              athlete.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Program
                </label>
                <Select
                  value={programId || "__none__"}
                  onValueChange={(v) => {
                    setProgramId(v === "__none__" ? "" : v);
                    setProgramAmount("");
                    setProgramStartDate(todayDateInput());
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {programs
                      .filter((p) => p.isActive)
                      .map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name} ({formatINR(programPrice(program))})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                label="Custom price (INR)"
                type="number"
                min={1}
                value={programAmount}
                onChange={(e) => setProgramAmount(e.target.value)}
                placeholder={
                  selectedProgram
                    ? `Default ${formatINR(programPrice(selectedProgram))}`
                    : "Optional"
                }
                disabled={!programId}
                error={
                  programAmountInvalid
                    ? "Enter a valid amount greater than zero"
                    : undefined
                }
              />
              <Input
                label="Program start date"
                type="date"
                value={programStartDate}
                onChange={(e) => setProgramStartDate(e.target.value)}
                disabled={!programId}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Assistant coach (optional)
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Assign after coaching or program is granted, or if the user
              already has a paid purchase.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Assistant coach
                </label>
                <Select
                  value={assistantCoachId || "__none__"}
                  onValueChange={(v) =>
                    setAssistantCoachId(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.name?.trim() || coach.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {assistantCoachId && (
                <>
                  <label className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Personal coaching
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={personalCoaching}
                      onClick={() => setPersonalCoaching((v) => !v)}
                      className={cn(
                        "relative inline-flex h-6 w-11 rounded-full transition-colors",
                        personalCoaching
                          ? "bg-indigo-600"
                          : "bg-gray-300 dark:bg-gray-600",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform",
                          personalCoaching
                            ? "translate-x-5"
                            : "translate-x-0.5",
                        )}
                      />
                    </button>
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-600">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Form check & chat
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formCheckSupport}
                      onClick={() => setFormCheckSupport((v) => !v)}
                      className={cn(
                        "relative inline-flex h-6 w-11 rounded-full transition-colors",
                        formCheckSupport
                          ? "bg-indigo-600"
                          : "bg-gray-300 dark:bg-gray-600",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform",
                          formCheckSupport
                            ? "translate-x-5"
                            : "translate-x-0.5",
                        )}
                      />
                    </button>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button onClick={() => createMutation.mutate()} disabled={!canSubmit}>
          Create user
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
