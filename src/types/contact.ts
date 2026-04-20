export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface ContactSubmissionsResponse {
  total: number;
  unreadCount: number;
  limit: number;
  offset: number;
  items: ContactSubmission[];
}

export interface ContactSubmissionsQuery {
  q?: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}
