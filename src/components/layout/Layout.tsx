import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

export function Layout() {
  return (
    <div className="flex h-dvh max-h-dvh w-full min-h-0 overflow-hidden">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="admin-page-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
