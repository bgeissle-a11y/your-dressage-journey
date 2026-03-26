/**
 * Readiness Snapshot API
 *
 * Generates a 300–400 word narrative readiness assessment for a show plan.
 * Written in The Technical Coach voice with a single Empathetic Coach closing.
 *
 * Fired once at plan creation, refreshable once (gated on 3+ new debriefs).
 *
 * Input:  { planId: string, refresh?: boolean }
 * Output: { success, narrative, generatedAt }
 */

const { HttpsError } = require("firebase-functions/v2/https");
const { validateAuth } = require("../lib/auth");
const { wrapError } = require("../lib/errors");
const { prepareRiderData } = require("../lib/prepareRiderData");
const { callClaude } = require("../lib/claudeCall");
const { inferLevelFromTests } = require("../lib/testDatabase");
const { db } = require("../lib/firebase");
const { FieldValue } = require("firebase-admin/firestore");

/**
 * Format selected tests for prompt insertion.
 */
function formatTestsForPrompt(selectedTests) {
  return selectedTests.map(t => {
    const coeffLine = t.coefficients.length > 0
      ? `  Coefficient movements (×2): ${t.coefficients.map(c => c.movement || c.label || c).join(', ')}`
      : `  Coefficient movements: None at this level`;

    const flagLine = t.hasFlaggedConcerns
      ? `  Rider flagged concerns: ${t.flaggedMovements.map(m => m.text || m).join(', ')}`
        + (t.hasCoeffConcerns
          ? `\n  ⚠ Flagged items that are also coefficient movements: ${t.flaggedCoeffMovements.join(', ')}`
          : '')
      : `  Rider flagged concerns: None`;

    const freestyleLine = t.isFreestyle
      ? `  Type: FREESTYLE — evaluate eligibility, compulsory elements, and music status`
      : `  Type: Standard test`;

    return [
      `${t.label} (${t.org} · ${t.level})`,
      freestyleLine,
      `  Level standard: ${t.levelTruth || 'See test database'}`,
      coeffLine,
      flagLine,
    ].join('\n');
  }).join('\n\n');
}

/**
 * Build the readiness snapshot system prompt.
 */
