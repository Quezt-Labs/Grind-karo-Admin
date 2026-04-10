import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* Placeholder routes */}
              <Route
                path="/users"
                element={
                  <div className="text-gray-500 dark:text-gray-400">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Users
                    </h1>
                    <p className="mt-1 text-sm">
                      Users management page — coming soon.
                    </p>
                  </div>
                }
              />
              <Route
                path="/settings"
                element={
                  <div className="text-gray-500 dark:text-gray-400">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Settings
                    </h1>
                    <p className="mt-1 text-sm">Settings page — coming soon.</p>
                  </div>
                }
              />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          className: "text-sm",
          style: {
            background: "var(--toast-bg, #fff)",
            color: "var(--toast-color, #1f2937)",
          },
        }}
      />
    </ErrorBoundary>
  );
}
