import { createBaseService } from './baseService';

const COLLECTION = 'physicalAssessments';
const base = createBaseService(COLLECTION);

/**
 * Physical Self-Assessment Service
 *
 * Data model (from physical-self-assessment.html):
 * {
 *   userId:              string  - Firebase Auth UID
 *   occupation:          string  - work and body impact
 *   physicalChallenges:  string  - challenges affecting riding
 *   physicalStrengths:   string  - strengths brought to saddle
 *   asymmetries:         string  - known asymmetries
 *   coachCues:           string  - common physical cues from coach
 *   ptStatus:            string  - "yes" | "no"
 *   ptType:              string  - type of PT/training work (conditional)
 *   ptCues:              string  - cues from PT/trainer (conditional)
 *   kinestheticLevel:    number  - 1-10 awareness slider
 *   dailyTensionAreas:   array   - body parts where daily tension occurs
 *   dailyTensionDetails: string  - additional daily tension details
 *   ridingTensionAreas:  array   - body parts where riding tension occurs
 *   tensionComparison:   string  - how riding vs daily tension differs
 * }
 */

// Body parts for tension grids
export const BODY_PARTS = [
  'Jaw/Face',
  'Neck',
  'Shoulders',
  'Upper Back',
  'Lower Back',
  'Chest',
  'Abdomen/Core',
  'Hips',
  'Thighs',
  'Knees',
  'Calves/Ankles',
  'Hands/Wrists',
  'Arms',
  'Feet'
];

// Kinesthetic awareness descriptions (index = level - 1)
export const KINESTHETIC_DESCRIPTIONS = [
  '"Huh?" - I rarely feel what my body is doing',
  'Very low awareness - I need mirrors or video',
  'Low awareness - Often surprised by feedback',
  'Below average - I catch big things but miss details',
  'Moderate awareness - Sometimes aware, sometimes not',
  'Average - I notice obvious things',
  'Above average - I catch most things eventually',
  'Good awareness - I notice fairly quickly',
  'Very good - I feel most things in real-time',
  '"I feel it all" - Highly attuned to every sensation'
];

export async function createPhysicalAssessment(userId, data) {
  return base.create(userId, {
    occupation: data.occupation || '',
    physicalChallenges: data.physicalChallenges || '',
    physicalStrengths: data.physicalStrengths || '',
    asymmetries: data.asymmetries || '',
    coachCues: data.coachCues || '',
    ptStatus: data.ptStatus || '',
    ptType: data.ptType || '',
    ptCues: data.ptCues || '',
    kinestheticLevel: data.kinestheticLevel || 5,
    dailyTensionAreas: data.dailyTensionAreas || [],
    dailyTensionDetails: data.dailyTensionDetails || '',
    ridingTensionAreas: data.ridingTensionAreas || [],
    tensionComparison: data.tensionComparison || ''
  });
}

export async function getPhysicalAssessment(docId) {
  return base.read(docId);
}

export async function getAllPhysicalAssessments(userId, options = {}) {
  return base.readAll(userId, {
    orderField: 'createdAt',
    orderDirection: 'desc',
    ...options
  });
}

export async function updatePhysicalAssessment(docId, data) {
  return base.update(docId, data);
}

export async function deletePhysicalAssessment(docId) {
  return base.delete(docId);
}
