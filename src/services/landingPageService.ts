import api from "./api";
import type {
  LandingPageConfig,
  LandingPageConfigWithItems,
  CreateLandingPagePayload,
  UpdateLandingPagePayload,
  CarouselItem,
  CreateCarouselItemPayload,
  UpdateCarouselItemPayload,
} from "@/types/landingPage";

export const landingPageService = {
  /* ── Configurations ── */

  async getAll(): Promise<LandingPageConfig[]> {
    const { data } = await api.get("/admin/landing-page");
    return data.data ?? data;
  },

  async getById(id: string): Promise<LandingPageConfigWithItems> {
    const { data } = await api.get(`/admin/landing-page/${id}`);
    return data.data ?? data;
  },

  async create(payload: CreateLandingPagePayload): Promise<LandingPageConfig> {
    const { data } = await api.post("/admin/landing-page", payload);
    return data.data ?? data;
  },

  async update(
    id: string,
    payload: UpdateLandingPagePayload,
  ): Promise<LandingPageConfig> {
    const { data } = await api.patch(`/admin/landing-page/${id}`, payload);
    return data.data ?? data;
  },

  async activate(id: string): Promise<LandingPageConfig> {
    const { data } = await api.post(`/admin/landing-page/${id}/activate`);
    return data.data ?? data;
  },

  async deactivate(id: string): Promise<LandingPageConfig> {
    const { data } = await api.post(`/admin/landing-page/${id}/deactivate`);
    return data.data ?? data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/landing-page/${id}`);
  },

  /* ── Carousel items ── */

  async getCarouselItems(configId: string): Promise<CarouselItem[]> {
    const { data } = await api.get(
      `/admin/landing-page/${configId}/carousel-items`,
    );
    return data.data ?? data;
  },

  async createCarouselItem(
    configId: string,
    payload: CreateCarouselItemPayload,
  ): Promise<CarouselItem> {
    const { data } = await api.post(
      `/admin/landing-page/${configId}/carousel-items`,
      payload,
    );
    return data.data ?? data;
  },

  async updateCarouselItem(
    configId: string,
    itemId: string,
    payload: UpdateCarouselItemPayload,
  ): Promise<CarouselItem> {
    const { data } = await api.patch(
      `/admin/landing-page/${configId}/carousel-items/${itemId}`,
      payload,
    );
    return data.data ?? data;
  },

  async removeCarouselItem(configId: string, itemId: string): Promise<void> {
    await api.delete(
      `/admin/landing-page/${configId}/carousel-items/${itemId}`,
    );
  },
};
