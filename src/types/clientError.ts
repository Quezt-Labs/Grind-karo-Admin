export type ClientErrorSource = "CLIENT" | "ADMIN";
export type ClientErrorCategory = "API" | "REACT" | "UNHANDLED" | "PROMISE";

export interface ClientErrorReport {
  id: string;
  source: ClientErrorSource;
  category: ClientErrorCategory;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  message: string;
  stack: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface ClientErrorsResponse {
  total: number;
  unreadCount: number;
  limit: number;
  offset: number;
  items: ClientErrorReport[];
}

export interface ClientErrorsQuery {
  unreadOnly?: boolean;
  source?: ClientErrorSource;
  category?: ClientErrorCategory;
  q?: string;
  limit?: number;
  offset?: number;
}
