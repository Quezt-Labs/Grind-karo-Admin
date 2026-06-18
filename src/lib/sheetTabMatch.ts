import type {
  AdminSheetsExerciseNote,
  AdminSheetsSetVideo,
} from "@/services/sheetsSetVideoService";

export function sheetTabNamesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function noteMatchesVideo(
  note: AdminSheetsExerciseNote,
  video: AdminSheetsSetVideo,
): boolean {
  if (!sheetTabNamesMatch(note.tabName, video.tabName)) return false;
  if (
    note.weekNumber !== video.weekNumber ||
    note.dayNumber !== video.dayNumber
  ) {
    return false;
  }
  if (note.exerciseName !== video.exerciseName) return false;
  if (note.sortOrder > 0 && video.sortOrder !== note.sortOrder) return false;
  return true;
}

export function findVideosForNote(
  note: AdminSheetsExerciseNote,
  videos: AdminSheetsSetVideo[],
): AdminSheetsSetVideo[] {
  return videos.filter((video) => noteMatchesVideo(note, video));
}
