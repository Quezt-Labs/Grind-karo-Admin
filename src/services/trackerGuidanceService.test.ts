import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import api from "./api";
import { trackerGuidanceService } from "./trackerGuidanceService";

vi.mock("./api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  post: Mock;
  patch: Mock;
};

describe("trackerGuidanceService payload mapping", () => {
  beforeEach(() => {
    mockedApi.post.mockReset();
    mockedApi.patch.mockReset();
  });

  it("maps create payload to canonical guidance fields", async () => {
    mockedApi.post.mockResolvedValueOnce({
      status: 201,
      data: {
        data: {
          id: "guidance-1",
          userId: "user-1",
          type: "NUTRITION",
          content: "Eat protein with each meal.",
          title: "Daily targets",
          order: 6,
        },
      },
    });

    const result = await trackerGuidanceService.create("user-1", {
      kind: "nutrition",
      title: "Daily targets",
      body: "Eat protein with each meal.",
      sortOrder: 6,
      programId: "program-1",
    });

    expect(mockedApi.post).toHaveBeenCalledWith(
      "/admin/trackers/user-1/guidance",
      {
        type: "NUTRITION",
        title: "Daily targets",
        content: "Eat protein with each meal.",
        order: 6,
        programId: "program-1",
      },
      expect.objectContaining({
        validateStatus: expect.any(Function),
      }),
    );
    expect(result.kind).toBe("nutrition");
    expect(result.body).toBe("Eat protein with each meal.");
    expect(result.sortOrder).toBe(6);
  });

  it("maps update payload to canonical guidance fields", async () => {
    mockedApi.patch.mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          id: "guidance-2",
          userId: "user-1",
          type: "WARMUP",
          content: "Bar x 10, 40% x 5, 60% x 3.",
          title: "Bench prep",
          order: 3,
        },
      },
    });

    await trackerGuidanceService.update("user-1", "guidance-2", {
      kind: "warmup",
      title: "Bench prep",
      body: "Bar x 10, 40% x 5, 60% x 3.",
      sortOrder: 3,
      programId: "program-2",
    });

    expect(mockedApi.patch).toHaveBeenCalledWith(
      "/admin/trackers/user-1/guidance/guidance-2",
      {
        type: "WARMUP",
        title: "Bench prep",
        content: "Bar x 10, 40% x 5, 60% x 3.",
        order: 3,
        programId: "program-2",
      },
      expect.objectContaining({
        validateStatus: expect.any(Function),
      }),
    );
  });

  it("falls back to legacy payload when canonical create shape is rejected", async () => {
    mockedApi.post
      .mockResolvedValueOnce({
        status: 422,
        data: { message: "type/order not accepted in current rollout slice" },
      })
      .mockResolvedValueOnce({
        status: 201,
        data: {
          data: {
            id: "guidance-3",
            userId: "user-1",
            kind: "nutrition",
            body: "Hydrate before training.",
            sortOrder: 1,
          },
        },
      });

    await trackerGuidanceService.create("user-1", {
      kind: "nutrition",
      title: "Hydration",
      body: "Hydrate before training.",
      sortOrder: 1,
    });

    expect(mockedApi.post).toHaveBeenCalledTimes(2);
    expect((mockedApi.post as Mock).mock.calls[0]?.[1]).toEqual({
      type: "NUTRITION",
      title: "Hydration",
      content: "Hydrate before training.",
      order: 1,
    });
    expect((mockedApi.post as Mock).mock.calls[1]?.[1]).toEqual({
      kind: "nutrition",
      title: "Hydration",
      body: "Hydrate before training.",
      sortOrder: 1,
    });
  });
});
