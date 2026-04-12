import { createBaseService } from './baseService';

const COLLECTION = 'lessonNotes';
const base = createBaseService(COLLECTION);

/**
 * Lesson Notes Service
 *
 * Data model (from lesson-notes.html):
 * {
 *   userId:              string - Firebase Auth UID
 *   lessonDate:          string - required, ISO date
 *   horseId:             string - required, horse profile ID
 *   horseName:           string - required, display name
 *   instructorName:      string - required
 *   lessonType:          string - "in-person" | "clinic" | "video-lesson" | "video-review" | "other"
 *   linkedDebriefId:     string | null - FK to debriefs collection
 *   movementInstructions: string - required, large textarea
 *   movementPurpose:     string | null - optional, rider's articulation of why the exercises mattered
 *   cuesCorrections:     string - optional textarea
 *   riderReflections:    string - optional textarea
 *   takeaways:           string[] - 0-3 non-empty strings
 *   isDraft:             boolean
 * }
 */

export const LESSON_TYPES = [
  { value: 'in-person', label: 'In-person lesson' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'video-lesson', label: 'Video lesson' },
  { value: 'video-review', label: 'Video review of my ride' },
  { value: 'other', label: 'Other' }
];

/**
 * Create a new lesson note
 */
export async function createLessonNote(userId, data) {
  return base.create(userId, {
    lessonDate: data.lessonDate || '',
    horseId: data.horseId || '',
    horseName: data.horseName || '',
    instructorName: data.instructorName || '',
    lessonType: data.lessonType || '',
    linkedDebriefId: data.linkedDebriefId || null,
    movementInstructions: data.movementInstructions || '',
    movementPurpose: data.movementPurpose ? data.movementPurpose : null,
    cuesCorrections: data.cuesCorrections || '',
    riderReflections: data.riderReflections || '',
    takeaways: (data.takeaways || []).filter(Boolean),
    isDraft: data.isDraft || false
  });
}

/**
 * Get a single lesson note
 */
export async function getLessonNote(docId) {
  return base.read(docId);
}

/**
 * Get all lesson notes for a user (newest first)
 */
export async function getAllLessonNotes(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'lessonDate',
    orderDirection: 'desc',
    ...options
  });
}

/**
 * Get lesson notes by horse
 */
export async function getLessonNotesByHorse(userId, horseName) {
  return base.queryByField(userId, 'horseName', '==', horseName);
}

/**
 * Get lesson notes by instructor
 */
export async function getLessonNotesByInstructor(userId, instructorName) {
  return base.queryByField(userId, 'instructorName', '==', instructorName);
}

/**
 * Update a lesson note
 */
export async function updateLessonNote(docId, data) {
  return base.update(docId, data);
}

/**
 * Delete a lesson note (soft delete)
 */
export async function deleteLessonNote(docId) {
  return base.delete(docId);
}
