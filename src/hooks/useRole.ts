import { useAuth } from "./useAuth";

export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return user?.role === "ADMIN";
}

export function useIsAssistantCoach(): boolean {
  const { user } = useAuth();
  return user?.role === "ASSISTANT_COACH";
}

export function useIsStaff(): boolean {
  const { user } = useAuth();
  return user?.role === "ADMIN" || user?.role === "ASSISTANT_COACH";
}
