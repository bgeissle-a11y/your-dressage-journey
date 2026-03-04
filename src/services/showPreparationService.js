import { createBaseService } from './baseService';

const COLLECTION = 'showPreparations';
const base = createBaseService(COLLECTION);

/**
 * Show Preparation Service
 *
 * Helps riders plan and prepare for dressage shows with structured
 * preparation tracking, test selection, and AI-generated plans.
 *
 * Data model (matches show-preparation-form.html):
 * {
 *   userId:             string  - Firebase Auth UID
 *
 *   // Show Details
 *   showName:           string  - required
 *   showDuration:       string  - "single" | "multi"
 *   showDateStart:      string  - required, ISO date
 *   showDateEnd:        string|null - only when showDuration === "multi"
 *   showType:           string  - "recognized" | "schooling" | "other"
 *   showTypeOther:      string|null - only when showType === "other"
 *   showLocation:       string|null
 *
 *   // Tests
 *   testType:           string  - "standard" | "freestyle"
 *   testsSelected:      array   - test IDs, up to 6 standard or 2 freestyle
 *
 *   // Horse (single)
 *   horseName:          string  - required, from horse profiles
 *   currentLevel:       string  - required, current dressage level
 *   showExperience:     string  - "first-time" | "some-experience" | "regular"
 *   currentChallenges:  string|null
 *   recentProgress:     string|null
 *
 *   // Goals & Concerns
 *   goals:              array   - [string] up to 3, first required
 *   concerns:           array   - [string] up to 3, all optional
 *
 *   // Resources
 *   ridingFrequency:    string  - "1-2" | "3-4" | "5-6" | "7"
 *   coachAccess:        string  - "weekly" | "biweekly" | "monthly" | "occasional" | "none"
 *   availableResources: array   - ["mirrors", "video", "ground-person", "show-facility"]
 *   constraints:        string|null
 *
 *   // Additional
 *   additionalInfo:     string|null
 *
 *   // Generated plan (AI integration)
 *   generatedPlan:      object|null
 *
 *   // Status
 *   status:             string  - "draft" | "active" | "completed"
 *   formVersion:        string  - "show-prep-v1"
 * }
 */

// --- Constants ---

export const SHOW_TYPES = [
  { value: 'recognized', label: 'Recognized' },
  { value: 'schooling', label: 'Schooling' },
  { value: 'other', label: 'Other' }
];

export const SHOW_EXPERIENCE_LEVELS = [
  { value: 'first-time', label: 'First time showing together' },
  { value: 'some-experience', label: 'Some experience' },
  { value: 'regular', label: 'Regular show partners' }
];

export const SHOW_PREP_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' }
];

export const RIDING_FREQUENCIES = [
  { value: '1-2', label: '1-2 days/week' },
  { value: '3-4', label: '3-4 days/week' },
  { value: '5-6', label: '5-6 days/week' },
  { value: '7', label: '7 days/week' }
];

export const COACH_ACCESS_OPTIONS = [
  { value: 'weekly', label: 'Weekly lessons' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'occasional', label: 'Occasional' },
  { value: 'none', label: 'Self-training' }
];

export const AVAILABLE_RESOURCES = [
  { value: 'mirrors', label: 'Mirrors in arena' },
  { value: 'video', label: 'Video capability' },
  { value: 'ground-person', label: 'Ground person/eyes on the ground' },
  { value: 'show-facility', label: 'Can school at the show venue' }
];

// Test display names — maps test IDs to human-readable names
export const TEST_DISPLAY_NAMES = {
  intro_a: 'Intro \u2014 Test A',
  intro_b: 'Intro \u2014 Test B',
  intro_c: 'Intro \u2014 Test C',
  training_1: 'Training Level \u2014 Test 1',
  training_2: 'Training Level \u2014 Test 2',
  training_3: 'Training Level \u2014 Test 3',
  first_1: 'First Level \u2014 Test 1',
  first_2: 'First Level \u2014 Test 2',
  first_3: 'First Level \u2014 Test 3',
  second_1: 'Second Level \u2014 Test 1',
  second_2: 'Second Level \u2014 Test 2',
  second_3: 'Second Level \u2014 Test 3',
  third_1: 'Third Level \u2014 Test 1',
  third_2: 'Third Level \u2014 Test 2',
  third_3: 'Third Level \u2014 Test 3',
  fourth_1: 'Fourth Level \u2014 Test 1',
  fourth_2: 'Fourth Level \u2014 Test 2',
  fourth_3: 'Fourth Level \u2014 Test 3',
  psg: 'FEI \u2014 Prix St. Georges',
  inter_1: 'FEI \u2014 Intermediate I',
  inter_2: 'FEI \u2014 Intermediate II',
  grand_prix: 'FEI \u2014 Grand Prix',
  gp_special: 'FEI \u2014 Grand Prix Special',
  fs_training: 'Training Level Freestyle',
  fs_first: 'First Level Freestyle',
  fs_second: 'Second Level Freestyle',
  fs_third: 'Third Level Freestyle',
  fs_fourth: 'Fourth Level Freestyle',
};

