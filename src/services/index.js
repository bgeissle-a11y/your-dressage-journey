/**
 * Services Index
 * Central export for all Firestore service modules.
 *
 * Usage:
 *   import { createRiderProfile, getAllDebriefs } from '../services';
 */

// User management
export { createUser, getUser, updateUser } from './userService';

// Rider profiles (one per user)
export {
  createRiderProfile,
  getRiderProfile,
  updateRiderProfile,
  deleteRiderProfile
} from './riderProfileService';

// Horse profiles (multiple per user)
export {
  createHorseProfile,
  getHorseProfile,
  getAllHorseProfiles,
  getHorseByName,
  updateHorseProfile,
  deleteHorseProfile
} from './horseProfileService';

// Reflections
export {
  createReflection,
  getReflection,
  getAllReflections,
  getReflectionsByCategory,
  updateReflection,
  deleteReflection,
  REFLECTION_CATEGORIES
} from './reflectionService';

// Post-ride debriefs
export {
  createDebrief,
  getDebrief,
  getAllDebriefs,
  getDebriefsByHorse,
  getDraftDebriefs,
  updateDebrief,
  deleteDebrief,
  SESSION_TYPES,
  RIDER_ENERGY_LEVELS,
  HORSE_ENERGY_LEVELS,
  MENTAL_STATES,
  MENTAL_STATE_GROUPS,
  MOVEMENT_CATEGORIES,
  RIDE_ARC_OPTIONS
} from './debriefService';

// Journey events
export {
  createJourneyEvent,
  getJourneyEvent,
  getAllJourneyEvents,
  getJourneyEventsByType,
  getActiveJourneyEvents,
  updateJourneyEvent,
  deleteJourneyEvent,
  EVENT_TYPES,
  EVENT_MAGNITUDES,
  IMPACT_DURATIONS,
  EVENT_STATUSES
} from './journeyEventService';

// Observations
export {
  createObservation,
  getObservation,
  getAllObservations,
  getObservationsByContext,
  updateObservation,
  deleteObservation,
  CONTEXT_TYPES
} from './observationService';

// Event preparation planner (legacy — kept for backward compatibility)
export {
  createEventPrepPlan,
  getEventPrepPlan,
  getAllEventPrepPlans,
  getUpcomingEvents,
  getCompletedEvents,
  getEventsByHorse,
  updateEventPrepPlan,
  deleteEventPrepPlan,
  EVENT_PREP_TYPES,
  EXPERIENCE_LEVELS,
  COACHING_VOICES,
  EVENT_PREP_STATUSES,
  DEFAULT_EQUIPMENT
} from './eventPrepPlannerService';

// Show preparation planner (replaces Event Prep for new submissions)
export {
  createShowPreparation,
  getShowPreparation,
  getAllShowPreparations,
  getUpcomingShows,
  getCompletedShows,
  updateShowPreparation,
  deleteShowPreparation,
  resolveTestNames,
  SHOW_TYPES,
  SHOW_EXPERIENCE_LEVELS,
  SHOW_PREP_STATUSES,
  RIDING_FREQUENCIES,
  COACH_ACCESS_OPTIONS,
  AVAILABLE_RESOURCES,
  STANDARD_TESTS,
  FREESTYLE_TESTS,
  TEST_DISPLAY_NAMES
} from './showPreparationService';

// Physical self-assessments
export {
  createPhysicalAssessment,
  getPhysicalAssessment,
  getAllPhysicalAssessments,
  updatePhysicalAssessment,
  deletePhysicalAssessment,
  BODY_PARTS,
  KINESTHETIC_DESCRIPTIONS
} from './physicalAssessmentService';

// Rider self-assessments
export {
  createRiderAssessment,
  getRiderAssessment,
  getAllRiderAssessments,
  updateRiderAssessment,
  deleteRiderAssessment,
  RIDER_ATTRIBUTES,
  SELF_RATING_SCALES
} from './riderAssessmentService';

// Technical & philosophical self-assessments
export {
  createTechnicalAssessment,
  getTechnicalAssessment,
  getAllTechnicalAssessments,
  updateTechnicalAssessment,
  deleteTechnicalAssessment,
  TRAINING_SCALE_PILLARS,
  GAIT_UNDERSTANDING_SCALES,
  RIDER_SKILL_SCALES
} from './technicalPhilosophicalService';

// Lesson notes
export {
  createLessonNote,
  getLessonNote,
  getAllLessonNotes,
  getLessonNotesByHorse,
  getLessonNotesByInstructor,
  updateLessonNote,
  deleteLessonNote,
  LESSON_TYPES
} from './lessonNotesService';

// Weekly context (reflection pre-step)
export {
  getWeeklyContext,
  saveWeeklyContext,
  getWeekId
} from './weeklyContextService';

// Horse health & soundness
export {
  createHealthEntry,
  getHealthEntry,
  getAllHealthEntries,
  getOngoingHealthEntries,
  getHealthEntriesByHorse,
  updateHealthEntry,
  deleteHealthEntry,
  ISSUE_TYPES,
  PROFESSIONAL_TYPES,
  HEALTH_STATUSES
} from './horseHealthService';
