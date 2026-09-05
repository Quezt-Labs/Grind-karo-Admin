export const TRAINING_VERTICALS = [
  "GENERAL_STRENGTH_NUTRITION",
  "POWERLIFTING",
  "HYBRID_TRAINING",
] as const;

export type TrainingVertical = (typeof TRAINING_VERTICALS)[number];

export const DEFAULT_TRAINING_VERTICAL: TrainingVertical = "POWERLIFTING";

export const TRAINING_VERTICAL_LABELS: Record<TrainingVertical, string> = {
  GENERAL_STRENGTH_NUTRITION: "General Strength",
  POWERLIFTING: "Powerlifting",
  HYBRID_TRAINING: "Hybrid Strength",
};

export const TRAINING_VERTICAL_OPTIONS = TRAINING_VERTICALS.map((value) => ({
  value,
  label: TRAINING_VERTICAL_LABELS[value],
}));