function buildReadinessSnapshotPrompt(ctx) {
  const testsBlock = formatTestsForPrompt(ctx.selectedTests);

  const multiTestNote = ctx.hasMultipleTests
    ? `The rider has entered ${ctx.selectedTests.length} tests. Where preparation overlaps, note it. Where the tests make meaningfully different demands on this horse or rider, address each on its own terms — do not blend or conflate them.`
    : '';

  const freestyleBlock = ctx.hasFreestyle ? `
FREESTYLE EVALUATION RULES (applies to any freestyle test listed above):
A freestyle must be evaluated by different criteria than a standard test.
Readiness requires ALL of the following:
- A confirmed qualifying score of 63% or higher from a prior licensed competition at
  or above the declared freestyle level (scores from the same show do not count)
- All compulsory elements for the declared level confirmed in training
- No compulsory element appearing frequently as a challenge in recent debriefs
- A music program in development or finalized
Assess each of these criteria from the rider data provided.
Never recommend choreography that includes movements forbidden at the declared level.
Never recommend entering a freestyle class without confirming eligibility.
` : '';

  const patternsBlock = ctx.patterns.length > 0
    ? `RIDER TRAINING PATTERNS (pre-processed from recent debriefs):\n${ctx.patterns.map(p => `- ${p}`).join('\n')}`
    : `RIDER TRAINING PATTERNS: Insufficient data — fewer than 5 debriefs logged. Note this honestly and calibrate the assessment accordingly.`;

  const clinicBlock = ctx.clinicInsights.length > 0
    ? `RECENT TRAINER FEEDBACK (last 3 lesson note takeaways):\n${ctx.clinicInsights.map(c => `- ${c}`).join('\n')}`
    : '';

  return `You are The Technical Coach for Your Dressage Journey — a biomechanics specialist who sees riding as a conversation between two bodies in motion. Your catchphrase is "Did you feel that?" Your tone is clear, specific, and honest — cause and effect. You respect the rider's intelligence. You do not over-praise, but you are never discouraging.

You are writing a Readiness Snapshot for ${ctx.riderName} preparing ${ctx.horseName} for ${ctx.showName} in ${ctx.daysOut} days (${ctx.showDate}).

${multiTestNote}

SELECTED TESTS:
${testsBlock}

${patternsBlock}

${clinicBlock}
${freestyleBlock}
GUARDRAIL RULES — follow these without exception:

LANGUAGE:
Use precise dressage terminology throughout. Prohibited terms: "course walk," "course," "fences," "jumps," "judge's box," or any showjumping/eventing vocabulary. Say "test review" or "arena familiarization" (not "course walk"). Say "judging booth" or "judge at C" (not "judge's box"). Use the horse's name — never "your horse."

PREPARATION FRAMING:
When naming preparation priorities, steer toward targeted movement work — isolating and varying specific movements in different parts of the arena. Never suggest or imply riding through the full test more than 3 times total before the event (cumulative across all contexts including schooling shows). If a schooling show is relevant, present it as a valuable option if accessible — not a required step. Frame the work as: school the movements, not the sequence.

LEVEL INTEGRITY:
Ground your assessment in what each test actually demands at its specific level. Do not reference movements that belong to other levels. A Training Level rider should hear about rhythm and contact — not collection. An Inter I rider should hear about pirouette quality and tempi — not piaffe. If multiple tests are at different levels, address each on its own terms.

SCORING HONESTY:
If flagged concerns intersect with coefficient movements, name that intersection and its scoring consequence explicitly. The rider should understand that a weak coefficient movement costs double. Never say "you're ready" or "you're not ready" — describe what IS and what NEEDS attention. The platform benchmark for level readiness is 65%; reference it only if directly relevant to this rider's situation.

STRUCTURE — write as flowing narrative prose. No headers. No bullet points. No numbered lists.

Paragraph 1: Open with the honest picture. Where is this partnership right now relative to what these tests ask for? Name ${ctx.horseName} by name. Name 1–2 genuine strengths that the training data actually supports — be specific, not generic. "Good rhythm" is not specific. "Consistent 7s on the extended trot on the left rein" is specific.

Paragraph 2 (or 2–3 if multiple tests with different demands): Name the priority gaps — the specific places where the work between now and ${ctx.showDate} will matter most. If any flagged concerns are also coefficient movements, name the scoring weight directly. If the rider has entered multiple tests, note where one test's demands compound or diverge from the other.

Final sentence only: Switch briefly to The Empathetic Coach voice — one warm, personal sentence grounded in something the training data reveals about this rider's relationship with their horse or their pattern of preparing. Not cheerleading. Not generic encouragement. Something true that only this rider's data would produce.

300–400 words total. Flowing prose only. Do not mention that you are an AI.`;
}

/**
 * Build context for the readiness snapshot from rider data and plan doc.
 */
