export interface BigLiftPrCheckin {
  id: string;
  userId: string;
  squatKg: number;
  benchKg: number;
  deadliftKg: number;
  totalKg: number;
  notes: string | null;
  createdAt: string;
}

export interface AdminBigLiftPrUserSummary {
  userId: string;
  userName: string;
  userEmail: string | null;
  isDue: boolean;
  lastCheckin: BigLiftPrCheckin | null;
}

export interface MotivationQuote {
  id: string;
  text: string;
  author: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface VideoLibraryItem {
  id: string;
  title: string;
  youtubeUrl: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  youtubeVideoId: string;
  thumbnailUrl: string;
}

export interface CreateMotivationQuoteInput {
  text: string;
  author?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateMotivationQuoteInput {
  text?: string;
  author?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateVideoLibraryItemInput {
  title: string;
  youtubeUrl: string;
  description?: string;
  category?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateVideoLibraryItemInput {
  title?: string;
  youtubeUrl?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
  sortOrder?: number;
}
