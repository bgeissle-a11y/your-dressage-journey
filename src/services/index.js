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
  MENTAL_STATES
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
  togglePrepTask,
  toggleEquipmentPacked,
  addScore,
  deleteEventPrepPlan,
  EVENT_PREP_TYPES,
  DRESSAGE_LEVELS,
  EVENT_PREP_STATUSES,
  DEFAULT_EQUIPMENT
} from './eventPrepPlannerService';
