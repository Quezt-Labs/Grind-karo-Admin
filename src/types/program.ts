export type ProgramLevel =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "ALL_LEVELS";
export type PricingTierType = "BASIC" | "PREMIUM" | "ELITE";

export interface PricingTier {
  id?: string;
  tier: PricingTierType;
  price: number;
  validityDays: number;
  features: Record<string, boolean | number>;
  valueBreakdown: Record<string, number>;
  totalValue: number;
}

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
  pricingTiers: PricingTier[];
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
  pricingTiers: Omit<PricingTier, "id">[];
}

export type UpdateProgramPayload = Partial<
  Omit<CreateProgramPayload, "pricingTiers">
>;

export interface Enrollment {
  id: string;
  programId: string;
  program?: Program;
  tier: PricingTierType;
  orderId: string;
  userId?: string;
  status?: string;
  expiresAt?: string;
  enrolledAt?: string;
  createdAt?: string;
}

export interface EnrollProgramPayload {
  programId: string;
  tier: PricingTierType;
  orderId: string;
}
