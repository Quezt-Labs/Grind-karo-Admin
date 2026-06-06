import { useQuery } from "@tanstack/react-query";
import { formCheckInboxService } from "@/services/formCheckInboxService";

export function useFormCheckPendingCount() {
  return useQuery({
    queryKey: ["form-check-pending-count"],
    queryFn: () => formCheckInboxService.pendingCount(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    select: (data) => data.pendingCount,
  });
}
