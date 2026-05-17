// ---- Exercise Library ----------------------------------------------------
export type ExerciseCategory =
  | "SQUAT"
  | "BENCH"
  | "DEADLIFT"
  | "ACCESSORY"
  | "OTHER";

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  category: ExerciseCategory;
  description: string | null;
  videoUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExercisePayload {
  slug: string;
  name: string;
  category: ExerciseCategory;
  description?: string | null;
  videoUrl?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

export type UpdateExercisePayload = Partial<CreateExercisePayload>;

// ---- Programs (top-level) -----------------------------------------------
export interface Program {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  coverImageUrl: string | null;
  badge: string | null;
  regularPrice: number;
  salePrice: number | null;
  currency: string;
  liftingFrequency: string | null;
  programLengthWeeks: number | null;
  highlights: string[];
  displayOrder: number;
  isActive: boolean;
  /** Only present in admin endpoints (GET /admin/programs, /admin/programs/:id) */
  googleSpreadsheetId?: string | null;
  /** Auto-assign spreadsheet: linked to buyer on every PAID purchase if they have no sheet yet */
  autoAssignSheetId?: string | null;
  createdAt: string;
  updatedAt: string;
  totalReviews?: number;
  averageRating?: number;
}

export interface CreateProgramPayload {
  slug: string;
  name: string;
  tagline?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  badge?: string | null;
  regularPrice: number;
  salePrice?: number | null;
  currency?: string;
  liftingFrequency?: string | null;
  programLengthWeeks?: number | null;
  highlights?: string[];
  displayOrder?: number;
  isActive?: boolean;
  /** Link this program to a specific Google Sheets workbook. Omit to leave unchanged; null to fall back to env GOOGLE_SPREADSHEET_ID. */
  googleSpreadsheetId?: string | null;
  /** Auto-assign: every new PAID purchase links this sheet to the buyer if they have none. */
  autoAssignSheetId?: string | null;
}

export type UpdateProgramPayload = Partial<CreateProgramPayload>;

// ---- Blocks -------------------------------------------------------------
export type BlockType = "MAIN" | "DELOAD" | "PEAK" | "CUSTOM";

export interface Block {
  id: string;
  programId: string;
  slug: string;
  name: string;
  blockType: BlockType;
  description: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  weeks?: Week[];
}

export interface CreateBlockPayload {
  slug: string;
  name: string;
  blockType: BlockType;
  description?: string | null;
  displayOrder?: number;
}

export type UpdateBlockPayload = Partial<CreateBlockPayload>;

// ---- Weeks --------------------------------------------------------------
export interface Week {
  id: string;
  blockId: string;
  weekNumber: number;
  title: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  days: Day[];
}

export interface CreateWeekPayload {
  weekNumber: number;
  title: string;
  notes?: string | null;
}

export type UpdateWeekPayload = Partial<CreateWeekPayload>;

// ---- Days ---------------------------------------------------------------
export interface Day {
  id: string;
  weekId: string;
  dayNumber: number;
  title: string;
  focus: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  exercises: ExerciseRow[];
}

export interface CreateDayPayload {
  dayNumber: number;
  title: string;
  focus?: string | null;
  notes?: string | null;
}

export type UpdateDayPayload = Partial<CreateDayPayload>;

// ---- Exercise Rows (program_exercises) ----------------------------------
export type LoadComputation =
  | "RPE_CHART"
  | "PERCENT_1RM"
  | "PERCENT_OF_ROW"
  | "NONE";

export interface ExerciseRow {
  id: string;
  dayId: string;
  sortOrder: number;
  category: ExerciseCategory;
  exerciseId: string | null;
  exerciseNameOverride: string | null;
  resolvedName?: string;
  sets: number | null;
  repScheme: string | null;
  targetRpe: string | null;
  percentOneRm: number | null; // basis points (5300 = 53.00%)
  computedLoadKg?: number | null;
  loadSource?: "percent" | "rpe" | null;
  loadNote: string | null;
  notes: string | null;
  movementSlotId: string | null;
  loadComputation: LoadComputation;
  loadRefFactor: number | null;
  loadRefExerciseId: string | null;
  hasPlateCheck: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateExerciseRowPayload {
  sortOrder?: number;
  category: ExerciseCategory;
  exerciseId?: string | null;
  exerciseNameOverride?: string | null;
  sets?: number | null;
  repScheme?: string | null;
  targetRpe?: string | null;
  percentOneRm?: number | null;
  computedLoadKg?: number | null;
  loadSource?: "percent" | "rpe" | null;
  loadNote?: string | null;
  notes?: string | null;
  movementSlotId?: string | null;
  loadComputation?: LoadComputation;
  loadRefFactor?: number | null;
  loadRefExerciseId?: string | null;
  hasPlateCheck?: boolean;
}

export type UpdateExerciseRowPayload = Partial<CreateExerciseRowPayload>;

// ---- Resources ----------------------------------------------------------
export interface ProgramResource {
  id: string;
  programId: string;
  slug: string;
  title: string;
  body: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourcePayload {
  slug: string;
  title: string;
  body: string;
  sortOrder?: number;
}

export type UpdateResourcePayload = Partial<CreateResourcePayload>;

// ---- Movement Slots -----------------------------------------------------
export type SlotCategory =
  | "SQUAT"
  | "BENCH"
  | "DEADLIFT"
  | "ACCESSORY"
  | "OTHER";

export interface MovementOptionOverride {
  programExerciseId: string;
  sets: number | null;
  repScheme: string | null;
  targetRpe: string | null;
  percentOneRm: number | null;
  loadComputation: LoadComputation | null;
  loadRefFactor: number | null;
  loadRefExerciseId: string | null;
  loadNote: string | null;
  notes: string | null;
}

export interface MovementOption {
  id: string;
  exerciseId: string | null;
  exerciseName: string;
  isDefault: boolean;
  sortOrder: number;
  overrides: MovementOptionOverride[];
}

export interface MovementSlot {
  id: string;
  slotKey: string;
  label: string;
  category: SlotCategory;
  sortOrder: number;
  options: MovementOption[];
}

export interface CreateSlotPayload {
  slotKey: string;
  label: string;
  category: SlotCategory;
  sortOrder?: number;
}

export type UpdateSlotPayload = Partial<CreateSlotPayload>;

export interface CreateOptionPayload {
  exerciseId?: string | null;
  exerciseName: string;
  isDefault?: boolean;
  sortOrder?: number;
}

export type UpdateOptionPayload = Partial<CreateOptionPayload>;

export interface OverrideUpsertPayload {
  programExerciseId: string;
  sets?: number | null;
  repScheme?: string | null;
  targetRpe?: string | null;
  percentOneRm?: number | null;
  loadComputation?: LoadComputation | null;
  loadRefFactor?: number | null;
  loadRefExerciseId?: string | null;
  loadNote?: string | null;
  notes?: string | null;
}

// ---- Program Tree (GET /admin/programs/:id/tree) ------------------------
export interface ProgramTree extends Program {
  blocks: (Block & {
    weeks: (Week & {
      days: (Day & {
        exercises: ExerciseRow[];
      })[];
    })[];
  })[];
  resources: ProgramResource[];
  movementSlots: MovementSlot[];
}

// ---- Program Reviews ----------------------------------------------------
export interface ProgramReview {
  id: string;
  programId: string;
  userId: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  program?: { id: string; name: string; slug: string };
}

// ---- Athlete Selections (admin) -----------------------------------------
export interface AthleteSelectionRecord {
  userId: string;
  userName: string | null;
  userEmail: string;
  profileId: string | null;
  movementSelections: Record<string, string> | null; // slotId → optionId
  has125kgPlates: boolean;
  selectionsLockedAt: string | null; // ISO 8601 — null = unlocked
  squatOneRm: number | null;
  benchOneRm: number | null;
  deadliftOneRm: number | null;
}

// ---- Program Purchases --------------------------------------------------
export type ProgramPurchaseStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface ProgramPurchase {
  id: string;
  programId: string;
  userId: string;
  status: ProgramPurchaseStatus;
  amount: number;
  currency: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  spreadsheetId?: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  program?: { id: string; name: string; slug: string };
  user?: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    spreadsheetId?: string | null;
  };
}

// ---- Google Sheets (coach template / personal copy) ---------------------

export interface SheetExerciseRow {
  weekNumber: number;
  dayNumber: number;
  dayFocus: string;
  category: string;
  exerciseName: string;
  goalRpe: string;
  sets: number;
  repScheme: string;
  loadKg: string;
  percentOneRm: string;
  upperRange: string;
  lowerRange: string;
  notes: string;
  sortOrder: number;
}

export type SheetTabName =
  | "Program 1"
  | "Program 2"
  | "Program 3"
  | "DELOAD WEEK"
  | "Bro day";

export type SheetsMyProgramData = Record<SheetTabName, SheetExerciseRow[]>;

export interface SheetsMyProgramResponse {
  success: true;
  data: SheetsMyProgramData;
}

export type MovementSlotKey = "squat" | "bench" | "deadlift";
export type MovementSlotPosition = "primary" | "secondary" | "tertiary";

export interface MovementSelectionSlot {
  primary: string;
  secondary?: string;
  tertiary?: string;
}

export type MovementSelectionData = Record<
  MovementSlotKey,
  MovementSelectionSlot
>;

export interface MovementSelectionResponse {
  success: true;
  data: MovementSelectionData;
}

export interface PatchMovementSelectionPayload {
  movement: MovementSlotKey;
  slot: MovementSlotPosition;
  exerciseName: string;
}

export interface CreateClientSheetPayload {
  userId: string;
  clientEmail: string;
  clientName: string;
  /** Override which template to copy. Omit to let server use GOOGLE_TEMPLATE_SPREADSHEET_ID env. */
  templateSpreadsheetId?: string;
}

export interface CreateClientSheetResponse {
  success: true;
  spreadsheetId: string;
  sheetUrl: string;
}
