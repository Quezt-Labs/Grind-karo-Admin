import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PlansPage } from "@/pages/PlansPage";
import { PlanDetailPage } from "@/pages/PlanDetailPage";
import { AddonsPage } from "@/pages/AddonsPage";
import { SubscriptionsPage } from "@/pages/EnrollmentsPage";
import { ReviewsPage } from "@/pages/ReviewsPage";
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
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/plans/:id" element={<PlanDetailPage />} />
              <Route path="/addons" element={<AddonsPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
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
