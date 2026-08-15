import api from "./api";

export type BookPurchaseStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface BookPurchase {
  id: string;
  userId: string;
  bookId: string;
  status: BookPurchaseStatus;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  paidAt: string | null;
  createdAt: string;
  bookSnapshot: {
    slug?: string;
    title?: string;
    regularPrice?: number;
    salePrice?: number | null;
    pricePaid?: number;
  };
  user?: {
    id: string;
    name?: string | null;
    email?: string;
  };
  book?: {
    id: string;
    title?: string;
    slug?: string;
  };
}

export const bookPurchaseService = {
  async getAll(filters?: {
    status?: BookPurchaseStatus;
    userId?: string;
    bookId?: string;
  }): Promise<BookPurchase[]> {
    const { data } = await api.get("/admin/book-purchases", {
      params: filters,
    });
    return data.data ?? data;
  },

  async getById(id: string): Promise<BookPurchase> {
    const { data } = await api.get(`/admin/book-purchases/${id}`);
    return data.data ?? data;
  },

  async refund(id: string, reason?: string): Promise<BookPurchase> {
    const { data } = await api.post(`/admin/book-purchases/${id}/refund`, {
      reason,
    });
    return data.data ?? data;
  },
};
