import { createBaseService } from './baseService';

const COLLECTION = 'debriefs';
const base = createBaseService(COLLECTION);

/**
 * Post-Ride Debrief Service
 *
 * Data model (from post-ride-debrief-with-intentions.html):
 * {
 *   userId:           string  - Firebase Auth UID
 *   rideDate:         string  - required, ISO date
 *   horseName:        string  - required
 *   sessionType:      string  - "lesson" | "schooling" | "conditioning" | "clinic" |
 *                                "show-schooling" | "show-test" | "other"
 *   overallQuality:   number  - required, 1-10 range
 *   riderEnergy:      string  - "low" | "moderate" | "high" | "variable"
 *   horseEnergy:      string  - "low" | "moderate" | "high" | "variable" | "tense"
 *   mentalState:      string  - "calm"|"focused"|"joyful"|"confident"|"mixed"|"uncertain"|"worried"|"frustrated"|"tired"|"distracted"
 *   intentionRatings: object  - { intentionText: ratingValue(1-5) } (legacy)
 *   processGoal1:     string  - required process goal for next ride
 *   processGoal2:     string  - optional
 *   processGoal3:     string  - optional
 *   prevGoalRatings:  object  - { goal1: {text, rating}, goal2, goal3, reflection } | null
 *   confidenceExecution: number - 1-10, confidence in ability to execute
 *   rideArc:          string  - "consistent"|"built"|"faded"|"strengthened"|"deteriorated"|"peak"|"valley"|"variable"
 *   wins:             string  - optional, personal milestones / external validation
 *   ahaRealization:   string  - optional, aha moments
 *   horseNotices:     string  - optional, connection and feel observations
 *   challenges:       string  - optional, obstacles encountered
 *   workFocus:        string  - optional, what was specifically worked on
 *   rideArc:          string  - required, "consistent"|"built"|"faded"|"peak"|"valley"|"variable"
 *   rideArcNote:      string  - optional, what caused the shift
 *   isDraft:          boolean - true if saved as draft
 * }
 */

// Session type options
export const SESSION_TYPES = [
  { value: 'lesson', label: 'Lesson' },
  { value: 'schooling', label: 'Schooling/Practice' },
  { value: 'conditioning', label: 'Conditioning/Hacking' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'show-schooling', label: 'Show Schooling' },
  { value: 'show-test', label: 'Show Test' },
  { value: 'other', label: 'Other' }
];

// Energy level options
export const RIDER_ENERGY_LEVELS = [
  { value: 'low', label: 'Low/Fatigued' },
  { value: 'moderate', label: 'Moderate/Steady' },
  { value: 'high', label: 'High/Energized' },
  { value: 'variable', label: 'Variable/Mixed' }
];

export const HORSE_ENERGY_LEVELS = [
  { value: 'low', label: 'Low/Sluggish' },
  { value: 'moderate', label: 'Moderate/Steady' },
  { value: 'high', label: 'High/Forward' },
  { value: 'variable', label: 'Variable/Inconsistent' },
  { value: 'tense', label: 'Tense/Reactive' }
];

// Mental state options — grouped by valence for display
export const MENTAL_STATE_GROUPS = [
  {
    label: 'Positive',
    states: [
      { value: 'calm', label: 'Calm/Centered' },
      { value: 'focused', label: 'Focused/Determined' },
      { value: 'joyful', label: 'Joyful/Flowing' },
      { value: 'confident', label: 'Confident/Optimistic' }
    ]
  },
  {
    label: 'Mixed',
    states: [
      { value: 'mixed', label: 'Mixed/Complex' },
      { value: 'uncertain', label: 'Uncertain/Confused' }
    ]
  },
  {
    label: 'Difficult',
    states: [
      { value: 'worried', label: 'Worried/Concerned' },
      { value: 'frustrated', label: 'Frustrated/Tense' },
      { value: 'tired', label: 'Tired/Drained' },
      { value: 'distracted', label: 'Distracted/Scattered' }
    ]
  }
];

// Flat list for backward compatibility
export const MENTAL_STATES = MENTAL_STATE_GROUPS.flatMap(g => g.states);

