import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Purchase } from "@/types/user";
import {
  resolveUserActivityScope,
  type UserActivityScope,
} from "@/utils/userActivityScope";

export function useUserActivityScope(purchases: Purchase[]): {
  scope: UserActivityScope;
  subscriptionIdParam: string | null;
  clearScope: () => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();
  const subscriptionIdParam = searchParams.get("subscriptionId");
  const planIdParam = searchParams.get("planId");

  const scope = useMemo(
    () => resolveUserActivityScope(purchases, subscriptionIdParam, planIdParam),
    [purchases, subscriptionIdParam, planIdParam],
  );

  const clearScope = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("subscriptionId");
        next.delete("planId");
        return next;
      },
      { replace: true },
    );
  };

  return { scope, subscriptionIdParam, clearScope };
}
