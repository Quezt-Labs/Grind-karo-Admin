import { Navigate, Outlet } from "react-router-dom";
import { useIsStaff } from "@/hooks/useRole";

/** Routes available to admin and assistant coach (program authoring, etc.). */
export function StaffRoute() {
  const isStaff = useIsStaff();
  if (!isStaff) {
    return <Navigate to="/coach/athletes" replace />;
  }
  return <Outlet />;
}
