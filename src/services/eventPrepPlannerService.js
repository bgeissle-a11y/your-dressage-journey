import { createBaseService } from './baseService';

const COLLECTION = 'eventPrepPlans';
const base = createBaseService(COLLECTION);

/**
 * Event Preparation Planner Service
 *
 * Helps riders plan and prepare for dressage events, shows, clinics,
 * and other experiences with structured preparation tracking.
 *
 * Data model (matches event-preparation-form.html):
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
 *   // Section 2: Current Context
 *   horseName:          string  - which horse for this event
 *   currentLevel:       string  - current dressage level
 *   targetLevel:        string  - level for this event if different
 *   eventExperience:    string  - "first-time" | "some-experience" | "regular"
 *   currentChallenges:  string  - technical or physical challenges
 *   recentProgress:     string  - recent breakthroughs
 *
 *   // Section 3: Goals (up to 3)
 *   goals:              array   - [string, string, string]
 *
 *   // Section 4: Concerns (up to 3)
 *   concerns:           array   - [string, string, string]
 *
 *   // Section 5: Resources & Preparation
 *   ridingFrequency:    string  - "1-2" | "3-4" | "5-6" | "7"
 *   coachAccess:        string  - "weekly" | "biweekly" | "monthly" | "occasional" | "none"
 *   availableResources: array   - ["mirrors", "video", "ground-person", "show-facility"]
 *   constraints:        string  - time or resource constraints
 *
 *   // Section 6: Additional
 *   additionalInfo:     string  - free-form additional context
 *   preferredCoach:     string  - "klaus" | "jordan" | "emma" | ""
 *
 *   // Generated plan (future AI integration)
 *   generatedPlan:      string|null
 *
 *   // Interactive checklists (plan view)
 *   equipmentList:      array   - [{ item, packed, category }]
 *   prepTasks:          array   - [{ task, dueDate, completed, notes }]
 *
 *   // Status
 *   status:             string  - "planning" | "confirmed" | "completed" | "cancelled"
 * }
 */

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

    // Section 2: Current Context
    horseName: planData.horseName || '',
    currentLevel: planData.currentLevel || '',
    targetLevel: planData.targetLevel || '',
    eventExperience: planData.eventExperience || '',
    currentChallenges: planData.currentChallenges || '',
    recentProgress: planData.recentProgress || '',

    // Section 3: Goals
    goals: planData.goals || [],

    // Section 4: Concerns
    concerns: planData.concerns || [],

    // Section 5: Resources
    ridingFrequency: planData.ridingFrequency || '',
    coachAccess: planData.coachAccess || '',
    availableResources: planData.availableResources || [],
    constraints: planData.constraints || '',

    // Section 6: Additional
    additionalInfo: planData.additionalInfo || '',
    preferredCoach: planData.preferredCoach || '',

    // Generated plan (future AI)
    generatedPlan: null,

    // Interactive checklists
    equipmentList: [...DEFAULT_EQUIPMENT],
    prepTasks: [],

    // Status
    status: planData.status || 'planning'
  });
}

/**
 * Get a single event prep plan
 */
export async function getEventPrepPlan(docId) {
  return base.read(docId);
}

/**
 * Get all event prep plans for a user (by event date, upcoming first)
 */
export async function getAllEventPrepPlans(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'eventDate',
    orderDirection: 'asc',
    ...options
  });
}

/**
 * Get upcoming events (status is planning or confirmed)
 */
export async function getUpcomingEvents(userId) {
  return base.queryByField(userId, 'status', 'in', ['planning', 'confirmed']);
}

/**
 * Get completed events
 */
export async function getCompletedEvents(userId) {
  return base.queryByField(userId, 'status', '==', 'completed');
}

/**
 * Get events for a specific horse
 */
export async function getEventsByHorse(userId, horseName) {
  return base.queryByField(userId, 'horseName', '==', horseName);
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
