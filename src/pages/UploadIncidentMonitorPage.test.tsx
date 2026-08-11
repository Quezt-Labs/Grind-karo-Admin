import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UploadIncidentMonitorPage } from "@/pages/UploadIncidentMonitorPage";
import type { UploadIncidentListResponse } from "@/services/uploadIncidentService";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  list: vi.fn(),
  bulkRetry: vi.fn(),
  bulkAcknowledge: vi.fn(),
  bulkEscalate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
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

vi.mock("@/hooks/useRole", () => ({
  useIsAdmin: () => true,
}));

vi.mock("@/components/shared/DebouncedSearch", () => ({
  DebouncedSearch: ({
    onSearch,
    placeholder,
    className,
  }: {
    onSearch: (value: string) => void;
    placeholder: string;
    className?: string;
  }) => (
    <input
      aria-label="incident-search"
      placeholder={placeholder}
      className={className}
      onChange={(event) => onSearch(event.target.value)}
    />
  ),
}));

vi.mock("@/services/uploadIncidentService", () => ({
  uploadIncidentService: {
    list: mocks.list,
    bulkRetry: mocks.bulkRetry,
    bulkAcknowledge: mocks.bulkAcknowledge,
    bulkEscalate: mocks.bulkEscalate,
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

function makeResponse(overrides: Partial<UploadIncidentListResponse> = {}): UploadIncidentListResponse {
  return {
    total: 1,
    limit: 100,
    offset: 0,
    hasChanges: null,
    isDelta: false,
    since: "2026-08-11T00:00:00.000Z",
    nextCursor: null,
    hasMore: null,
    removedIds: [],
    stateCounts: {
      failed: 1,
      stuck: 0,
      retrying: 0,
      resolved: 0,
      unknown: 0,
    },
    items: [
      {
        id: "incident-1",
        athleteId: "athlete-1",
        athleteName: "Rahul",
        athleteEmail: "rahul@example.com",
        fileName: "set-1.mp4",
        sizeBytes: 1050000,
        state: "failed",
        severity: "hard_failed",
        retryable: false,
        attempts: 3,
        pipelineStage: "associate",
        failureReason: "Association failed",
        correlationId: "corr-123",
        uploadSessionId: "session-10",
        firstFailedAt: "2026-08-11T00:00:00.000Z",
        lastRetryAt: null,
        nextRetryAt: null,
        stuckDurationSeconds: 3600,
        lastCheckpointAt: "2026-08-11T00:10:00.000Z",
        latestActivityAt: "2026-08-11T00:15:00.000Z",
        videoId: "video-1",
        commentId: "comment-1",
        messageId: "message-1",
        threadType: "workout",
        queueBlocked: true,
        queueHint: "Queue blocked while upload unresolved",
        groupedCount: 1,
      },
    ],
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <UploadIncidentMonitorPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("UploadIncidentMonitorPage", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.list.mockReset();
    mocks.bulkRetry.mockReset();
    mocks.bulkAcknowledge.mockReset();
    mocks.bulkEscalate.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.list.mockResolvedValue(makeResponse());
    mocks.bulkRetry.mockResolvedValue({ accepted: true, processedCount: 1 });
    mocks.bulkAcknowledge.mockResolvedValue({ accepted: true, processedCount: 1 });
    mocks.bulkEscalate.mockResolvedValue({ accepted: true, processedCount: 1 });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders actionable table columns with extended diagnostics", async () => {
    renderPage();

    expect(await screen.findByText("Upload Incident Monitor")).toBeInTheDocument();
    expect(await screen.findByText("Rahul")).toBeInTheDocument();
    expect(screen.getByText("Table view")).toBeInTheDocument();
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("Attempts")).toBeInTheDocument();
    expect(screen.getByText("First seen")).toBeInTheDocument();
    expect(screen.getByText("Last activity")).toBeInTheDocument();
    expect(screen.getByText("Retryable")).toBeInTheDocument();
    expect(screen.getByText("Correlation ID")).toBeInTheDocument();
    expect(screen.getByText("Athlete / Context")).toBeInTheDocument();
    expect(screen.getByText("Queue impact")).toBeInTheDocument();
    expect(screen.getByText("Hard failed")).toBeInTheDocument();
    expect(screen.getByText("Queue blocked")).toBeInTheDocument();
  });

  it("handles bulk selection and triggers retry hook", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Rahul");
    await user.click(screen.getByLabelText("Select incident incident-1"));
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry selected" }));
    await waitFor(() => {
      expect(mocks.bulkRetry).toHaveBeenCalledWith(["incident-1"]);
    });
  });

  it("shows busy retry banner when server is busy", async () => {
    const busyError = Object.assign(new Error("busy"), {
      busy: true,
      status: 503,
    });
    mocks.list.mockRejectedValueOnce(busyError);
    renderPage();

    expect(
      await screen.findByText(/Server busy, retrying automatically/i),
    ).toBeInTheDocument();
  });
});
