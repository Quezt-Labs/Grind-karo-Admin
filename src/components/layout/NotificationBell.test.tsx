import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
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
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
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
      athleteId: "athlete-user-1",
      athleteName: "Rahul",
      videoId: "video-1",
      commentId: "comment-1",
      threadType: "workout",
      preview: "Preview text from notification payload",
    },
    ...overrides,
  };
}

function makeChatNotification(): AdminNotification {
  return {
    id: "notif-chat-1",
    type: "CHAT_MESSAGE",
    title: "New message",
    message: "Hey coach",
    createdAt: "2026-08-09T00:00:00.000Z",
    readAt: null,
    category: "chat",
    priority: "normal",
    payload: {
      userId: "user-chat-1",
    },
  };
}

function makeUnreadResponse(
  items: AdminNotification[],
): NotificationListResponse {
  return {
    total: items.length,
    unreadCount: items.length,
    limit: 20,
    offset: 0,
    items,
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
  await screen.findByText("Notifications");
}

describe("NotificationBell", () => {
  beforeEach(() => {
    useNotificationStore.getState().reset();
    mocks.navigate.mockReset();
    mocks.getUnreadCount.mockReset();
    mocks.getAll.mockReset();
    mocks.markRead.mockReset();
    mocks.markAllRead.mockReset();

    mocks.getUnreadCount.mockResolvedValue(1);
    mocks.markRead.mockResolvedValue(makeFormCheckNotification());
    mocks.markAllRead.mockResolvedValue({ markedRead: 1 });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("renders grouped form-check rows in the unread list", async () => {
    const user = userEvent.setup();
    const notification = makeFormCheckNotification();
    mocks.getAll.mockResolvedValue(makeUnreadResponse([notification]));

    renderBell();
    await openPanel(user);

    expect(screen.getByText("Rahul")).toBeInTheDocument();
    expect(
      screen.getByText("Preview text from notification payload"),
    ).toBeInTheDocument();
    expect(screen.getByText("Form check")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("navigates to form-check thread route when a form-check row is clicked", async () => {
    const user = userEvent.setup();
    const notification = makeFormCheckNotification();
    mocks.getAll.mockResolvedValue(makeUnreadResponse([notification]));

    renderBell();
    await openPanel(user);

    await user.click(screen.getByText("Rahul"));

    expect(mocks.markRead).toHaveBeenCalledWith("notif-1");
    expect(mocks.navigate).toHaveBeenCalledTimes(1);
    const navigation = (mocks.navigate as Mock).mock.calls[0]?.[0] as string;
    expect(navigation).toContain("/form-checks?");
    expect(navigation).toContain("userId=athlete-user-1");
    expect(navigation).toContain("commentId=comment-1");
  });

  it("groups multiple form-check notifications into one row", async () => {
    const user = userEvent.setup();
    const first = makeFormCheckNotification({ id: "notif-1" });
    const second = makeFormCheckNotification({
      id: "notif-2",
      createdAt: "2026-08-11T00:00:00.000Z",
      message: "Another update",
      payload: {
        ...first.payload,
        preview: "Second preview",
      },
    });
    mocks.getAll.mockResolvedValue(makeUnreadResponse([first, second]));

    renderBell();
    await openPanel(user);

    expect(screen.getByText(/2 updates · Second preview/)).toBeInTheDocument();
    expect(screen.getAllByText("Rahul")).toHaveLength(1);
  });

  it("filters notifications with All, Form checks, and Other chips", async () => {
    const user = userEvent.setup();
    const formCheck = makeFormCheckNotification();
    const chat = makeChatNotification();
    mocks.getAll.mockResolvedValue(makeUnreadResponse([formCheck, chat]));

    renderBell();
    await openPanel(user);

    expect(screen.getByRole("button", { name: "All (2)" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Form checks (1)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Other (1)" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Other (1)" }));
    expect(screen.getByText("New message")).toBeInTheDocument();
    expect(screen.queryByText("Rahul")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Form checks (1)" }));
    expect(screen.getByText("Rahul")).toBeInTheDocument();
    expect(screen.queryByText("New message")).not.toBeInTheDocument();
  });

  it("navigates to chat when a chat notification is clicked", async () => {
    const user = userEvent.setup();
    const chat = makeChatNotification();
    mocks.getAll.mockResolvedValue(makeUnreadResponse([chat]));

    renderBell();
    await openPanel(user);

    await user.click(screen.getByText("New message"));

    expect(mocks.markRead).toHaveBeenCalledWith("notif-chat-1");
    expect(mocks.navigate).toHaveBeenCalledWith("/chat?userId=user-chat-1");
  });

  it("marks all notifications as read from the panel header", async () => {
    const user = userEvent.setup();
    mocks.getAll.mockResolvedValue(
      makeUnreadResponse([makeFormCheckNotification()]),
    );

    renderBell();
    await openPanel(user);

    await user.click(screen.getByRole("button", { name: "Mark all read" }));

    expect(mocks.markAllRead).toHaveBeenCalledTimes(1);
  });
});
