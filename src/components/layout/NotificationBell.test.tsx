import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useNotificationStore } from "@/store/notificationStore";
import type { AdminNotification, NotificationListResponse } from "@/types/user";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getUnreadCount: vi.fn(),
  getAll: vi.fn(),
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  getWorkoutThread: vi.fn(),
  getSheetsThread: vi.fn(),
  replyThread: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "ADMIN" } }),
}));

vi.mock("@/services/notificationService", () => ({
  notificationService: {
    getUnreadCount: mocks.getUnreadCount,
    getAll: mocks.getAll,
    markRead: mocks.markRead,
    markAllRead: mocks.markAllRead,
  },
}));

vi.mock("@/services/workoutVideoCommentService", () => ({
  workoutVideoCommentService: {
    getWorkoutThread: mocks.getWorkoutThread,
    getSheetsThread: mocks.getSheetsThread,
    replyThread: mocks.replyThread,
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/shared/FormCheckVideoPlayer", () => ({
  FormCheckVideoPlayer: ({ src }: { src: string }) => (
    <div data-testid="form-check-video-player">{src}</div>
  ),
}));

function makeFormCheckNotification(
  overrides: Partial<AdminNotification> = {},
): AdminNotification {
  return {
    id: "notif-1",
    type: "FORM_CHECK_ATHLETE_REPLY",
    title: "Form check reply",
    message: "Short preview",
    createdAt: "2026-08-10T00:00:00.000Z",
    readAt: null,
    category: "form_check",
    priority: "critical",
    payload: {
      userId: "user-1",
      athleteName: "Rahul",
      videoId: "video-1",
      commentId: "comment-1",
      threadType: "workout",
      exerciseName: "Bench Press",
      setNumber: 2,
      state: "needs_reply",
      preview: "Preview text from notification payload",
      fullMessage:
        "Full athlete message with full context that should be readable in the modal.",
      videoUrl: "https://cdn.example.com/video-1.mp4",
    },
    ...overrides,
  };
}

function makeUnreadResponse(
  notification: AdminNotification,
): NotificationListResponse {
  return {
    total: 1,
    unreadCount: 1,
    limit: 20,
    offset: 0,
    items: [notification],
  };
}

function renderBell() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <NotificationBell />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

async function openPanel(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTitle("Notifications"));
  await screen.findByText("Action required · Form check");
}

describe("NotificationBell form-check modal flow", () => {
  beforeEach(() => {
    useNotificationStore.getState().reset();
    mocks.navigate.mockReset();
    mocks.getUnreadCount.mockReset();
    mocks.getAll.mockReset();
    mocks.markRead.mockReset();
    mocks.markAllRead.mockReset();
    mocks.getWorkoutThread.mockReset();
    mocks.getSheetsThread.mockReset();
    mocks.replyThread.mockReset();

    const notification = makeFormCheckNotification();
    mocks.getUnreadCount.mockResolvedValue(1);
    mocks.getAll.mockResolvedValue(makeUnreadResponse(notification));
    mocks.markRead.mockResolvedValue(notification);
    mocks.markAllRead.mockResolvedValue({ markedRead: 1 });
    mocks.replyThread.mockResolvedValue({});
    mocks.getWorkoutThread.mockResolvedValue({
      messages: [
        {
          id: "m1",
          role: "athlete",
          message: "Athlete thread message",
          createdAt: "2026-08-10T00:00:00.000Z",
        },
      ],
      replyLimit: 3,
      repliesUsed: 1,
      repliesRemaining: 2,
      canAthleteReply: true,
      replyLockReason: null,
    });
    mocks.getSheetsThread.mockResolvedValue({
      messages: [],
      replyLimit: null,
      repliesUsed: null,
      repliesRemaining: null,
      canAthleteReply: null,
      replyLockReason: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("opens a modal when a form-check notification card body is clicked", async () => {
    const user = userEvent.setup();
    renderBell();
    await openPanel(user);

    await user.click(screen.getByText("Preview text from notification payload"));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Full athlete message with full context that should be readable in the modal.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Athlete thread message")).toBeInTheDocument();
  });

  it("keeps Open thread and Quick reply buttons functional without accidental modal open", async () => {
    const user = userEvent.setup();
    renderBell();
    await openPanel(user);

    await user.click(screen.getByRole("button", { name: "Quick reply" }));
    expect(screen.getByPlaceholderText("Reply to athlete…")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open thread" }));
    expect(mocks.navigate).toHaveBeenCalledTimes(1);
    const firstNavigation = (mocks.navigate as Mock).mock.calls[0]?.[0] as string;
    expect(firstNavigation).toContain("/form-checks?");
    expect(firstNavigation).toContain("commentId=comment-1");
  });

  it("shows fallback state in modal when thread context cannot be fetched", async () => {
    const user = userEvent.setup();
    mocks.getWorkoutThread.mockRejectedValueOnce(new Error("timeout"));
    renderBell();
    await openPanel(user);

    await user.click(screen.getByText("Preview text from notification payload"));

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => {
      expect(
        within(dialog).getByText(/Unable to load full thread context/i),
      ).toBeInTheDocument();
    });
    expect(
      within(dialog).getByRole("button", { name: "Open thread" }),
    ).toBeInTheDocument();
  });
});
