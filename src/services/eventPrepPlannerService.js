import { createBaseService } from './baseService';

const COLLECTION = 'eventPrepPlans';
const base = createBaseService(COLLECTION);

/**
 * Event Preparation Planner Service
 *
 * Helps riders plan and prepare for dressage events, shows, clinics,
 * and other experiences with structured preparation tracking.
 *
 * Data model (matches event-preparation-formV2.html — multi-horse):
 * {
 *   userId:             string  - Firebase Auth UID
 *
 *   // Section 1: Event Details
 *   eventName:          string  - required
 *   eventDate:          string  - required, ISO date
 *   eventType:          string  - "show" | "clinic" | "new-trainer" | "evaluation" | "demo" | "other"
 *   eventTypeOther:     string  - only when eventType === "other"
 *   location:           string  - venue name or city
 *   eventDescription:   string  - additional event details
 *
 *   // Section 2: Horses (multi-horse, each with context + goals + concerns)
 *   horses:             array   - [{
 *     horseName:        string  - required, selected from user's horse profiles
 *     currentLevel:     string  - required, current dressage level
 *     targetLevel:      string  - level for this event if different
 *     experience:       string  - "first-time" | "some-experience" | "regular"
 *     challenges:       string  - technical or physical challenges
 *     progress:         string  - recent breakthroughs
 *     goals:            array   - [string] up to 3, first required
 *     concerns:         array   - [string] up to 3, all optional
 *   }]
 *   horseNames:         array   - [string] denormalized for Firestore queries
 *
 *   // Section 3: Resources & Preparation
 *   ridingFrequency:    string  - "1-2" | "3-4" | "5-6" | "7"
 *   coachAccess:        string  - "weekly" | "biweekly" | "monthly" | "occasional" | "none"
 *   availableResources: array   - ["mirrors", "video", "ground-person", "show-facility"]
 *   constraints:        string  - time or resource constraints
 *
 *   // Section 4: Additional
 *   additionalInfo:     string  - free-form additional context
 *   preferredCoach:     string  - "klaus" | "jordan" | "emma" | ""
 *
 *   // Generated plan (AI integration)
 *   generatedPlan:      object|null
 *
 *   // Interactive checklists (plan view)
 *   equipmentList:      array   - [{ item, packed, category }]
 *   prepTasks:          array   - [{ task, dueDate, completed, notes }]
 *
 *   // Status
 *   status:             string  - "planning" | "confirmed" | "completed" | "cancelled"
 * }
 */

/**
 * Backward compatibility: migrate old single-horse documents to multi-horse format.
 * Applied at read time — no batch migration needed.
 */
function migrateToMultiHorse(doc) {
  if (!doc) return doc;
  if (doc.horses && Array.isArray(doc.horses) && doc.horses.length > 0) return doc;

  return {
    ...doc,
    horses: [{
      horseName: doc.horseName || '',
      currentLevel: doc.currentLevel || '',
      targetLevel: doc.targetLevel || '',
      experience: doc.eventExperience || '',
      challenges: doc.currentChallenges || '',
      progress: doc.recentProgress || '',
      goals: doc.goals || [],
      concerns: doc.concerns || []
    }],
    horseNames: [doc.horseName].filter(Boolean)
  };
}

// Event type options (matching HTML form)
export const EVENT_PREP_TYPES = [
  { value: 'show', label: 'Competition/Show' },
  { value: 'clinic', label: 'Clinic/Workshop' },
  { value: 'new-trainer', label: 'Lesson with New Trainer' },
  { value: 'evaluation', label: 'Level Assessment/Evaluation' },
  { value: 'demo', label: 'Demonstration/Performance' },
  { value: 'other', label: 'Other' }
];

// Event experience levels
export const EXPERIENCE_LEVELS = [
  { value: 'first-time', label: 'First time' },
  { value: 'some-experience', label: 'Some experience' },
  { value: 'regular', label: 'Regular participant' }
];

// Riding frequency options
export const RIDING_FREQUENCIES = [
  { value: '1-2', label: '1-2 days/week' },
  { value: '3-4', label: '3-4 days/week' },
  { value: '5-6', label: '5-6 days/week' },
  { value: '7', label: '7 days/week' }
];

// Coach access options
export const COACH_ACCESS_OPTIONS = [
  { value: 'weekly', label: 'Weekly lessons' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'occasional', label: 'Occasional' },
  { value: 'none', label: 'Self-training' }
];

// Available resources checkboxes
export const AVAILABLE_RESOURCES = [
  { value: 'mirrors', label: 'Mirrors in arena' },
  { value: 'video', label: 'Video capability' },
  { value: 'ground-person', label: 'Ground person/eyes' },
  { value: 'show-facility', label: 'Can school at show venue' }
];

