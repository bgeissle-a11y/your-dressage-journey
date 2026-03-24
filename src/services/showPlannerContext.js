// ─────────────────────────────────────────────────────────────────────────────
// Show Planner Context Builder
// Builds the full prompt context for any Show Planner API call.
// Used by both readinessSnapshot and weekContent generators.
// ─────────────────────────────────────────────────────────────────────────────

import { getTestData } from './testDatabase';

/**
 * Build context object for Show Planner API calls.
 *
 * @param {object} planData   - showPlans/{planId} document
 * @param {object} flagState  - { [testId]: { [itemId]: boolean } }
 * @param {object} riderData  - Pre-processed rider data
 * @returns {object} Full prompt context
 */
export function buildPlanContext(planData, flagState, riderData) {

  // ── Selected tests ──────────────────────────────────────────────────────
  const selectedTests = (planData.selectedTests || planData.testsSelected || [planData.testId])
    .filter(Boolean)
    .map((testId) => {
      const testData = getTestData(testId);

      // Per-test flag data — carried forward from Show Prep Form
      const rawFlags = flagState[testId] || {};
      const assessItems = testData?.assessItems || [];
      const flaggedItems = assessItems.filter(i => rawFlags[i.id]);
      const flaggedCoeffItems = flaggedItems.filter(i => i.coeff);

      // Freestyle branch
      const isFreestyle = planData.testType === 'freestyle';

      return {
        testId,
        label:         testData?.label        || testId,
        org:           testData?.org          || 'USDF',
        level:         testData?.level        || testData?.shortLabel || 'unknown',
        levelCategory: testData?.levelCategory || (testData?.org === 'FEI' ? 'fei' : 'national'),
        isFreestyle,
        levelTruth:    testData?.directives?.[0]?.body || null,
        coefficients:  testData?.coefficients          || [],
        flaggedMovements:    flaggedItems.map(i => ({ id: i.id, text: i.text, coeff: i.coeff })),
        flaggedCoeffMovements: flaggedCoeffItems.map(i => i.text),
        hasFlaggedConcerns:  flaggedItems.length > 0,
        hasCoeffConcerns:    flaggedCoeffItems.length > 0,
      };
    });

  // ── Multi-test helpers ───────────────────────────────────────────────────
  const hasMultipleTests  = selectedTests.length > 1;
  const hasFreestyle      = selectedTests.some(t => t.isFreestyle);
  const hasStandard       = selectedTests.some(t => !t.isFreestyle);
  const levelCategories   = [...new Set(selectedTests.map(t => t.levelCategory))];
  const hasMultipleLevels = selectedTests.length > 1 && selectedTests.some(t =>
    t.level !== selectedTests[0].level
  );

  return {
    // Show metadata
    showName:  planData.showName || planData.showDetails?.name || '',
    showDate:  planData.showDate || planData.showDateStart || planData.showDetails?.dateStart || '',
    daysOut:   planData.daysOut  || null,

    // Rider
    horseName:       riderData.horseName   || '',
    riderName:       riderData.riderName   || '',
    totalDebriefs:   riderData.totalDebriefs || 0,
    patterns:        riderData.patterns    || [],
    clinicInsights:  riderData.clinicInsights || [],

    // Tests (array — always iterate; never assume single test)
    selectedTests,
    hasMultipleTests,
    hasFreestyle,
    hasStandard,
    hasMultipleLevels,
    levelCategories,
  };
}

/**
 * Format selectedTests for prompt insertion.
 * Called inside both prompt builders.
 */
export function formatTestsForPrompt(selectedTests, hasMultipleTests) {
  return selectedTests.map(t => {
    const coeffLine = t.coefficients.length > 0
      ? `  Coefficient movements (×2): ${t.coefficients.map(c => c.movement || c.label).join(', ')}`
      : `  Coefficient movements: None at this level`;

    const flagLine = t.hasFlaggedConcerns
      ? `  Rider flagged concerns: ${t.flaggedMovements.map(m => m.text).join(', ')}`
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
