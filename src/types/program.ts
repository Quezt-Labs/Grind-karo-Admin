export type ProgramLevel =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "ALL_LEVELS";

export interface Program {
  id: string;
  slug: string;
  name: string;
  description: string;
  tagline?: string;
  level: ProgramLevel;
  duration: number;
  frequency: string;
  highlights: string[];
  goals: string[];
  badge?: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProgramPayload {
  slug: string;
  name: string;
  description: string;
  tagline?: string;
  level: ProgramLevel;
  duration: number;
  frequency: string;
  highlights: string[];
  goals: string[];
  badge?: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

export type UpdateProgramPayload = Partial<CreateProgramPayload>;

// --- Plans ---

export interface Plan {
  id: string;
  programId: string;
  program?: Program;
  name: string;
  description: string;
  price: number;
  validityMonths: number;
  features: string[];
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePlanPayload {
  programId: string;
  name: string;
  description: string;
  price: number;
  validityMonths: number;
  features: string[];
  displayOrder: number;
  isActive: boolean;
}

export type UpdatePlanPayload = Partial<CreatePlanPayload>;

// --- Subscriptions ---

export interface Subscription {
  id: string;
  planId: string;
  plan?: Plan;
  userId?: string;
  orderId: string;
  status?: string;
  expiresAt?: string;
  subscribedAt?: string;
  createdAt?: string;
}

export interface SubscribePlanPayload {
  planId: string;
  orderId: string;
}
