/**
 * YDJ Data Import Script
 *
 * Imports rider data into Firestore from a JSON file.
 * Uses Firebase Admin SDK (bypasses security rules).
 *
 * Setup:
 *   1. Go to Firebase Console > Project Settings > Service Accounts
 *   2. Click "Generate new private key" and save as scripts/serviceAccountKey.json
 *   3. Create your import file (see scripts/import-template.json for format)
 *
 * Usage:
 *   node scripts/import-data.js <import-file.json> <userId>
 *
 *   - import-file.json: Path to the JSON file with records to import
 *   - userId: The Firebase Auth UID of the user to import data for
 *     (find this in Firebase Console > Authentication > Users)
 *
 * Examples:
 *   node scripts/import-data.js scripts/my-data.json abc123def456
 *   node scripts/import-data.js scripts/import-template.json --dry-run abc123def456
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Valid collections and their required/optional fields ──────────────

const SCHEMAS = {
  debriefs: {
    required: ['rideDate', 'horseName'],
    optional: [
      'sessionType', 'overallQuality', 'confidenceLevel', 'riderEffort',
      'horseEffort', 'riderEnergy', 'horseEnergy', 'mentalState',
      'movements', 'intentionRatings', 'wins', 'ahaRealization',
      'horseNotices', 'challenges', 'workFocus', 'isDraft'
    ],
    enums: {
      sessionType: ['lesson', 'schooling', 'conditioning', 'clinic', 'show-schooling', 'show-test', 'other'],
      riderEnergy: ['low', 'moderate', 'high', 'variable'],
      horseEnergy: ['low', 'moderate', 'high', 'variable', 'tense'],
      mentalState: ['calm', 'focused', 'frustrated', 'uncertain', 'joyful', 'mixed']
    },
    ranges: {
      overallQuality: [1, 10],
      confidenceLevel: [1, 10],
      riderEffort: [1, 10],
      horseEffort: [1, 10]
    }
  },

  reflections: {
    required: ['category', 'mainReflection', 'feeling', 'influence'],
    optional: ['prompt', 'obstacleStrategy'],
    enums: {
      category: ['personal', 'validation', 'aha', 'obstacle', 'connection', 'feel']
    }
  },

  journeyEvents: {
    required: ['category', 'type', 'date', 'description'],
    optional: ['magnitude', 'duration', 'status', 'resolutionDate'],
    enums: {
      type: ['rider', 'horse', 'environment', 'equipment', 'competition', 'financial', 'other'],
      magnitude: ['minor', 'moderate', 'major'],
      duration: ['1-week', '2-4-weeks', '1-3-months', '3-6-months', '6-plus-months', 'ongoing'],
      status: ['active', 'ongoing', 'resolved']
    }
  },

  observations: {
    required: ['date', 'contextType'],
    optional: ['clinicianName', 'pairObserved', 'horseName', 'description', 'observations'],
    enums: {
      contextType: ['clinic', 'trainer-riding', 'schooling', 'show', 'video']
    }
  },

  horseProfiles: {
    required: ['riderName', 'horseName', 'important'],
    optional: [
      'age', 'breed', 'sex', 'partnership', 'horseLevel',
      'arrangement', 'strengths', 'soundness', 'conditions'
    ],
    enums: {
      sex: ['mare', 'gelding', 'stallion'],
      horseLevel: ['beginner', 'training', 'first', 'second', 'third', 'fourth', 'psg', 'inter1', 'inter2', 'gp', 'training-not-showing'],
      arrangement: ['own', 'lease', 'partial-lease', 'catch-ride', 'other'],
      soundness: ['sound', 'managing', 'recovering', 'not-sound']
    },
    ranges: {
      age: [1, 40]
    }
  },

  riderProfiles: {
    required: ['fullName', 'email', 'whyRide'],
    optional: [
      'phone', 'level', 'frequency', 'coach', 'ownership',
      'numHorses', 'enjoyMost', 'devices', 'mobileType', 'consent'
    ],
    enums: {
      level: ['beginning', 'while', 'block'],
      frequency: ['1-2', '3-4', '5-6', '7+'],
      coach: ['weekly', 'biweekly', 'occasional', 'independent'],
      mobileType: ['apple', 'android', 'both', 'neither']
    },
    ranges: {
      numHorses: [1, 20]
    }
  },

  eventPrepPlans: {
    required: ['eventName', 'eventDate', 'eventType'],
    optional: [
      'eventTypeOther', 'location', 'eventDescription', 'horseName',
      'currentLevel', 'targetLevel', 'eventExperience', 'currentChallenges',
      'recentProgress', 'goals', 'concerns', 'ridingFrequency', 'coachAccess',
      'availableResources', 'constraints', 'additionalInfo', 'preferredCoach',
      'generatedPlan', 'equipmentList', 'prepTasks', 'status'
    ],
    enums: {
      eventType: ['show', 'clinic', 'new-trainer', 'evaluation', 'demo', 'other'],
      eventExperience: ['first-time', 'some-experience', 'regular'],
      ridingFrequency: ['1-2', '3-4', '5-6', '7'],
      coachAccess: ['weekly', 'biweekly', 'monthly', 'occasional', 'none'],
      preferredCoach: ['', 'klaus', 'jordan', 'emma'],
      status: ['planning', 'confirmed', 'completed', 'cancelled']
    }
  },

  physicalAssessments: {
    required: [],
    optional: [
      'occupation', 'physicalChallenges', 'physicalStrengths', 'asymmetries',
      'coachCues', 'ptStatus', 'ptType', 'ptCues', 'kinestheticLevel',
      'dailyTensionAreas', 'dailyTensionDetails', 'ridingTensionAreas',
      'tensionComparison'
    ],
    enums: {
      ptStatus: ['yes', 'no']
    },
    ranges: {
      kinestheticLevel: [1, 10]
    }
  },

  riderAssessments: {
    required: [
      'bestWhen', 'bestFeelings', 'bestDialogue',
      'losingWhen', 'losingFeelings', 'losingDialogue',
      'lostWhen', 'lostFeelings', 'lostDialogue',
      'roleModels', 'roleModelQualities', 'biggestChallenge',
      'challengeResolution', 'greatestPerformance', 'performanceFactors',
      'energizers', 'relaxers'
    ],
    optional: [
      'currentStrengths', 'growthAreas',
      'positionAndSeat', 'aidsAndCommunication', 'feelAndTiming',
      'knowledgeAndUnderstanding', 'mentalGame'
    ],
    ranges: {
      positionAndSeat: [1, 10],
      aidsAndCommunication: [1, 10],
      feelAndTiming: [1, 10],
      knowledgeAndUnderstanding: [1, 10],
      mentalGame: [1, 10]
    }
  }
};

// ─── Validation ─────────────────────────────────────────────────────────

function validateRecord(record, index) {
  const errors = [];
  const warnings = [];

  if (!record.collection) {
    errors.push(`Record ${index}: Missing "collection" field`);
    return { errors, warnings };
  }

  const schema = SCHEMAS[record.collection];
  if (!schema) {
    errors.push(`Record ${index}: Unknown collection "${record.collection}". Valid: ${Object.keys(SCHEMAS).join(', ')}`);
    return { errors, warnings };
  }

  // Check required fields
  for (const field of schema.required) {
    if (record[field] === undefined || record[field] === null || record[field] === '') {
      errors.push(`Record ${index} (${record.collection}): Missing required field "${field}"`);
    }
  }

  // Check for unknown fields
  const allKnown = new Set([...schema.required, ...schema.optional, 'collection']);
  for (const key of Object.keys(record)) {
    if (!allKnown.has(key)) {
      warnings.push(`Record ${index} (${record.collection}): Unknown field "${key}" will be ignored`);
    }
  }

  // Validate enum values
  if (schema.enums) {
    for (const [field, validValues] of Object.entries(schema.enums)) {
      if (record[field] !== undefined && record[field] !== null && record[field] !== '') {
        if (Array.isArray(record[field])) {
          for (const val of record[field]) {
            if (!validValues.includes(val)) {
              errors.push(`Record ${index} (${record.collection}): Invalid value "${val}" for "${field}". Valid: ${validValues.join(', ')}`);
            }
          }
        } else if (!validValues.includes(record[field])) {
          errors.push(`Record ${index} (${record.collection}): Invalid value "${record[field]}" for "${field}". Valid: ${validValues.join(', ')}`);
        }
      }
    }
  }

  // Validate numeric ranges
  if (schema.ranges) {
    for (const [field, [min, max]] of Object.entries(schema.ranges)) {
      if (record[field] !== undefined && record[field] !== null) {
        const num = Number(record[field]);
        if (isNaN(num) || num < min || num > max) {
          errors.push(`Record ${index} (${record.collection}): "${field}" must be a number between ${min} and ${max}, got "${record[field]}"`);
        }
      }
    }
  }

  return { errors, warnings };
}

function buildDocument(record) {
  const schema = SCHEMAS[record.collection];
  const doc = {};
  const allFields = [...schema.required, ...schema.optional];

  for (const field of allFields) {
    if (record[field] !== undefined) {
      doc[field] = record[field];
    }
  }

  return doc;
}

// ─── Main ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filteredArgs = args.filter(a => a !== '--dry-run');

  if (filteredArgs.length < 2) {
    console.log('Usage: node scripts/import-data.js [--dry-run] <import-file.json> <userId>');
    console.log('');
    console.log('  --dry-run    Validate data without writing to Firestore');
    console.log('  import-file  Path to JSON file with records to import');
    console.log('  userId       Firebase Auth UID of the target user');
    process.exit(1);
  }

  const [importFile, userId] = filteredArgs;

  const keyPath = resolve(__dirname, 'serviceAccountKey.json');

  // Load import data
  const importPath = resolve(importFile);
  if (!existsSync(importPath)) {
    console.error(`ERROR: Import file not found: ${importPath}`);
    process.exit(1);
  }

  let records;
  try {
    const raw = readFileSync(importPath, 'utf-8');
    records = JSON.parse(raw);
  } catch (err) {
    console.error(`ERROR: Failed to parse import file: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(records)) {
    records = [records];
  }

  console.log(`\nFound ${records.length} record(s) to import for user: ${userId}`);
  if (dryRun) console.log('  (DRY RUN - no data will be written)\n');
  else console.log('');

  // Validate all records first
  let allErrors = [];
  let allWarnings = [];

  for (let i = 0; i < records.length; i++) {
    const { errors, warnings } = validateRecord(records[i], i + 1);
    allErrors = allErrors.concat(errors);
    allWarnings = allWarnings.concat(warnings);
  }

  // Print warnings
  if (allWarnings.length > 0) {
    console.log('WARNINGS:');
    allWarnings.forEach(w => console.log(`  ⚠ ${w}`));
    console.log('');
  }

  // Print errors and abort if any
  if (allErrors.length > 0) {
    console.log('ERRORS (must fix before importing):');
    allErrors.forEach(e => console.log(`  ✗ ${e}`));
    console.log(`\n${allErrors.length} error(s) found. Fix these and try again.`);
    process.exit(1);
  }

  console.log('Validation passed!\n');

  if (dryRun) {
    // Show what would be imported
    const summary = {};
    for (const record of records) {
      summary[record.collection] = (summary[record.collection] || 0) + 1;
    }
    console.log('Would import:');
    for (const [col, count] of Object.entries(summary)) {
      console.log(`  ${col}: ${count} record(s)`);
    }
    console.log('\nDry run complete. Remove --dry-run to import for real.');
    process.exit(0);
  }

  // Initialize Firebase Admin (only needed for actual writes)
  if (!existsSync(keyPath)) {
    console.error('ERROR: Service account key not found at scripts/serviceAccountKey.json');
    console.error('');
    console.error('To create one:');
    console.error('  1. Go to Firebase Console > Project Settings > Service Accounts');
    console.error('  2. Click "Generate new private key"');
    console.error('  3. Save the file as scripts/serviceAccountKey.json');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  // Import records
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const doc = buildDocument(record);

    try {
      const docRef = await db.collection(record.collection).add({
        userId,
        ...doc,
        isDeleted: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      const label = record.horseName || record.eventName || record.category || record.rideDate || '';
      console.log(`  ✓ ${record.collection} → ${docRef.id}${label ? ` (${label})` : ''}`);
      successCount++;
    } catch (err) {
      console.log(`  ✗ Record ${i + 1} (${record.collection}): ${err.message}`);
      failCount++;
    }
  }

  console.log(`\nDone! ${successCount} imported, ${failCount} failed.`);
  process.exit(failCount > 0 ? 1 : 0);
}

main();
