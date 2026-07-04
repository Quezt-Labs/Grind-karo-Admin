import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Video } from "lucide-react";
import { FormCheckInboxExerciseList } from "@/components/form-check/FormCheckInboxExerciseList";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { formCheckInboxService } from "@/services/formCheckInboxService";
import type { FormCheckQuota, Purchase } from "@/types/user";
import { FormCheckBillingControls } from "@/components/users/FormCheckBillingControls";
import { bulkUpsertFormCheckComments } from "@/utils/bulkFormCheckComments";
import { pendingTargetsForVideos } from "@/utils/formCheckCommentTargets";
import { groupFormCheckInboxItems } from "@/utils/groupFormCheckInboxItems";

type ReviewFilter = "pending" | "all";

interface UserProgramFormCheckPanelProps {
  userId: string;
  formCheckQuota?: FormCheckQuota;
  purchases?: Purchase[];
  showBilling?: boolean;
  onBillingUpdated?: () => void;
}

export function UserProgramFormCheckPanel({
  userId,
  formCheckQuota,
  purchases = [],
  showBilling = false,
  onBillingUpdated,
}: UserProgramFormCheckPanelProps) {
  const queryClient = useQueryClient();
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["form-check-inbox", reviewFilter, userId],
    queryFn: () =>
      formCheckInboxService.list({
        userId,
        uncommentedOnly: reviewFilter === "pending",
        limit: 100,
      }),
  });

  const videos = useMemo(
    () => (data?.items ?? []).filter((item) => item.source === "program"),
    [data?.items],
  );

  const exerciseGroups = useMemo(
    () => groupFormCheckInboxItems(videos),
    [videos],
  );

  const pendingTargets = useMemo(
    () => pendingTargetsForVideos(videos),
    [videos],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["form-check-inbox"] });
    void queryClient.invalidateQueries({
      queryKey: ["form-check-inbox-athletes"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["form-check-pending-count"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["form-check-inbox-pending-user", userId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["admin-user-purchases", userId],
    });
  };

  const handleBulkApply = async (comment: string) => {
    const result = await bulkUpsertFormCheckComments(pendingTargets, comment);
    if (result.succeeded > 0) invalidate();
    return result;
  };

  return (
    <div>
      {showBilling && (
        <FormCheckBillingControls
          userId={userId}
          purchases={purchases}
          onUpdated={onBillingUpdated}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Video className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Form-check review
        </h2>
        {data ? (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {videos.length}
            {reviewFilter === "all" && pendingTargets.length > 0
              ? ` · ${pendingTargets.length} pending`
              : ""}
          </span>
        ) : null}
        <div className="ml-auto">
          <Select
            className="h-8 w-36 text-xs"
            options={[
              { value: "pending", label: "Needs review" },
              { value: "all", label: "All videos" },
            ]}
            value={reviewFilter}
            onValueChange={(v) => setReviewFilter(v as ReviewFilter)}
          />
        </div>
      </div>

      {formCheckQuota?.weeklyLimit != null ? (
        <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
          Form checks this 4-week block ({formCheckQuota.weekStart}):{" "}
          <span className="font-semibold">
            {formCheckQuota.usedThisWeek}/{formCheckQuota.weeklyLimit}
          </span>{" "}
          program weeks reviewed
          {formCheckQuota.remainingThisWeek != null &&
          formCheckQuota.remainingThisWeek > 0
            ? ` · ${formCheckQuota.remainingThisWeek} remaining`
            : formCheckQuota.remainingThisWeek === 0
              ? " · limit reached"
              : ""}
          {formCheckQuota.formCheckWeekAllowed === false
            ? ` · Not a form-check week (sub week ${formCheckQuota.subscriptionWeek ?? "?"})`
            : formCheckQuota.formCheckWeekAllowed === true &&
                formCheckQuota.subscriptionWeek != null
              ? ` · Form-check week (sub week ${formCheckQuota.subscriptionWeek})`
              : ""}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
          {reviewFilter === "pending"
            ? "No program form-check videos waiting for review."
            : "No program form-check videos uploaded yet."}
        </div>
      ) : (
        <FormCheckInboxExerciseList
          listKey={`${userId}-${reviewFilter}`}
          exerciseGroups={exerciseGroups}
          pendingCount={pendingTargets.length}
          onBulkApply={handleBulkApply}
        />
      )}
    </div>
  );
}
