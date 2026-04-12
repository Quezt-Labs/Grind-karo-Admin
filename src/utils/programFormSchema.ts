import { z } from "zod";

export const programSchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().min(2, "Slug is required"),
  description: z.string().min(10, "Description must be at least 10 chars"),
  tagline: z.string().optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"]),
  duration: z.coerce.number().min(1, "Min 1 week"),
  frequency: z.string().min(1, "Frequency is required"),
  category: z.string().min(1, "Category is required"),
  badge: z.string().optional(),
  sortOrder: z.coerce.number().min(0).optional(),
  isActive: z.boolean(),
  highlights: z.array(z.object({ value: z.string() })),
  goals: z.array(z.object({ value: z.string() })),
});

export type ProgramFormData = z.infer<typeof programSchema>;

export const LEVEL_OPTIONS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
  { value: "ALL_LEVELS", label: "All Levels" },
];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
