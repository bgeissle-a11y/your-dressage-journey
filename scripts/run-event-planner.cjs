/**
 * Run Event Planner for a specific event prep plan.
 *
 * Calls the handler function directly using Firebase Admin SDK
 * (bypasses httpsCallable auth since we're server-side with service account).
 *
 * Usage:
 *   node scripts/run-event-planner.cjs <eventPrepPlanId> <userId>
 *
 * Example:
 *   node scripts/run-event-planner.cjs dfbAFPGJJ3BKog0gaJhO HwwKk5C7qZh1Bn0KYalPYIZWHmj2
 */

const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

// Load ANTHROPIC_API_KEY from Firebase secrets (if not already in env)
if (!process.env.ANTHROPIC_API_KEY) {
  try {
    const key = execSync("npx firebase functions:secrets:access ANTHROPIC_API_KEY", {
      cwd: path.join(__dirname, ".."),
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    process.env.ANTHROPIC_API_KEY = key;
    console.log("Loaded ANTHROPIC_API_KEY from Firebase secrets.");
  } catch (e) {
    console.error("Could not load ANTHROPIC_API_KEY. Set it in your environment or run: firebase functions:secrets:access ANTHROPIC_API_KEY");
    process.exit(1);
  }
}

// Firebase Admin init — must happen BEFORE requiring the handler.
// The functions/lib/firebase.js module calls initializeApp() at import time.
// We override it by setting GOOGLE_APPLICATION_CREDENTIALS so the default
// initializeApp() picks up our service account automatically.
const saPath = path.join(__dirname, "serviceAccountKey.json");
process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;

// Also set the project ID explicitly
const sa = require(saPath);
process.env.GCLOUD_PROJECT = sa.project_id;
process.env.GCP_PROJECT = sa.project_id;

// Now require the handler — functions/lib/firebase.js will auto-detect credentials
const { handler } = require("../functions/api/eventPlanner");

async function main() {
  const eventPrepPlanId = process.argv[2];
  const userId = process.argv[3];

  if (!eventPrepPlanId || !userId) {
    console.error("Usage: node scripts/run-event-planner.cjs <eventPrepPlanId> <userId>");
    process.exit(1);
  }

  console.log(`\n🐴 Running Event Planner for:`);
  console.log(`  Event Prep Plan ID: ${eventPrepPlanId}`);
  console.log(`  User ID: ${userId}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log("");

  // Simulate a Firebase v2 onCall request
  const mockRequest = {
    auth: { uid: userId },
    data: {
      eventPrepPlanId,
      forceRefresh: true, // Always fresh on manual run
    },
  };

  const startTime = Date.now();

  try {
    const result = await handler(mockRequest);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅ Event Planner completed in ${elapsed}s`);
    console.log(`  Success: ${result.success}`);
    console.log(`  From Cache: ${result.fromCache}`);
    console.log(`  Data Tier: ${result.dataTier}`);
    console.log(`  Generated At: ${result.generatedAt}`);

    // Summary of each call's output
    if (result.testRequirements) {
      const tr = result.testRequirements;
      console.log(`\n--- EP-1: Test Requirements ---`);
      console.log(`  Target Level: ${tr.target_level}`);
      console.log(`  Tests: ${(tr.tests || []).length}`);
      if (tr.level_context) {
        console.log(`  Judges Expect: ${(tr.level_context.what_judges_expect || "").substring(0, 100)}...`);
      }
    }

    if (result.readinessAnalysis) {
      const ra = result.readinessAnalysis;
      console.log(`\n--- EP-2: Readiness Analysis ---`);
      console.log(`  Score: ${ra.readiness_score}/100 — ${ra.readiness_label}`);
      console.log(`  Assessment: ${(ra.overall_assessment || "").substring(0, 150)}...`);
      console.log(`  Strengths: ${(ra.strengths || []).length}`);
      console.log(`  Gaps: ${(ra.gaps || []).length}`);
      if (ra.principles_health) {
        const ph = ra.principles_health;
        console.log(`  Principles: R=${ph.relaxation?.status} F=${ph.forwardness?.status} C=${ph.trust_in_hand?.status}`);
      }
    }

    if (result.preparationPlan) {
      const pp = result.preparationPlan;
      console.log(`\n--- EP-3: Preparation Plan ---`);
      console.log(`  Weeks: ${pp.total_weeks}`);
      console.log(`  Plan Type: ${pp.plan_type}`);
      console.log(`  Summary: ${(pp.plan_summary || "").substring(0, 150)}...`);
    }

    if (result.showDayGuidance) {
      const sd = result.showDayGuidance;
      console.log(`\n--- EP-4: Show-Day Guidance ---`);
      console.log(`  Timeline Events: ${(sd.timeline || []).length}`);
      console.log(`  Contingency Plans: ${(sd.contingency_plans || []).length}`);
      console.log(`  Summary: ${(sd.show_day_summary || "").substring(0, 150)}...`);
    }

    // Save full output to file
    const outputPath = path.join(__dirname, `event-planner-output-${eventPrepPlanId.substring(0, 8)}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Full output saved to: ${outputPath}`);

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n❌ Event Planner failed after ${elapsed}s`);
    console.error(`  Error: ${error.message}`);
    if (error.code) console.error(`  Code: ${error.code}`);
    if (error.details) console.error(`  Details: ${error.details}`);
    process.exit(1);
  }
}

main().then(() => process.exit(0));
