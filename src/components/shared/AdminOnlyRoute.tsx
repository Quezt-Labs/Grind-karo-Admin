import { Navigate, Outlet } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useRole";

export function AdminOnlyRoute() {
  const isAdmin = useIsAdmin();
  if (!isAdmin) {
    return <Navigate to="/coach/athletes" replace />;
  }
  return <Outlet />;
}