// Movement/exercise tag categories
export const MOVEMENT_CATEGORIES = [
  {
    label: 'Basics & Gaits',
    tags: [
      { value: 'walk-work', label: 'Walk Work' },
      { value: 'trot-work', label: 'Trot Work' },
      { value: 'canter-work', label: 'Canter Work' },
      { value: 'transitions', label: 'Transitions' },
      { value: 'halt-salute', label: 'Halt/Salute' }
    ]
  },
  {
    label: 'Figures',
    tags: [
      { value: 'circles', label: 'Circles' },
      { value: 'serpentines', label: 'Serpentines' },
      { value: 'figure-8', label: 'Figure 8' },
      { value: 'diagonals', label: 'Diagonals' },
      { value: 'centerline', label: 'Centerline' }
    ]
  },
  {
    label: 'Lateral Work',
    tags: [
      { value: 'leg-yield', label: 'Leg Yield' },
      { value: 'shoulder-in', label: 'Shoulder-In' },
      { value: 'haunches-in', label: 'Haunches-In (Travers)' },
      { value: 'renvers', label: 'Renvers' },
      { value: 'half-pass', label: 'Half-Pass' },
      { value: 'turn-on-forehand', label: 'Turn on Forehand' }
    ]
  },
  {
    label: 'Advanced Movements',
    tags: [
      { value: 'extensions', label: 'Extensions' },
      { value: 'counter-canter', label: 'Counter Canter' },
      { value: 'simple-change', label: 'Simple Change' },
      { value: 'flying-change', label: 'Flying Change' },
      { value: 'turn-on-haunches', label: 'Turn on Haunches' },
      { value: 'pirouette', label: 'Pirouette' },
      { value: 'piaffe', label: 'Piaffe' },
      { value: 'passage', label: 'Passage' },
      { value: 'tempi-changes', label: 'Tempi Changes' }
    ]
  },
  {
    label: 'Horse/Training Focus',
    tags: [
      { value: 'rhythm', label: 'Rhythm' },
      { value: 'balance', label: 'Balance' },
      { value: 'bend-flexion', label: 'Bend & Flexion' },
      { value: 'straightness', label: 'Straightness' },
      { value: 'impulsion', label: 'Impulsion' },
      { value: 'collection', label: 'Collection' }
    ]
  },
  {
    label: 'Rider Focus',
    tags: [
      { value: 'contact', label: 'Contact/Connection' },
      { value: 'rider-position', label: 'Rider Position' },
      { value: 'breathing', label: 'Breathing' },
      { value: 'concentration-focus', label: 'Concentration/Focus' },
      { value: 'accuracy', label: 'Accuracy' },
      { value: 'test-ride-through', label: 'Test Ride-Through' }
    ]
  }
];

// Session modality options (added April 2026 — groundwork awareness)
export const SESSION_MODALITY_OPTIONS = [
  { value: 'in-saddle', label: 'In the saddle', sub: 'Ridden work', icon: '🐴' },
  { value: 'on-ground', label: 'On the ground', sub: 'In-hand, lunging, long-lining, liberty', icon: '👣' },
  { value: 'combined', label: 'Combined', sub: 'Both in one session', icon: '🔄' }
];

// Ground-work movement/exercise tag categories (used when sessionModality is on-ground or combined)
export const GROUNDWORK_MOVEMENT_CATEGORIES = [
  {
    label: 'Work Type',
    tags: [
      { value: 'gw-lunging', label: 'Lunging (single line)' },
      { value: 'gw-in-hand', label: 'In-hand work' },
      { value: 'gw-long-lining', label: 'Long-lining / Long-reining' },
      { value: 'gw-liberty', label: 'Liberty work' },
      { value: 'gw-pole-cavaletti', label: 'Pole / Cavaletti work' },
      { value: 'gw-body-work', label: 'Body work / Stretching' },
      { value: 'gw-partnership', label: 'Partnership Building' }
    ]
  },
  {
    label: 'Handling & Life Skills',
    tags: [
      { value: 'gw-trailer-loading', label: 'Trailer Loading' },
      { value: 'gw-standing-tied', label: 'Standing Tied / Patience' },
      { value: 'gw-farrier-vet-prep', label: 'Farrier / Vet Prep' },
      { value: 'gw-tacking-exposure', label: 'Saddling / Bridling / Mounting Exposure' },
      { value: 'gw-bathing-clipping', label: 'Bathing / Clipping / Grooming Desens.' },
      { value: 'gw-new-environment', label: 'New Environment Exposure' },
      { value: 'gw-desensitization', label: 'Scary Object Desensitization' },
      { value: 'gw-obstacle-work', label: 'Obstacle Work (poles, tarps, bridges, water)' },
      { value: 'gw-leading-skills', label: 'Leading Skills' },
      { value: 'gw-rehab-hand-walking', label: 'Rehab Hand-Walking' }
    ]
  },
  {
    label: 'Gaits & Transitions',
    tags: [
      { value: 'walk-work', label: 'Walk Work' },
      { value: 'trot-work', label: 'Trot Work' },
      { value: 'canter-work', label: 'Canter Work' },
      { value: 'transitions', label: 'Transitions' },
      { value: 'gw-halt-stand', label: 'Halt / Stand / Ground-tie' }
    ]
  },
  {
    label: 'Figures',
    tags: [
      { value: 'gw-circles', label: 'Circles (on the lunge or in-hand)' },
      { value: 'gw-changes-direction', label: 'Changes of Direction' },
      { value: 'gw-spirals', label: 'Spirals (in / out)' },
      { value: 'gw-serpentines', label: 'Serpentines' },
      { value: 'gw-figure-8', label: 'Figure 8' }
    ]
  },
  {
    label: 'Lateral & In-Hand Work',
    tags: [
      { value: 'gw-leg-yield', label: 'Leg Yield (in-hand)' },
      { value: 'gw-shoulder-in', label: 'Shoulder-In (in-hand)' },
      { value: 'gw-haunches-in', label: 'Haunches-In (in-hand)' },
      { value: 'gw-half-pass', label: 'Half-Pass (in-hand)' },
      { value: 'gw-disengage-hq', label: 'Disengage Hindquarters' },
      { value: 'gw-turn-on-forehand', label: 'Turn on Forehand' },
      { value: 'gw-leg-sequence', label: 'Specific Leg Movement Sequence' },
      { value: 'gw-rein-back', label: 'Rein-Back (in-hand)' }
    ]
  },
  {
    label: 'Advanced / Collected Work',
    tags: [
      { value: 'gw-piaffe', label: 'Piaffe (in-hand)' },
      { value: 'gw-passage', label: 'Passage (in-hand)' },
      { value: 'gw-spanish-walk', label: 'Spanish Walk' },
      { value: 'gw-extensions', label: 'Extensions / Lengthenings' },
      { value: 'gw-collection-work', label: 'Collection Work' }
    ]
  },
  {
    label: 'Horse / Training Focus',
    tags: [
      { value: 'rhythm', label: 'Rhythm' },
      { value: 'relaxation', label: 'Relaxation' },
      { value: 'attentiveness', label: 'Attentiveness' },
      { value: 'balance', label: 'Balance' },
      { value: 'bend-flexion', label: 'Bend & Flexion' },
      { value: 'straightness', label: 'Straightness' },
      { value: 'suppleness', label: 'Suppleness' },
      { value: 'impulsion', label: 'Impulsion' },
      { value: 'engagement', label: 'Engagement' },
      { value: 'softness-responsiveness', label: 'Softness / Responsiveness' },
      { value: 'collection', label: 'Collection' }
    ]
  },
  {
    label: 'Handler Focus',
    tags: [
      { value: 'gw-body-language', label: 'Body Language & Position' },
      { value: 'gw-timing-aids', label: 'Timing of Aids' },
      { value: 'gw-line-whip-voice', label: 'Line / Whip / Voice Use' },
      { value: 'breathing', label: 'Breathing' },
      { value: 'concentration-focus', label: 'Concentration / Focus' },
      { value: 'gw-reading-horse', label: 'Reading the Horse' }
    ]
  }
];

