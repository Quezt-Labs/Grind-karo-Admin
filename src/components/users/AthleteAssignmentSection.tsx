import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, UserCog } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
import { cn } from "@/utils/cn";
import {
  athleteAssignmentService,
  assistantCoachService,
} from "@/services/athleteAssignmentService";
import type { UpsertAthleteAssignmentPayload } from "@/types/athleteAssignment";

interface AthleteAssignmentSectionProps {
  athleteId: string;
  defaultFormCheckEnabled?: boolean;
}

interface AssignmentFormProps {
  athleteId: string;
  assignment: Awaited<
    ReturnType<typeof athleteAssignmentService.getByAthleteId>
  >;
  coaches: Awaited<ReturnType<typeof assistantCoachService.list>>;
  defaultFormCheckEnabled: boolean;
}

function AssignmentForm({
  athleteId,
  assignment,
  coaches,
  defaultFormCheckEnabled,
}: AssignmentFormProps) {
  const queryClient = useQueryClient();
  const [assistantCoachId, setAssistantCoachId] = useState(
    assignment?.assistantCoachId ?? "",
  );
  const [personalCoaching, setPersonalCoaching] = useState(
    assignment?.personalCoachingEnabled ?? false,
  );
  const [formCheckSupport, setFormCheckSupport] = useState(
    assignment?.formCheckEnabled ?? defaultFormCheckEnabled,
  );

  const assignmentLabel = useMemo(() => {
    if (personalCoaching && formCheckSupport) return "Both services assigned";
    if (personalCoaching) return "Personal coaching only";
    if (formCheckSupport) return "Form check & chat support only";
    return "No assignment active";
  }, [personalCoaching, formCheckSupport]);

  const saveMutation = useMutation({
    mutationFn: (payload: UpsertAthleteAssignmentPayload) =>
      athleteAssignmentService.upsert(athleteId, payload),
    onSuccess: () => {
      toast.success("Athlete assignment saved");
      void queryClient.invalidateQueries({
        queryKey: ["athlete-assignment", athleteId],
      });
      void queryClient.invalidateQueries({ queryKey: ["assistant-coaches"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save assignment");
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      assistantCoachId: assistantCoachId || null,
      personalCoachingEnabled: personalCoaching,
      formCheckEnabled: formCheckSupport,
    });
  };

  return (
    <div className="mt-4 space-y-1 divide-y divide-gray-100 dark:divide-gray-700/60">
      <div className="pb-3">
        <label className="text-sm font-medium text-gray-900 dark:text-white">
          Assistant coach
        </label>
        <Select
          value={assistantCoachId || "__none__"}
          onValueChange={(v) => setAssistantCoachId(v === "__none__" ? "" : v)}
        >
          <SelectTrigger className="mt-2 w-full max-w-md">
            <SelectValue placeholder="Select assistant coach" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {coaches.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name?.trim() || c.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ToggleRow
        label="Personal coaching"
        description="Dedicated athlete management, progress tracking, and direct support."
        checked={personalCoaching}
        onChange={setPersonalCoaching}
      />

      <ToggleRow
        label="Form check & chat support"
        description="Form review, feedback, and chat support only."
        checked={formCheckSupport}
        onChange={setFormCheckSupport}
      />

      <p className="pt-3 text-xs text-gray-500 dark:text-gray-400">
        Status:{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {assignmentLabel}
        </span>
      </p>

      <div className="flex justify-end pt-3">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save assignment"
          )}
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}

export function AthleteAssignmentSection({
  athleteId,
  defaultFormCheckEnabled = false,
}: AthleteAssignmentSectionProps) {
  const { data: coaches = [], isLoading: coachesLoading } = useQuery({
    queryKey: ["assistant-coaches"],
    queryFn: () => assistantCoachService.list(),
  });

  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ["athlete-assignment", athleteId],
    queryFn: () => athleteAssignmentService.getByAthleteId(athleteId),
  });

  const loading = coachesLoading || assignmentLoading;
  const formKey = assignment?.updatedAt ?? `empty-${athleteId}`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-violet-50 p-2 dark:bg-violet-900/30">
          <UserCog className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Assistant coach assignment
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Assign an assistant coach and configure which services they handle
            for this athlete.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <AssignmentForm
          key={formKey}
          athleteId={athleteId}
          assignment={assignment ?? null}
          coaches={coaches}
          defaultFormCheckEnabled={defaultFormCheckEnabled}
        />
      )}
    </div>
  );
}
