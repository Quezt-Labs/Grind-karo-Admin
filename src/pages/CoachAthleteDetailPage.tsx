import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ClipboardList,
  CreditCard,
  Dumbbell,
  MapPin,
  MessageCircle,
  Video,
} from "lucide-react";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { athleteAssignmentService } from "@/services/athleteAssignmentService";
import { UserProgramFormCheckPanel } from "@/components/users/UserProgramFormCheckPanel";
import { UserWorkoutLogsPanel } from "@/components/users/UserWorkoutLogsPanel";
import { UserAthleteProgramPanel } from "@/components/users/UserAthleteProgramPanel";
import { CoachingFeeAdjustmentsPanel } from "@/components/users/CoachingFeeAdjustmentsPanel";
import { cn } from "@/utils/cn";
import { formatAthleteLocation } from "@/lib/indianStates";

type CoachActivityTab = "plan" | "program" | "videos" | "logs" | "chat";

export function CoachAthleteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tabState, setTabState] = useState<{
    athleteId: string;
    tab: CoachActivityTab;
  } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["coach-athlete-summary", id],
    queryFn: () => athleteAssignmentService.getCoachAthleteSummary(id!),
    enabled: !!id,
  });

  const assignment = data?.assignment;
  const athlete = data?.athlete;
  const isAssigned =
    !!assignment &&
    (assignment.personalCoachingEnabled || assignment.formCheckEnabled);

  const defaultTab = useMemo((): CoachActivityTab => {
    if (isAssigned) return "plan";
    return "chat";
  }, [isAssigned]);

  const tab = id && tabState?.athleteId === id ? tabState.tab : defaultTab;
  const setTab = (next: CoachActivityTab) => {
    if (!id) return;
    setTabState({ athleteId: id, tab: next });
  };

  const { data: purchaseData } = useQuery({
    queryKey: ["coach-athlete-purchases", id],
    queryFn: () => athleteAssignmentService.getCoachAthletePurchases(id!),
    enabled: !!id && isAssigned,
  });

  const tabs = useMemo(() => {
    const items: {
      key: CoachActivityTab;
      label: string;
      icon: React.ReactNode;
    }[] = [];
    if (isAssigned) {
      items.push({
        key: "plan",
        label: "Coaching plan",
        icon: <CreditCard className="h-3.5 w-3.5" />,
      });
    }
    if (assignment?.formCheckEnabled) {
      items.push({
        key: "videos",
        label: "Form-check videos",
        icon: <Video className="h-3.5 w-3.5" />,
      });
    }
    if (assignment?.personalCoachingEnabled) {
      items.push({
        key: "program",
        label: "Program",
        icon: <Dumbbell className="h-3.5 w-3.5" />,
      });
      items.push({
        key: "logs",
        label: "Workout logs",
        icon: <ClipboardList className="h-3.5 w-3.5" />,
      });
    }
    if (isAssigned) {
      items.push({
        key: "chat",
        label: "Chat",
        icon: <MessageCircle className="h-3.5 w-3.5" />,
      });
    }
    return items;
  }, [assignment, isAssigned]);

  const refreshPurchases = () => {
    void queryClient.invalidateQueries({
      queryKey: ["coach-athlete-purchases", id],
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (isError || !athlete) {
    return <ErrorAlert message="Failed to load athlete details." />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-4">
        <button
          type="button"
          onClick={() => navigate("/coach/athletes")}
          className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {athlete.name || "Unnamed athlete"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {athlete.email}
          </p>
          {(athlete.city || athlete.state) && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              {formatAthleteLocation(athlete.city, athlete.state)}
            </p>
          )}
          {assignment && (
            <div className="mt-2 flex flex-wrap gap-2">
              {assignment.personalCoachingEnabled && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                  Personal coaching
                </span>
              )}
              {assignment.formCheckEnabled && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Form check & chat
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {tabs.length > 0 && (
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === "plan" && isAssigned && id && (
        <CoachingFeeAdjustmentsPanel
          userId={id}
          purchases={purchaseData?.purchases ?? []}
          onUpdated={refreshPurchases}
        />
      )}

      {tab === "program" && assignment?.personalCoachingEnabled && id && (
        <UserAthleteProgramPanel
          userId={id}
          userName={athlete.name || athlete.email}
          purchases={purchaseData?.purchases ?? []}
        />
      )}

      {tab === "videos" && assignment?.formCheckEnabled && id && (
        <UserProgramFormCheckPanel userId={id} />
      )}

      {tab === "logs" && assignment?.personalCoachingEnabled && id && (
        <UserWorkoutLogsPanel
          userId={id}
          coachMode
          purchases={purchaseData?.purchases ?? []}
        />
      )}

      {tab === "chat" && isAssigned && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Open the chat thread with this athlete in the coach inbox.
          </p>
          <Link
            to={`/chat?userId=${athlete.id}`}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Open chat
          </Link>
        </div>
      )}
    </div>
  );
}
