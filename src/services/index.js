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
  MOVEMENT_CATEGORIES
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

// Event preparation planner
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
  RIDING_FREQUENCIES,
  COACH_ACCESS_OPTIONS,
  AVAILABLE_RESOURCES,
  COACHING_VOICES,
  EVENT_PREP_STATUSES,
  DEFAULT_EQUIPMENT
} from './eventPrepPlannerService';

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
