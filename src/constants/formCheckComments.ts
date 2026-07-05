/** One-tap coach feedback presets for form-check review. */
export const FORM_CHECK_PRESET_COMMENTS = [
  "Solid progress today.",
  "Everything is tracking perfectly. Stick with it!",
  "The effort you're putting in is paying off.",
  "Right where it needs to be. Clean execution!",
  "Looking good. Great form, keep it up!",
  "Solid work today. Keep this momentum going!",
  "Spot on. Keep doing exactly what you're doing.",
] as const;

/** Default quick-pass message (first preset). */
export const FORM_CHECK_PASS_COMMENT = FORM_CHECK_PRESET_COMMENTS[4];
