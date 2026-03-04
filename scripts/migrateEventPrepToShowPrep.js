/**
 * One-Time Migration: eventPrepPlans → showPreparations
 *
 * Reads all documents from eventPrepPlans and writes mapped versions
 * to showPreparations. Does NOT delete originals.
 *
 * Setup:
 *   Requires scripts/serviceAccountKey.json (Firebase Admin credentials)
 *
 * Usage:
 *   node scripts/migrateEventPrepToShowPrep.js          # dry run (default)
 *   node scripts/migrateEventPrepToShowPrep.js --commit  # actually write data
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
const serviceAccountPath = resolve(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const isDryRun = !process.argv.includes('--commit');

/**
 * Map an eventPrepPlan document to the showPreparations schema.
 */
function mapToShowPrep(doc) {
  const data = doc.data();

  // Extract first horse's data (multi-horse → single-horse)
  const horse = (data.horses && data.horses.length > 0) ? data.horses[0] : {};

  // Map event type to show type
  let showType = 'recognized';
  let showTypeOther = '';
  if (data.eventType === 'show') {
    showType = 'recognized';
  } else if (data.eventType === 'schooling-show') {
    showType = 'schooling';
  } else {
    showType = 'other';
    showTypeOther = data.eventType || '';
  }

  return {
    // Core identifiers
    userId: data.userId,
    isDeleted: data.isDeleted || false,

    // Show details
    showName: data.eventName || '',
    showDuration: 'single',
    showDateStart: data.eventDate || '',
    showDateEnd: null,
    showType,
    showTypeOther,
    showLocation: data.location || '',

    // Horse (flattened from first horse)
    horseName: horse.horseName || data.horseName || '',
    currentLevel: horse.currentLevel || data.currentLevel || '',
    showExperience: horse.experience || data.eventExperience || '',
    currentChallenges: horse.challenges || data.currentChallenges || '',
    recentProgress: horse.progress || data.recentProgress || '',

    // Tests (new — not available in old data)
    testType: 'standard',
    testsSelected: [],

    // Goals & Concerns (from first horse or top-level)
    goals: horse.goals || data.goals || [],
    concerns: horse.concerns || data.concerns || [],

    // Resources
    ridingFrequency: data.ridingFrequency || '',
    coachAccess: data.coachAccess || '',
    availableResources: data.availableResources || [],
    constraints: data.constraints || '',
    additionalInfo: data.additionalInfo || '',

    // AI output (preserve any generated plan reference)
    generatedPlan: data.generatedPlan || null,

    // Status mapping: planning/confirmed → draft/active
    status: data.status === 'planning' ? 'draft'
          : data.status === 'confirmed' ? 'active'
          : data.status === 'completed' ? 'completed'
          : 'draft',

    // Metadata
    formVersion: 'show-prep-v1-migrated',
    migratedFrom: doc.id,
    createdAt: data.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function migrate() {
  console.log(`\n=== Event Prep → Show Prep Migration ${isDryRun ? '(DRY RUN)' : '(COMMIT MODE)'} ===\n`);

  // Fetch all eventPrepPlans
  const snapshot = await db.collection('eventPrepPlans').get();
  console.log(`Found ${snapshot.size} eventPrepPlan document(s)\n`);

  if (snapshot.empty) {
    console.log('Nothing to migrate.');
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const label = `[${doc.id}] "${data.eventName || 'unnamed'}" (user: ${data.userId})`;

    // Skip soft-deleted
    if (data.isDeleted) {
      console.log(`  SKIP (deleted): ${label}`);
      skipped++;
      continue;
    }

    const showPrepData = mapToShowPrep(doc);

    console.log(`  MIGRATE: ${label}`);
    console.log(`    → showName: "${showPrepData.showName}"`);
    console.log(`    → showType: ${showPrepData.showType}`);
    console.log(`    → horseName: "${showPrepData.horseName}"`);
    console.log(`    → status: ${data.status} → ${showPrepData.status}`);
    console.log(`    → goals: ${showPrepData.goals.length}, concerns: ${showPrepData.concerns.length}`);

    if (!isDryRun) {
      const newRef = await db.collection('showPreparations').add(showPrepData);
      console.log(`    ✓ Created showPreparations/${newRef.id}`);
    }

    migrated++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Total:    ${snapshot.size}`);

  if (isDryRun) {
    console.log(`\nThis was a dry run. Run with --commit to write data.`);
  } else {
    console.log(`\nMigration complete. Original eventPrepPlans left intact.`);
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
