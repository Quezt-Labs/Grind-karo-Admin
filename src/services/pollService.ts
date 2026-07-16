import api from "./api";
import type { CreatePollPayload, Poll, UpdatePollPayload } from "@/types/poll";

export const pollService = {
  async getAll(): Promise<Poll[]> {
    const { data } = await api.get("/admin/polls");
    return data.data ?? data;
  },

  async getById(id: string): Promise<Poll> {
    const { data } = await api.get(`/admin/polls/${id}`);
    return data.data ?? data;
  },

  async create(payload: CreatePollPayload): Promise<Poll> {
    const { data } = await api.post("/admin/polls", payload);
    return data.data ?? data;
  },

  async update(id: string, payload: UpdatePollPayload): Promise<Poll> {
    const { data } = await api.patch(`/admin/polls/${id}`, payload);
    return data.data ?? data;
  },

  async open(id: string): Promise<Poll> {
    const { data } = await api.post(`/admin/polls/${id}/open`);
    return data.data ?? data;
  },

  async close(id: string): Promise<Poll> {
    const { data } = await api.post(`/admin/polls/${id}/close`);
    return data.data ?? data;
  },

  async resolve(id: string, winningOptionId: string): Promise<Poll> {
    const { data } = await api.post(`/admin/polls/${id}/resolve`, {
      winningOptionId,
    });
    return data.data ?? data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/polls/${id}`);
  },
};