function buildSnapshotContext(planDoc, riderData, flagState) {
  const testsSelected = planDoc.selectedTests ||
    (planDoc.testsSelected) ||
    (planDoc.tests && planDoc.tests.selected) ||
    [planDoc.testId].filter(Boolean);
  const testType = planDoc.testType || (planDoc.tests && planDoc.tests.type) || 'standard';

  // Build a lookup from the show prep doc's concerns.flaggedByTest array
  // This has pre-structured flag data from the Show Prep Form submission
  const flagsByTestLookup = {};
  if (planDoc.concerns && planDoc.concerns.flaggedByTest) {
    for (const entry of planDoc.concerns.flaggedByTest) {
      flagsByTestLookup[entry.testId] = entry;
    }
  }

  // Test label lookup from the ALL_TESTS-style data
  const TEST_LABELS = {
    psg: { label: 'FEI — Prix St. Georges', shortLabel: 'PSG', org: 'FEI' },
    inter_1: { label: 'FEI — Intermediate I', shortLabel: 'Inter I', org: 'FEI' },
    inter_2: { label: 'FEI — Intermediate II', shortLabel: 'Inter II', org: 'FEI' },
    grand_prix: { label: 'FEI — Grand Prix', shortLabel: 'GP', org: 'FEI' },
    gp_special: { label: 'FEI — Grand Prix Special', shortLabel: 'GPS', org: 'FEI' },
  };

  const selectedTests = testsSelected.map(testId => {
    const isFreestyle = testType === 'freestyle';
    const meta = TEST_LABELS[testId] || {};
    const isFei = testId.startsWith('psg') || testId.startsWith('inter') || testId.startsWith('grand') || testId.startsWith('gp');

    // Get flags from stored concerns data OR from testFlags sub-collection
    const storedFlags = flagsByTestLookup[testId];
    const flaggedItems = storedFlags
      ? (storedFlags.flaggedItems || [])
      : Object.keys(flagState[testId] || {}).filter(k => flagState[testId][k]).map(id => ({ id, text: id }));
    const flaggedCoeffItems = storedFlags
      ? (storedFlags.doubleCoeffFlags || [])
      : [];

    return {
      testId,
      label:         (storedFlags && storedFlags.testLabel) || meta.label || testId,
      org:           meta.org || (isFei ? 'FEI' : 'USDF'),
      level:         meta.shortLabel || inferLevelFromTests([testId]) || 'unknown',
      levelCategory: isFei ? 'fei' : 'national',
      isFreestyle,
      levelTruth:    null, // not available server-side — prompt still functions without it
      coefficients:  [], // will be empty unless we add server-side test data lookup
      flaggedMovements:    flaggedItems.map(i => typeof i === 'string' ? { text: i } : i),
      flaggedCoeffMovements: flaggedCoeffItems.map(i => typeof i === 'string' ? i : i.text || i),
      hasFlaggedConcerns:  flaggedItems.length > 0,
      hasCoeffConcerns:    flaggedCoeffItems.length > 0,
    };
  });

  const hasMultipleTests = selectedTests.length > 1;
  const hasFreestyle = selectedTests.some(t => t.isFreestyle);

  // Format show date
  const showDateRaw = planDoc.showDateStart || planDoc.showDate || '';
  const showDateFormatted = showDateRaw
    ? new Date(showDateRaw + (showDateRaw.includes('T') ? '' : 'T00:00:00'))
        .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'TBD';

  const daysOut = showDateRaw
    ? Math.ceil((new Date(showDateRaw + (showDateRaw.includes('T') ? '' : 'T00:00:00')) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  // Extract rider patterns and clinic insights from prepared data
  const patterns = [];
  const clinicInsights = [];

  // Pull pattern summaries from rideHistory aggregator
  if (riderData.rideHistory) {
    const rh = riderData.rideHistory;
    if (rh.recentPatterns) patterns.push(...rh.recentPatterns);
    if (rh.challengePatterns) patterns.push(...rh.challengePatterns);
    if (rh.strengthPatterns) patterns.push(...rh.strengthPatterns);
  }

  // Pull clinic insights from lesson notes
  if (riderData.lessonNotes) {
    const ln = riderData.lessonNotes;
    if (ln.recentTakeaways) clinicInsights.push(...ln.recentTakeaways.slice(0, 3));
  }

  // Fallback: derive patterns from recent debrief summaries
  if (patterns.length === 0 && riderData.overallStats) {
    const stats = riderData.overallStats;
    if (stats.totalDebriefs && stats.totalDebriefs >= 3) {
      patterns.push(`${stats.totalDebriefs} debriefs logged`);
    }
  }

  const horseName = planDoc.horseName || planDoc.horse?.name ||
    (riderData.profile?.horses?.[0]?.name) || 'the horse';
  const riderName = riderData.profile?.displayName || riderData.profile?.name || 'Rider';
  const totalDebriefs = riderData.overallStats?.totalDebriefs || 0;

  return {
    showName: planDoc.showName || planDoc.showDetails?.name || 'Upcoming Show',
    showDate: showDateFormatted,
    daysOut: daysOut || 0,
    horseName,
    riderName,
    totalDebriefs,
    patterns,
    clinicInsights,
    selectedTests,
    hasMultipleTests,
    hasFreestyle,
    hasStandard: selectedTests.some(t => !t.isFreestyle),
    hasMultipleLevels: selectedTests.length > 1 && selectedTests.some(t => t.level !== selectedTests[0].level),
    levelCategories: [...new Set(selectedTests.map(t => t.levelCategory))],
  };
}

/**
 * Cloud Function handler for Readiness Snapshot generation.
 */
async function handler(request) {
  try {
    const uid = validateAuth(request);
    const { planId, refresh = false } = request.data || {};

    if (!planId || typeof planId !== "string") {
      throw new HttpsError("invalid-argument", "planId is required and must be a string.");
    }

    // Fetch the show prep document from top-level showPreparations collection
    const showPrepRef = db.collection("showPreparations").doc(planId);
    const showPrepSnap = await showPrepRef.get();
    if (!showPrepSnap.exists) {
      throw new HttpsError("not-found", "Show plan not found.");
    }
    const planDoc = showPrepSnap.data();

    // Verify ownership
    if (planDoc.userId !== uid) {
      throw new HttpsError("permission-denied", "You do not have permission to access this document.");
    }

    const planRef = showPrepRef;

    // Check for existing snapshot
    const snapshotRef = planRef.collection("readinessSnapshot").doc("data");
    const existingSnap = await snapshotRef.get();

    if (refresh) {
      // Validate refresh gate
      if (!existingSnap.exists) {
        throw new HttpsError("failed-precondition", "Cannot refresh — no existing snapshot.");
      }
      const existing = existingSnap.data();
      if ((existing.refreshCount || 0) >= 1) {
        throw new HttpsError("failed-precondition", "Snapshot has already been refreshed once.");
      }
    } else if (existingSnap.exists) {
      // Already generated — return existing
      const existing = existingSnap.data();
      return {
        success: true,
        narrative: existing.narrative,
        generatedAt: existing.generatedAt,
        fromCache: true,
      };
    }

    // Fetch rider data for prompt context
    const riderData = await prepareRiderData(uid, "eventPlanner");

    // Load flag state from the show prep entry's test flags
    let flagState = {};
    try {
      const flagsSnap = await planRef.collection("testFlags").get();
      flagsSnap.forEach(doc => {
        const data = doc.data();
        if (data.flaggedItems) {
          const flags = {};
          data.flaggedItems.forEach(id => { flags[id] = true; });
          flagState[doc.id] = flags;
        }
      });
    } catch (e) {
      console.log("[readinessSnapshot] No test flags found, proceeding without flags");
    }

    // Build context
    const ctx = buildSnapshotContext(planDoc, riderData, flagState);

    // Build prompts
    const system = buildReadinessSnapshotPrompt(ctx);
    const userMessage = `Generate the Readiness Snapshot for ${ctx.riderName} and ${ctx.horseName}. Plain prose only — no JSON, no markdown, no headers. 300–400 words.`;

    // Call Claude
    console.log(`[readinessSnapshot] Generating for plan ${planId}, ${ctx.selectedTests.length} test(s), ${ctx.daysOut} days out`);

    const narrative = await callClaude({
      system,
      userMessage,
      maxTokens: 700,
      jsonMode: false,
      context: "readiness-snapshot",
      uid,
    });

    if (!narrative || narrative.length < 100) {
      throw new HttpsError("internal", "Readiness snapshot response too short — likely a parsing error.");
    }

    const trimmedNarrative = narrative.trim();

    // Write to Firestore
    const totalDebriefs = ctx.totalDebriefs;
    const refreshCount = refresh
      ? ((existingSnap.exists && existingSnap.data().refreshCount) || 0) + 1
      : 0;

    await snapshotRef.set({
      narrative: trimmedNarrative,
      generatedAt: FieldValue.serverTimestamp(),
      debriefsAtGeneration: totalDebriefs,
      refreshCount,
    });

    console.log(`[readinessSnapshot] Written successfully (refresh=${refresh}, refreshCount=${refreshCount})`);

    return {
      success: true,
      narrative: trimmedNarrative,
      generatedAt: new Date().toISOString(),
      refreshCount,
    };

  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error("[readinessSnapshot] Error:", err);
    throw wrapError(err, "readinessSnapshot");
  }
}

module.exports = { handler };
