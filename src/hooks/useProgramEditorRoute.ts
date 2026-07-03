import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { coachingProgramService } from "@/services/coachingProgramService";
import { isUuid } from "@/utils/isUuid";
import { useResolveProgramKey } from "@/hooks/useResolveProgramKey";

export type ProgramEditorScope = "program" | "coaching";

export function useProgramEditorRoute() {
  const { programKey, userId: athleteUserId } = useParams<{
    programKey?: string;
    userId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const legacyCoachingUserId = searchParams.get("coachingUserId");

  const athleteKey = athleteUserId ?? legacyCoachingUserId ?? undefined;
  const scope: ProgramEditorScope =
    athleteKey && !programKey ? "coaching" : "program";

  const {
    programId: resolvedProgramId,
    programSlug: resolvedProgramSlug,
    isResolving: resolvingProgramKey,
    resolveError: programKeyError,
  } = useResolveProgramKey(programKey);

  const { data: coachingData, isLoading: coachingUserLoading } = useQuery({
    queryKey: ["coaching-program", athleteKey],
    queryFn: () => coachingProgramService.getForUser(athleteKey!),
    enabled: scope === "coaching" && !!athleteKey && isUuid(athleteKey),
  });

  let programId: string | undefined;
  let programSlug: string | undefined;
  let coachingUserId: string | undefined;
  let resolveError: string | undefined;
  let coachingNeedsSetup = false;

  if (programKey) {
    programId = resolvedProgramId;
    programSlug = resolvedProgramSlug;
    resolveError = programKeyError;
    if (legacyCoachingUserId) coachingUserId = legacyCoachingUserId;
  } else if (athleteKey) {
    if (!isUuid(athleteKey)) {
      resolveError =
        "Coaching editor opens by athlete user id — use /coaching/{userId}/editor";
    } else {
      coachingUserId = athleteKey;
      if (coachingUserLoading) {
        // wait
      } else if (!coachingData?.program) {
        coachingNeedsSetup = true;
      } else if (coachingData.programMatchesActivePlan === false) {
        coachingNeedsSetup = true;
      } else {
        programId = coachingData.program.id;
        programSlug = coachingData.program.slug;
      }
    }
  } else {
    resolveError = "Missing program or athlete user id in URL";
  }

  const isResolving =
    (programKey ? resolvingProgramKey : false) ||
    (scope === "coaching" &&
      !!athleteKey &&
      isUuid(athleteKey) &&
      coachingUserLoading);

  return {
    scope,
    programId,
    programSlug,
    coachingUserId,
    coachingNeedsSetup,
    isResolving,
    resolveError,
  };
}
