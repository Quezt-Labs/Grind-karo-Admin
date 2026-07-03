import { Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { AdminOnlyRoute } from "@/components/shared/AdminOnlyRoute";
import { StaffRoute } from "@/components/shared/StaffRoute";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { PageLoader } from "@/components/shared/PageLoader";
import { LoginPage } from "@/pages/LoginPage";
import { useAuth } from "@/hooks/useAuth";
import {
  AddonsPage,
  AssistantCoachesPage,
  CoachAthleteDetailPage,
  CoachAthletesPage,
  CoachAthletesLocationPage,
  FormCheckInboxPage,
  ChatPage,
  ContactSubmissionsPage,
  ClientErrorsPage,
  UploadFailuresPage,
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
  ProgramEditorPage,
  ProgramPurchasesPage,
  ProgramReviewsPage,
  ProgramsPage,
  ProgramTemplatesPage,
  ReviewsPage,
  SubscriptionsPage,
  TestingPage,
  UserDetailPage,
  UsersPage,
  BigLiftPrPage,
  AnnouncementsPage,
  VideoLibraryPage,
} from "@/routes/lazyPages";

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === "ASSISTANT_COACH") {
    return <Navigate to="/coach/athletes" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

function LegacyCoachingEditorRedirect() {
  const { userId } = useParams<{ userId: string }>();
  if (!userId) return <Navigate to="/users" replace />;
  return <Navigate to={`/coaching/${userId}/editor`} replace />;
}

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
                <Route path="/coach/athletes" element={<CoachAthletesPage />} />
                <Route
                  path="/coach/locations"
                  element={<CoachAthletesLocationPage />}
                />
                <Route
                  path="/coach/athletes/:id"
                  element={<CoachAthleteDetailPage />}
                />
                <Route path="/form-checks" element={<FormCheckInboxPage />} />
                <Route path="/chat" element={<ChatPage />} />

                {/* Retail template editor vs per-athlete coaching editor */}
                <Route
                  path="/programs/:programKey/editor"
                  element={<ProgramEditorPage />}
                />
                <Route
                  path="/coaching/:userId/editor"
                  element={<ProgramEditorPage />}
                />
                <Route
                  path="/users/:userId/program/editor"
                  element={<LegacyCoachingEditorRedirect />}
                />

                <Route element={<StaffRoute />}>
                  <Route path="/programs" element={<ProgramsPage />} />
                  <Route
                    path="/program-templates"
                    element={<ProgramTemplatesPage />}
                  />
                  <Route path="/programs/:id" element={<ProgramDetailPage />} />
                  <Route path="/exercises" element={<ExercisesPage />} />
                  <Route path="/plans" element={<PlansPage />} />
                  <Route path="/plans/:id" element={<PlanDetailPage />} />
                </Route>

                <Route element={<AdminOnlyRoute />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/addons" element={<AddonsPage />} />
                  <Route
                    path="/subscriptions"
                    element={<SubscriptionsPage />}
                  />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/users/:id" element={<UserDetailPage />} />
                  <Route
                    path="/assistant-coaches"
                    element={<AssistantCoachesPage />}
                  />
                  <Route path="/reviews" element={<ReviewsPage />} />
                  <Route
                    path="/program-addons"
                    element={<ProgramAddonsPage />}
                  />
                  <Route path="/program-books" element={<ProgramBooksPage />} />
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
                  <Route path="/client-errors" element={<ClientErrorsPage />} />
                  <Route
                    path="/upload-failures"
                    element={<UploadFailuresPage />}
                  />
                  <Route path="/coupons" element={<CouponsPage />} />
                  <Route path="/coupons/:id" element={<CouponDetailPage />} />
                  <Route path="/big-lift-pr" element={<BigLiftPrPage />} />
                  <Route
                    path="/announcements"
                    element={<AnnouncementsPage />}
                  />
                  <Route path="/video-library" element={<VideoLibraryPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          className: "text-sm !border !border-[var(--toast-border)]",
          style: {
            background: "var(--toast-bg)",
            color: "var(--toast-color)",
          },
        }}
      />
    </ErrorBoundary>
  );
}
