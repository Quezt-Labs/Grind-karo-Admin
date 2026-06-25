import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { INDIAN_STATES_AND_UTS } from "@/lib/indianStates";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { userService } from "@/services/userService";
import type { UserInfo } from "@/types/user";

type Props = {
  userId: string;
  intake: UserInfo;
};

export function AthleteLocationEditor({ userId, intake }: Props) {
  const queryClient = useQueryClient();
  const [state, setState] = useState(intake.state ?? "");
  const [city, setCity] = useState(intake.city ?? "");
  const stateMissing = !intake.state?.trim();

  const [prevIntake, setPrevIntake] = useState({
    state: intake.state,
    city: intake.city,
  });
  if (intake.state !== prevIntake.state || intake.city !== prevIntake.city) {
    setPrevIntake({ state: intake.state, city: intake.city });
    setState(intake.state ?? "");
    setCity(intake.city ?? "");
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      userService.patchUserLocation(userId, {
        state: state.trim(),
        city: city.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Location updated");
      void queryClient.invalidateQueries({
        queryKey: ["admin-user-info", userId],
      });
      void queryClient.invalidateQueries({ queryKey: ["athlete-locations"] });
    },
    onError: () => toast.error("Failed to update location"),
  });

  const canSave = Boolean(state.trim()) && !saveMutation.isPending;

  return (
    <div
      className={
        stateMissing
          ? "rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20"
          : "rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/30"
      }
    >
      <div className="mb-3 flex items-start gap-2">
        <MapPin
          className={
            stateMissing
              ? "mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300"
              : "mt-0.5 h-4 w-4 shrink-0 text-indigo-500"
          }
        />
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {stateMissing ? "State missing — update location" : "Edit location"}
          </p>
          {stateMissing ? (
            <p className="mt-0.5 text-xs text-amber-900/90 dark:text-amber-200/90">
              This athlete submitted intake before state was required. Set their
              state so they appear correctly on the coach locations map.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              State is a dropdown; city stays free text.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          id="athlete-state"
          label="State"
          options={[
            { value: "", label: "Select state" },
            ...INDIAN_STATES_AND_UTS.map((item) => ({
              value: item,
              label: item,
            })),
          ]}
          value={state}
          onValueChange={setState}
        />
        <Input
          id="athlete-city"
          label="City"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Pune"
        />
      </div>

      <button
        type="button"
        disabled={!canSave}
        onClick={() => saveMutation.mutate()}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {saveMutation.isPending && (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        )}
        Save location
      </button>
    </div>
  );
}