// Ride arc options (how the ride unfolded over time)
export const RIDE_ARC_OPTIONS = [
  { value: 'consistent', label: 'Consistent throughout', color: '#8B7355' },
  { value: 'built', label: 'Rough start, finished strong', color: '#6B8E5F' },
  { value: 'faded', label: 'Strong start, faded', color: '#C67B5C' },
  { value: 'strengthened', label: 'Started good, kept building', color: '#4A8E3F' },
  { value: 'deteriorated', label: 'Started rough, kept declining', color: '#B84A4A' },
  { value: 'peak', label: 'Strong in the middle', color: '#D4A574' },
  { value: 'valley', label: 'Rough patch, then recovered', color: '#D4A574' },
  { value: 'variable', label: 'All over the place', color: '#9B8EC4' }
];

/**
 * Create a new post-ride debrief
 */
export async function createDebrief(userId, debriefData) {
  return base.create(userId, {
    rideDate: debriefData.rideDate || '',
    horseName: debriefData.horseName || '',
    sessionType: debriefData.sessionType || '',
    sessionModality: debriefData.sessionModality || '',
    overallQuality: debriefData.overallQuality || 5,
    confidenceLevel: debriefData.confidenceLevel || 5,
    riderEffort: debriefData.riderEffort || 5,
    horseEffort: debriefData.horseEffort || 5,
    riderEnergy: debriefData.riderEnergy || '',
    horseEnergy: debriefData.horseEnergy || '',
    mentalState: debriefData.mentalState || '',
    movements: debriefData.movements || [],
    intentionRatings: debriefData.intentionRatings || {},
    processGoal1: debriefData.processGoal1 || '',
    processGoal2: debriefData.processGoal2 || '',
    processGoal3: debriefData.processGoal3 || '',
    prevGoalRatings: debriefData.prevGoalRatings || null,
    wins: debriefData.wins || '',
    ahaRealization: debriefData.ahaRealization || '',
    horseNotices: debriefData.horseNotices || '',
    challenges: debriefData.challenges || '',
    workFocus: debriefData.workFocus || '',
    rideArc: debriefData.rideArc || null,
    rideArcNote: debriefData.rideArcNote || null,
    isDraft: debriefData.isDraft || false
  });
}

/**
 * Get a single debrief
 */
export async function getDebrief(docId) {
  return base.read(docId);
}

/**
 * Get all debriefs for a user (newest first)
 */
export async function getAllDebriefs(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'rideDate',
    orderDirection: 'desc',
    ...options
  });
}

/**
 * Get debriefs for a specific horse
 */
export async function getDebriefsByHorse(userId, horseName) {
  return base.queryByField(userId, 'horseName', '==', horseName);
}

/**
 * Get draft debriefs
 */
export async function getDraftDebriefs(userId) {
  return base.queryByField(userId, 'isDraft', '==', true);
}

/**
 * Update a debrief
 */
export async function updateDebrief(docId, data) {
  return base.update(docId, data);
}

/**
 * Delete a debrief (soft delete)
 */
export async function deleteDebrief(docId) {
  return base.delete(docId);
}
