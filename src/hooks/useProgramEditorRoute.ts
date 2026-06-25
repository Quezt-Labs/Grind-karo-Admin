import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { programService } from "@/services/programService";
import { coachingProgramService } from "@/services/coachingProgramService";
import { isUuid } from "@/utils/isUuid";
import type { Program } from "@/types/programs";

export type ProgramEditorScope = "program" | "coaching";

function matchProgramKey(
  programs: Program[] | undefined,
  key: string,
): Program | undefined {
  if (!programs) return undefined;
  if (isUuid(key)) return programs.find((p) => p.id === key);
  return programs.find((p) => p.slug === key);
}

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

  const needsCatalogLookup = !!programKey && !isUuid(programKey);

  const { data: catalogPrograms, isLoading: catalogLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: programService.getAll,
    enabled: needsCatalogLookup,
  });

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
    if (isUuid(programKey)) {
      programId = programKey;
      const match = catalogPrograms?.find((p) => p.id === programKey);
      programSlug = match?.slug;
      if (match?.kind === "COACHING") {
        resolveError = `This is a per-athlete coaching program — open /coaching/${match.assignedUserId ?? "{userId}"}/editor`;
        programId = undefined;
      }
      if (legacyCoachingUserId) coachingUserId = legacyCoachingUserId;
    } else {
      const match = matchProgramKey(catalogPrograms, programKey);
      if (!match) {
        resolveError = catalogLoading
          ? undefined
          : `Program "${programKey}" not found`;
      } else if (match.kind === "COACHING") {
        resolveError = `This is a per-athlete coaching program — open /coaching/${match.assignedUserId ?? "{userId}"}/editor`;
      } else {
        programId = match.id;
        programSlug = match.slug;
        if (legacyCoachingUserId) coachingUserId = legacyCoachingUserId;
      }
    }
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
    (needsCatalogLookup && catalogLoading) ||
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
