import { createBaseService } from './baseService';

const COLLECTION = 'eventPrepPlans';
const base = createBaseService(COLLECTION);

/**
 * Event Preparation Planner Service
 *
 * Helps riders plan and prepare for dressage events, shows, clinics,
 * and other competitions with structured preparation tracking.
 *
 * Data model:
 * {
 *   userId:          string  - Firebase Auth UID
 *
 *   // Event Details
 *   eventName:       string  - required, name of event
 *   eventType:       string  - "show" | "clinic" | "schooling-show" | "championship" | "other"
 *   eventDate:       string  - required, ISO date
 *   eventEndDate:    string  - optional, ISO date (for multi-day events)
 *   location:        string  - venue name/address
 *   organizerName:   string  - optional
 *   horseName:       string  - which horse for this event
 *
 *   // Competition Details
 *   level:           string  - dressage level being ridden
 *   tests:           array   - [{ testName, testNumber, rideTime }]
 *   classEntries:    string  - optional, class numbers or descriptions
 *
 *   // Goals
 *   goals:           array   - [{ goal, priority }]
 *   focusAreas:      string  - what to specifically focus on
 *
 *   // Preparation Timeline
 *   prepTasks:       array   - [{ task, dueDate, completed, notes }]
 *
 *   // Day-of Plan
 *   arrivalTime:     string  - when to arrive at venue
 *   warmUpPlan:      string  - warm-up strategy and timing
 *   rideTimePlan:    string  - notes for during the ride
 *   coolDownPlan:    string  - post-ride plan
 *
 *   // Equipment Checklist
 *   equipmentList:   array   - [{ item, packed, category }]
 *
 *   // Travel
 *   travelNotes:     string  - directions, trailer, overnight plans
 *   departureTime:   string  - when to leave
 *
 *   // Post-Event
 *   postEventNotes:  string  - notes after the event
 *   lessonsLearned:  string  - what to carry forward
 *   scores:          array   - [{ testName, score, placing, judgeComments }]
 *
 *   // Status
 *   status:          string  - "planning" | "confirmed" | "completed" | "cancelled"
 * }
 */

// Event type options
export const EVENT_PREP_TYPES = [
  { value: 'show', label: 'Recognized Show' },
  { value: 'schooling-show', label: 'Schooling Show' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'championship', label: 'Championship' },
  { value: 'other', label: 'Other' }
];

// Dressage levels
export const DRESSAGE_LEVELS = [
  { value: 'intro', label: 'Introductory' },
  { value: 'training', label: 'Training Level' },
  { value: 'first', label: 'First Level' },
  { value: 'second', label: 'Second Level' },
  { value: 'third', label: 'Third Level' },
  { value: 'fourth', label: 'Fourth Level' },
  { value: 'psg', label: 'Prix St. Georges' },
  { value: 'inter1', label: 'Intermediate I' },
  { value: 'inter2', label: 'Intermediate II' },
  { value: 'gp', label: 'Grand Prix' },
  { value: 'freestyle', label: 'Freestyle/Musical' },
  { value: 'pas-de-deux', label: 'Pas de Deux' }
];

// Event status options
export const EVENT_PREP_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'confirmed', label: 'Confirmed/Entered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

// Default equipment checklist categories and items
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
    // Event details
    eventName: planData.eventName || '',
    eventType: planData.eventType || '',
    eventDate: planData.eventDate || '',
    eventEndDate: planData.eventEndDate || null,
    location: planData.location || '',
    organizerName: planData.organizerName || '',
    horseName: planData.horseName || '',

    // Competition details
    level: planData.level || '',
    tests: planData.tests || [],
    classEntries: planData.classEntries || '',

    // Goals
    goals: planData.goals || [],
    focusAreas: planData.focusAreas || '',

    // Preparation timeline
    prepTasks: planData.prepTasks || [],

    // Day-of plan
    arrivalTime: planData.arrivalTime || '',
    warmUpPlan: planData.warmUpPlan || '',
    rideTimePlan: planData.rideTimePlan || '',
    coolDownPlan: planData.coolDownPlan || '',

    // Equipment checklist
    equipmentList: planData.equipmentList || [...DEFAULT_EQUIPMENT],

    // Travel
    travelNotes: planData.travelNotes || '',
    departureTime: planData.departureTime || '',

    // Post-event (filled in after)
    postEventNotes: planData.postEventNotes || '',
    lessonsLearned: planData.lessonsLearned || '',
    scores: planData.scores || [],

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
 * Update a specific prep task's completion status
 */
export async function togglePrepTask(docId, taskIndex, completed) {
  const result = await base.read(docId);
  if (!result.success) return result;

  const prepTasks = [...result.data.prepTasks];
  if (taskIndex >= 0 && taskIndex < prepTasks.length) {
    prepTasks[taskIndex] = { ...prepTasks[taskIndex], completed };
    return base.update(docId, { prepTasks });
  }
  return { success: false, error: 'Task index out of range' };
}

/**
 * Update equipment packed status
 */
export async function toggleEquipmentPacked(docId, itemIndex, packed) {
  const result = await base.read(docId);
  if (!result.success) return result;

  const equipmentList = [...result.data.equipmentList];
  if (itemIndex >= 0 && itemIndex < equipmentList.length) {
    equipmentList[itemIndex] = { ...equipmentList[itemIndex], packed };
    return base.update(docId, { equipmentList });
  }
  return { success: false, error: 'Equipment index out of range' };
}

/**
 * Add a score entry after completing an event
 */
export async function addScore(docId, scoreData) {
  const result = await base.read(docId);
  if (!result.success) return result;

  const scores = [...(result.data.scores || []), {
    testName: scoreData.testName || '',
    score: scoreData.score || '',
    placing: scoreData.placing || '',
    judgeComments: scoreData.judgeComments || ''
  }];

  return base.update(docId, { scores });
}

/**
 * Delete an event prep plan (soft delete)
 */
export async function deleteEventPrepPlan(docId) {
  return base.delete(docId);
}
