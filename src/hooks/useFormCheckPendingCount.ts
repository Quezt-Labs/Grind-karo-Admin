import { useQuery } from "@tanstack/react-query";
import { formCheckKeys } from "@/hooks/formCheckQueryKeys";
import { formCheckInboxService } from "@/services/formCheckInboxService";

export function useFormCheckPendingCount() {
  return useQuery({
    queryKey: formCheckKeys.pendingCount(),
    queryFn: () => formCheckInboxService.pendingCount(),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    select: (data) => data.pendingCount,
  });
}
