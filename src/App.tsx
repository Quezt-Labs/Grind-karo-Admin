import { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PageLoader } from "@/components/shared/PageLoader";
import { LoginPage } from "@/pages/LoginPage";
import {
  AddonsPage,
  ChatPage,
  ContactSubmissionsPage,
  CouponDetailPage,
  CouponsPage,
  DashboardPage,
  ExercisesPage,
  LandingPageDetailPage,
  LandingPagesPage,
  NotFoundPage,
  PlanDetailPage,
  PlansPage,
  ProgramAddonsPage,
  ProgramBooksPage,
  ProgramDetailPage,
  ProgramPurchasesPage,
  ProgramReviewsPage,
  ProgramsPage,
  ReviewsPage,
  SubscriptionsPage,
  TestingPage,
  UserDetailPage,
  UsersPage,
} from "@/routes/lazyPages";

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/testing" element={<TestingPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/plans" element={<PlansPage />} />
                <Route path="/plans/:id" element={<PlanDetailPage />} />
                <Route path="/addons" element={<AddonsPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/users/:id" element={<UserDetailPage />} />
                <Route path="/reviews" element={<ReviewsPage />} />
                <Route path="/programs" element={<ProgramsPage />} />
                <Route path="/program-addons" element={<ProgramAddonsPage />} />
                <Route path="/programs/:id" element={<ProgramDetailPage />} />
                <Route path="/program-books" element={<ProgramBooksPage />} />
                <Route path="/exercises" element={<ExercisesPage />} />
                <Route
                  path="/program-purchases"
                  element={<ProgramPurchasesPage />}
                />
                <Route
                  path="/program-reviews"
                  element={<ProgramReviewsPage />}
                />
                <Route path="/landing-pages" element={<LandingPagesPage />} />
                <Route
                  path="/landing-pages/:id"
                  element={<LandingPageDetailPage />}
                />
                <Route path="/contact" element={<ContactSubmissionsPage />} />
                <Route path="/coupons" element={<CouponsPage />} />
                <Route path="/coupons/:id" element={<CouponDetailPage />} />
                <Route path="/chat" element={<ChatPage />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
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
