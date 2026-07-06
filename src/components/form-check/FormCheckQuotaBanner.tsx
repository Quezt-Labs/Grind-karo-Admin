import type { FormCheckQuota } from "@/types/user";

export function FormCheckQuotaBanner({ quota }: { quota: FormCheckQuota }) {
  if (quota.weeklyLimit == null) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
      Form checks this 4-week block ({quota.weekStart}):{" "}
      <span className="font-semibold">
        {quota.usedThisWeek}/{quota.weeklyLimit}
      </span>{" "}
      program weeks reviewed
      {quota.remainingThisWeek != null && quota.remainingThisWeek > 0
        ? ` · ${quota.remainingThisWeek} remaining`
        : quota.remainingThisWeek === 0
          ? " · limit reached"
          : ""}
      {quota.formCheckWeekAllowed === false
        ? ` · Not a form-check week (sub week ${quota.subscriptionWeek ?? "?"})`
        : quota.formCheckWeekAllowed === true && quota.subscriptionWeek != null
          ? ` · Form-check week (sub week ${quota.subscriptionWeek})`
          : ""}
    </div>
  );
}
