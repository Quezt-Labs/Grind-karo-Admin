import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Copy, FilePlus, Pencil, Flame } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Input } from "@/components/ui/Input";
import { coachingProgramService } from "@/services/coachingProgramService";
import { MovementSelectionPanel } from "@/components/movement/MovementSelectionPanel";
import type { CoachingProgramRecord } from "@/services/coachingProgramService";
import type { Purchase } from "@/types/user";
import { coachingProgramMatchesSubscription } from "@/utils/coachingProgramPlanMatch";
import { primaryCoachingSubscription } from "@/utils/coachingCapabilities";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { CloneTemplateModal } from "./CloneTemplateModal";

interface UserAthleteProgramPanelProps {
  userId: string;
  userName: string;
  purchases?: Purchase[];
  primarySubscriptionId?: string | null;
  coachingData?: CoachingProgramRecord | null;
  coachingLoading?: boolean;
}

export function UserAthleteProgramPanel({
  userId,
  userName,
  purchases = [],
  primarySubscriptionId,
  coachingData: coachingDataProp,
  coachingLoading: coachingLoadingProp = false,
}: UserAthleteProgramPanelProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showClone, setShowClone] = useState(false);
  const [confirmReplaceBlank, setConfirmReplaceBlank] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [squat, setSquat] = useState("");
  const [bench, setBench] = useState("");
  const [deadlift, setDeadlift] = useState("");

  const useExternalCoaching = coachingDataProp !== undefined;

  const {
    data: fetchedCoaching,
    isLoading: fetchLoading,
    isError,
  } = useQuery({
    queryKey: ["coaching-program", userId],
    queryFn: () => coachingProgramService.getForUser(userId),
    enabled: !useExternalCoaching,
  });

  const data = useExternalCoaching ? coachingDataProp : fetchedCoaching;
  const isLoading = useExternalCoaching ? coachingLoadingProp : fetchLoading;

  const blankMut = useMutation({
    mutationFn: () => coachingProgramService.createBlank(userId),
    onSuccess: () => {
      toast.success("Blank program created");
      qc.invalidateQueries({ queryKey: ["coaching-program", userId] });
      navigate(`/coaching/${userId}/editor`);
    },
  });

  const replaceBlankMut = useMutation({
    mutationFn: () => coachingProgramService.replaceBlank(userId),
    onSuccess: () => {
      toast.success("Blank program created for current plan");
      setConfirmReplaceBlank(false);
      qc.invalidateQueries({ queryKey: ["coaching-program", userId] });
      navigate(`/coaching/${userId}/editor`);
    },
  });

  const profileMut = useMutation({
    mutationFn: () =>
      coachingProgramService.updateProfile(userId, data!.program.id, {
        squatOneRm: squat ? parseFloat(squat) : null,
        benchOneRm: bench ? parseFloat(bench) : null,
        deadliftOneRm: deadlift ? parseFloat(deadlift) : null,
      }),
    onSuccess: () => {
      toast.success("Athlete profile updated");
      setEditingProfile(false);
      qc.invalidateQueries({ queryKey: ["coaching-program", userId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600">Failed to load coaching program.</p>
    );
  }

  const activeCoachingSub = primaryCoachingSubscription(
    purchases,
    primarySubscriptionId,
  );
  const programMatchesPlan = !data?.program
    ? true
    : (data.programMatchesActivePlan ??
      coachingProgramMatchesSubscription(
        {
          coachingPlanId: data.program.coachingPlanId,
          createdAt: data.program.createdAt ?? new Date(0).toISOString(),
        },
        activeCoachingSub
          ? {
              planId: activeCoachingSub.planId,
              startDate: activeCoachingSub.startDate,
            }
          : null,
      ));

  if (data?.program && !programMatchesPlan && activeCoachingSub) {
    const staleName = data.program.name;
    const templateHint = staleName.includes(" — ")
      ? staleName.split(" — ").slice(1).join(" — ")
      : null;

    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-900/10">
        <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
          Program not linked to {activeCoachingSub.planName}
        </p>
        <p className="mt-1.5 text-sm text-amber-900/90 dark:text-amber-200/90">
          Stale program <strong>{staleName}</strong>
          {templateHint ? (
            <>
              {" "}
              (cloned from <strong>{templateHint}</strong>)
            </>
          ) : null}
          . Replace it to build for the current plan.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setShowClone(true)}>
            <Copy className="mr-1 h-3.5 w-3.5" />
            Clone from Template
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirmReplaceBlank(true)}
            isLoading={replaceBlankMut.isPending}
          >
            <FilePlus className="mr-1 h-3.5 w-3.5" />
            New Blank Program
          </Button>
        </div>
        {confirmReplaceBlank && (
          <ConfirmModal
            open
            title="Replace with blank program?"
            message={`This deletes "${staleName}" and starts a fresh program linked to ${activeCoachingSub.planName}.`}
            confirmLabel="Start blank"
            variant="danger"
            onConfirm={() => replaceBlankMut.mutate()}
            onCancel={() => setConfirmReplaceBlank(false)}
            isLoading={replaceBlankMut.isPending}
          />
        )}
        {showClone && (
          <CloneTemplateModal
            userId={userId}
            hasExistingProgram
            onClose={() => setShowClone(false)}
            onSuccess={() => {
              setShowClone(false);
              qc.invalidateQueries({ queryKey: ["coaching-program", userId] });
              navigate(`/coaching/${userId}/editor`);
            }}
          />
        )}
      </div>
    );
  }

  if (!data?.program) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
        <Dumbbell className="mx-auto mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          No program for {userName} yet
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Clone from a program template or start blank in the admin editor.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowClone(true)}
            isLoading={blankMut.isPending}
          >
            <Copy className="mr-1 h-3.5 w-3.5" />
            Clone from Template
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => blankMut.mutate()}
            isLoading={blankMut.isPending}
          >
            <FilePlus className="mr-1 h-3.5 w-3.5" />
            New Blank Program
          </Button>
        </div>
        {showClone && (
          <CloneTemplateModal
            userId={userId}
            hasExistingProgram={false}
            onClose={() => setShowClone(false)}
            onSuccess={() => {
              setShowClone(false);
              navigate(`/coaching/${userId}/editor`);
            }}
          />
        )}
      </div>
    );
  }

  const { program, profile, intake } = data;

  const planLabel =
    activeCoachingSub?.planName ?? data.activeCoachingPlanName ?? null;
  const programTitle = planLabel ?? program.name;

  const sbdSquat = profile?.squatOneRm ?? intake?.squatMax ?? null;
  const sbdBench = profile?.benchOneRm ?? intake?.benchMax ?? null;
  const sbdDeadlift = profile?.deadliftOneRm ?? intake?.deadliftMax ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {programTitle}
          </h3>
          <p className="text-xs text-gray-500">{userName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => navigate(`/coaching/${userId}/editor`)}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Open Program Editor
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              navigate(`/coaching/${userId}/editor?editorTab=delivery`)
            }
          >
            <Flame className="mr-1 h-3.5 w-3.5" />
            Nutrition & Warm-up
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowClone(true)}
          >
            <Copy className="mr-1 h-3.5 w-3.5" />
            Clone from Template…
          </Button>
        </div>
      </div>

      {!editingProfile ? (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span>
            <span className="text-gray-500">Squat:</span>{" "}
            <strong>{sbdSquat ?? "—"}</strong> kg
          </span>
          <span>
            <span className="text-gray-500">Bench:</span>{" "}
            <strong>{sbdBench ?? "—"}</strong> kg
          </span>
          <span>
            <span className="text-gray-500">Deadlift:</span>{" "}
            <strong>{sbdDeadlift ?? "—"}</strong> kg
          </span>
          <button
            type="button"
            onClick={() => {
              setSquat(sbdSquat != null ? String(sbdSquat) : "");
              setBench(sbdBench != null ? String(sbdBench) : "");
              setDeadlift(sbdDeadlift != null ? String(sbdDeadlift) : "");
              setEditingProfile(true);
            }}
            className="text-xs font-medium text-primary-600 hover:underline"
          >
            Edit SBD
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <Input
            id="athlete-squat"
            label="Squat 1RM"
            type="number"
            className="w-24"
            value={squat}
            onChange={(e) => setSquat(e.target.value)}
          />
          <Input
            id="athlete-bench"
            label="Bench 1RM"
            type="number"
            className="w-24"
            value={bench}
            onChange={(e) => setBench(e.target.value)}
          />
          <Input
            id="athlete-deadlift"
            label="Deadlift 1RM"
            type="number"
            className="w-24"
            value={deadlift}
            onChange={(e) => setDeadlift(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => profileMut.mutate()}
            isLoading={profileMut.isPending}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditingProfile(false)}
          >
            Cancel
          </Button>
        </div>
      )}

      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Movement selection
        </h4>
        <MovementSelectionPanel
          programId={program.id}
          userId={userId}
          mode="select"
        />
      </div>

      {showClone && (
        <CloneTemplateModal
          userId={userId}
          hasExistingProgram
          onClose={() => setShowClone(false)}
          onSuccess={() => {
            setShowClone(false);
            qc.invalidateQueries({ queryKey: ["coaching-program", userId] });
            navigate(`/coaching/${userId}/editor`);
          }}
        />
      )}
    </div>
  );
}
