import { useQuery } from "@tanstack/react-query";
import { athleteAssignmentService } from "@/services/athleteAssignmentService";

/** Athlete summary + purchases via coach API (works for admin and assistant coach). */
export function useCoachAthleteContext(
  athleteUserId: string | undefined,
  options?: { loadPurchases?: boolean },
) {
  const loadPurchases = options?.loadPurchases ?? false;

  const summaryQuery = useQuery({
    queryKey: ["coach-athlete-summary", athleteUserId],
    queryFn: () =>
      athleteAssignmentService.getCoachAthleteSummary(athleteUserId!),
    enabled: !!athleteUserId,
  });

  const purchasesQuery = useQuery({
    queryKey: ["coach-athlete-purchases", athleteUserId],
    queryFn: () =>
      athleteAssignmentService.getCoachAthletePurchases(athleteUserId!),
    enabled: !!athleteUserId && loadPurchases,
  });

  const athlete = summaryQuery.data?.athlete;

  return {
    athlete,
    athleteLabel: athlete?.name ?? athlete?.email ?? "Athlete",
    purchases: purchasesQuery.data?.purchases ?? [],
    isLoading:
      summaryQuery.isLoading || (loadPurchases && purchasesQuery.isLoading),
    isError: summaryQuery.isError || purchasesQuery.isError,
  };
}
