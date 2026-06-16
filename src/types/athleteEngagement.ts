export type AnnouncementKind = "text" | "audio" | "video";

export interface Announcement {
  id: string;
  kind: AnnouncementKind;
  title: string | null;
  text: string | null;
  author: string | null;
  mediaUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  youtubeVideoId: string | null;
  thumbnailUrl: string | null;
}

export interface AdminBigLiftPrUserSummary {
  userId: string;
  userName: string;
  userEmail: string | null;
  isDue: boolean;
  lastCheckin: BigLiftPrCheckin | null;
}

export interface BigLiftPrCheckin {
  id: string;
  userId: string;
  squatKg: number;
  squatLoadKg: number | null;
  squatReps: number | null;
  benchKg: number;
  benchLoadKg: number | null;
  benchReps: number | null;
  deadliftKg: number;
  deadliftLoadKg: number | null;
  deadliftReps: number | null;
  totalKg: number;
  notes: string | null;
  createdAt: string;
}

export interface CreateAnnouncementInput {
  kind: AnnouncementKind;
  title?: string;
  text?: string;
  author?: string;
  mediaUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateAnnouncementInput {
  kind?: AnnouncementKind;
  title?: string;
  text?: string;
  author?: string;
  mediaUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
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