// Standard test options (for select dropdowns)
export const STANDARD_TESTS = [
  { value: '', label: '\u2014 Select a test \u2014' },
  { value: 'intro_a', label: 'Intro \u2014 Test A' },
  { value: 'intro_b', label: 'Intro \u2014 Test B' },
  { value: 'intro_c', label: 'Intro \u2014 Test C' },
  { value: 'training_1', label: 'Training Level \u2014 Test 1' },
  { value: 'training_2', label: 'Training Level \u2014 Test 2' },
  { value: 'training_3', label: 'Training Level \u2014 Test 3' },
  { value: 'first_1', label: 'First Level \u2014 Test 1' },
  { value: 'first_2', label: 'First Level \u2014 Test 2' },
  { value: 'first_3', label: 'First Level \u2014 Test 3' },
  { value: 'second_1', label: 'Second Level \u2014 Test 1' },
  { value: 'second_2', label: 'Second Level \u2014 Test 2' },
  { value: 'second_3', label: 'Second Level \u2014 Test 3' },
  { value: 'third_1', label: 'Third Level \u2014 Test 1' },
  { value: 'third_2', label: 'Third Level \u2014 Test 2' },
  { value: 'third_3', label: 'Third Level \u2014 Test 3' },
  { value: 'fourth_1', label: 'Fourth Level \u2014 Test 1' },
  { value: 'fourth_2', label: 'Fourth Level \u2014 Test 2' },
  { value: 'fourth_3', label: 'Fourth Level \u2014 Test 3' },
  { value: 'psg', label: 'FEI \u2014 Prix St. Georges' },
  { value: 'inter_1', label: 'FEI \u2014 Intermediate I' },
  { value: 'inter_2', label: 'FEI \u2014 Intermediate II' },
  { value: 'grand_prix', label: 'FEI \u2014 Grand Prix' },
  { value: 'gp_special', label: 'FEI \u2014 Grand Prix Special' },
];

// Freestyle test options
export const FREESTYLE_TESTS = [
  { value: '', label: '\u2014 Select a freestyle \u2014' },
  { value: 'fs_training', label: 'Training Level Freestyle' },
  { value: 'fs_first', label: 'First Level Freestyle' },
  { value: 'fs_second', label: 'Second Level Freestyle' },
  { value: 'fs_third', label: 'Third Level Freestyle' },
  { value: 'fs_fourth', label: 'Fourth Level Freestyle' },
];

// --- Helper ---

/**
 * Resolve test IDs to human-readable display names.
 */
export function resolveTestNames(testIds) {
  if (!testIds || !Array.isArray(testIds)) return [];
  return testIds.map(id => TEST_DISPLAY_NAMES[id] || id);
}

// --- CRUD ---

/**
 * Create a new show preparation plan
 */
export async function createShowPreparation(userId, planData) {
  return base.create(userId, {
    // Show Details
    showName: planData.showName || '',
    showDuration: planData.showDuration || 'single',
    showDateStart: planData.showDateStart || '',
    showDateEnd: planData.showDateEnd || null,
    showType: planData.showType || '',
    showTypeOther: planData.showTypeOther || null,
    showLocation: planData.showLocation || null,

    // Tests
    testType: planData.testType || 'standard',
    testsSelected: planData.testsSelected || [],

    // Horse (single)
    horseName: planData.horseName || '',
    currentLevel: planData.currentLevel || '',
    showExperience: planData.showExperience || '',
    currentChallenges: planData.currentChallenges || null,
    recentProgress: planData.recentProgress || null,

    // Goals & Concerns
    goals: planData.goals || [],
    concerns: planData.concerns || [],

    // Resources
    ridingFrequency: planData.ridingFrequency || '',
    coachAccess: planData.coachAccess || '',
    availableResources: planData.availableResources || [],
    constraints: planData.constraints || null,

    // Additional
    additionalInfo: planData.additionalInfo || null,

    // Generated plan (AI)
    generatedPlan: null,

    // Status & version
    status: planData.status || 'draft',
    formVersion: 'show-prep-v1'
  });
}

/**
 * Get a single show preparation plan
 */
export async function getShowPreparation(docId) {
  return base.read(docId);
}

/**
 * Get all show preparations for a user (by show date, upcoming first)
 */
export async function getAllShowPreparations(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'showDateStart',
    orderDirection: 'asc',
    ...options
  });
}

/**
 * Get upcoming shows (status is draft or active)
 */
export async function getUpcomingShows(userId) {
  return base.queryByField(userId, 'status', 'in', ['draft', 'active']);
}

/**
 * Get completed shows
 */
export async function getCompletedShows(userId) {
  return base.queryByField(userId, 'status', '==', 'completed');
}

/**
 * Update a show preparation plan
 */
export async function updateShowPreparation(docId, data) {
  return base.update(docId, data);
}

/**
 * Delete a show preparation plan (soft delete)
 */
export async function deleteShowPreparation(docId) {
  return base.delete(docId);
}