// Coaching voice options
export const COACHING_VOICES = [
  { value: '', label: 'No preference - surprise me' },
  { value: 'klaus', label: 'Herr Klaus von Steinberg (Stern European master)' },
  { value: 'jordan', label: 'Dr. Jordan Hayes (Neutral analyst)' },
  { value: 'emma', label: 'Coach Emma (Encouraging instructor)' }
];

// Event status options
export const EVENT_PREP_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'confirmed', label: 'Confirmed/Entered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

// Default equipment checklist
export const DEFAULT_EQUIPMENT = [
  { item: 'Saddle', packed: false, category: 'tack' },
  { item: 'Bridle', packed: false, category: 'tack' },
  { item: 'Saddle pad(s)', packed: false, category: 'tack' },
  { item: 'Girth', packed: false, category: 'tack' },
  { item: 'Show coat', packed: false, category: 'rider-attire' },
  { item: 'White breeches', packed: false, category: 'rider-attire' },
  { item: 'Tall boots', packed: false, category: 'rider-attire' },
  { item: 'Helmet', packed: false, category: 'rider-attire' },
  { item: 'Gloves', packed: false, category: 'rider-attire' },
  { item: 'Stock tie / choker', packed: false, category: 'rider-attire' },
  { item: 'Number pinny / arm band', packed: false, category: 'rider-attire' },
  { item: 'Hair net / show bow', packed: false, category: 'rider-attire' },
  { item: 'Whip / spurs', packed: false, category: 'aids' },
  { item: 'Leg wraps / boots', packed: false, category: 'horse-care' },
  { item: 'Fly spray', packed: false, category: 'horse-care' },
  { item: 'Grooming kit', packed: false, category: 'horse-care' },
  { item: 'Braiding supplies', packed: false, category: 'horse-care' },
  { item: 'Hay / feed / water', packed: false, category: 'horse-care' },
  { item: 'Coggins / health papers', packed: false, category: 'documents' },
  { item: 'Registration papers', packed: false, category: 'documents' },
  { item: 'Entry confirmation', packed: false, category: 'documents' },
  { item: 'Dressage tests (printed)', packed: false, category: 'documents' }
];

/**
 * Create a new event preparation plan
 */
export async function createEventPrepPlan(userId, planData) {
  return base.create(userId, {
    // Section 1: Event Details
    eventName: planData.eventName || '',
    eventDate: planData.eventDate || '',
    eventType: planData.eventType || '',
    eventTypeOther: planData.eventTypeOther || '',
    location: planData.location || '',
    eventDescription: planData.eventDescription || '',

    // Section 2: Horses (multi-horse)
    horses: planData.horses || [],
    horseNames: planData.horseNames || [],

    // Section 3: Resources
    ridingFrequency: planData.ridingFrequency || '',
    coachAccess: planData.coachAccess || '',
    availableResources: planData.availableResources || [],
    constraints: planData.constraints || '',

    // Section 4: Additional
    additionalInfo: planData.additionalInfo || '',
    preferredCoach: planData.preferredCoach || '',

    // Generated plan (AI)
    generatedPlan: null,

    // Interactive checklists
    equipmentList: [...DEFAULT_EQUIPMENT],
    prepTasks: [],

    // Status
    status: planData.status || 'planning'
  });
}

/**
 * Get a single event prep plan (with backward-compat migration)
 */
export async function getEventPrepPlan(docId) {
  const result = await base.read(docId);
  if (result.success) {
    result.data = migrateToMultiHorse(result.data);
  }
  return result;
}

/**
 * Get all event prep plans for a user (by event date, upcoming first)
 */
export async function getAllEventPrepPlans(userId, options = {}) {
  const result = await base.readAll(userId, {
    orderField: 'eventDate',
    orderDirection: 'asc',
    ...options
  });
  if (result.success) {
    result.data = result.data.map(migrateToMultiHorse);
  }
  return result;
}

/**
 * Get upcoming events (status is planning or confirmed)
 */
export async function getUpcomingEvents(userId) {
  const result = await base.queryByField(userId, 'status', 'in', ['planning', 'confirmed']);
  if (result.success) {
    result.data = result.data.map(migrateToMultiHorse);
  }
  return result;
}

/**
 * Get completed events
 */
export async function getCompletedEvents(userId) {
  const result = await base.queryByField(userId, 'status', '==', 'completed');
  if (result.success) {
    result.data = result.data.map(migrateToMultiHorse);
  }
  return result;
}

/**
 * Get events for a specific horse (uses denormalized horseNames array)
 */
export async function getEventsByHorse(userId, horseName) {
  return base.queryByField(userId, 'horseNames', 'array-contains', horseName);
}

/**
 * Update an event prep plan
 */
export async function updateEventPrepPlan(docId, data) {
  return base.update(docId, data);
}

/**
 * Delete an event prep plan (soft delete)
 */
export async function deleteEventPrepPlan(docId) {
  return base.delete(docId);
}
