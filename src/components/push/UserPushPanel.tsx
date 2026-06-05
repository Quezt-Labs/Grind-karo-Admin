import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, BellOff, Loader2, Send } from "lucide-react";
import toast from "react-hot-toast";
import { pushService } from "@/services/pushService";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

function formatReminderHour(h: number, minute: number) {
  const suffix = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const mm = minute > 0 ? `:${minute.toString().padStart(2, "0")}` : "";
  return `${hour12}${mm} ${suffix}`;
}

type UserPushPanelProps = {
  userId: string;
  compact?: boolean;
};

export function UserPushPanel({ userId, compact }: UserPushPanelProps) {
  const [testBody, setTestBody] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-push-status", userId],
    queryFn: () => pushService.getUserStatus(userId),
    enabled: !!userId,
  });

  const testMutation = useMutation({
    mutationFn: () =>
      pushService.sendTest(userId, testBody.trim() || undefined),
    onSuccess: (res) => {
      if (res.sent === 0) {
        toast.error(
          "No devices received the push. Client may not have enabled notifications.",
        );
      } else {
        toast.success(`Test push sent to ${res.sent} device(s)`);
      }
      void refetch();
    },
    onError: () => {
      toast.error("Failed to send test push");
    },
  });

  if (isLoading) {
    return (
      <div className={cn("flex justify-center py-6", compact && "py-3")}>
        <Spinner />
      </div>
    );
  }

  if (!data) return null;

  const subscribed = data.deviceCount > 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800",
        compact ? "p-3" : "p-5",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            subscribed
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
          )}
        >
          {subscribed ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "font-semibold text-gray-900 dark:text-white",
              compact ? "text-sm" : "text-base",
            )}
          >
            App push notifications
          </h3>
          {!data.pushConfigured ? (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Server VAPID keys not configured — pushes will not deliver until
              ops adds them.
            </p>
          ) : subscribed ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {data.deviceCount} device{data.deviceCount !== 1 ? "s" : ""}{" "}
              subscribed
              {data.lastSubscribedAt
                ? ` · last active ${new Date(data.lastSubscribedAt).toLocaleDateString("en-IN")}`
                : ""}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Not enabled on the client app. They must turn on notifications in
              Profile on their phone.
            </p>
          )}
        </div>
      </div>

      {!compact && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Coach chat</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {data.chatNotificationsEnabled ? "On" : "Off"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Weekly summary</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {data.weeklySummaryEnabled ? "On" : "Off"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">
              Workout reminder
            </dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {data.workoutRemindersEnabled ? "On" : "Off"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Reminder time</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {formatReminderHour(data.reminderHour, data.reminderMinute)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Timezone</dt>
            <dd className="font-medium text-gray-900 dark:text-white truncate">
              {data.timezone}
            </dd>
          </div>
        </dl>
      )}

      {data.pushConfigured && (
        <div
          className={cn(
            "mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 dark:border-gray-700",
            compact && "mt-3 pt-3",
          )}
        >
          <input
            type="text"
            value={testBody}
            onChange={(e) => setTestBody(e.target.value)}
            placeholder="Optional test message…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
          <Button
            type="button"
            variant="secondary"
            className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
            disabled={testMutation.isPending || !subscribed}
            onClick={() => testMutation.mutate()}
          >
            {testMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send test push
          </Button>
          {!subscribed && (
            <p className="text-[11px] text-gray-400">
              Ask the athlete to open the GrindKaro app → Profile → Enable
              notifications.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
