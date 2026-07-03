import { useQuery } from "@tanstack/react-query";
import { programService } from "@/services/programService";
import { isUuid } from "@/utils/isUuid";
import type { Program } from "@/types/programs";

function matchProgramKey(
  programs: Program[] | undefined,
  key: string,
): Program | undefined {
  if (!programs) return undefined;
  if (isUuid(key)) return programs.find((p) => p.id === key);
  return programs.find((p) => p.slug === key);
}

/** Resolve /programs/:programKey URLs where programKey may be a UUID or slug. */
export function useResolveProgramKey(programKey: string | undefined) {
  const needsCatalogLookup = !!programKey;

  const { data: catalogPrograms, isLoading: catalogLoading } = useQuery({
    queryKey: ["programs"],
    queryFn: programService.getAll,
    enabled: needsCatalogLookup,
  });

  let programId: string | undefined;
  let programSlug: string | undefined;
  let resolveError: string | undefined;

  if (!programKey) {
    resolveError = "Missing program id in URL";
  } else if (isUuid(programKey)) {
    const match = matchProgramKey(catalogPrograms, programKey);
    programId = programKey;
    programSlug = match?.slug;
    if (!catalogLoading && match?.kind === "COACHING") {
      resolveError = `This is a per-athlete coaching program — open /coaching/${match.assignedUserId ?? "{userId}"}/editor`;
      programId = undefined;
    }
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
    }
  }

  const isResolving = needsCatalogLookup && catalogLoading;

  return { programId, programSlug, isResolving, resolveError };
}
