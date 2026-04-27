// Local smoke test for promptBuilder.js after the audit-driven prompt additions.
// Verifies: module loads, each builder returns non-empty string, BASE_CONTEXT
// and key voice prompts contain the markers the audit cared about.

const path = require('path');
const pb = require(path.resolve('functions/lib/promptBuilder.js'));

let pass = 0;
let fail = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    pass++;
    console.log(`  OK   ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ' — ' + detail : ''}`);
    console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`);
  }
}

// ---------- BASE_CONTEXT marker checks (audit gaps closed) ----------
console.log('\n[1] BASE_CONTEXT marker presence');
const bc = pb.BASE_CONTEXT;
check('BASE_CONTEXT is a non-empty string', typeof bc === 'string' && bc.length > 1000);

const baseMarkers = [
  'TECHNICAL & PHILOSOPHICAL ASSESSMENT AWARENESS',
  'TRAINING SCALE UNDERSTANDING vs. APPLICATION GAP',
  'LESSON NOTES AWARENESS',
  'INSTRUCTOR VS. RIDER PERSPECTIVE',
  'COACH\'S EYE FIELD',
  'RIDER BREAKTHROUGH',
  'Take Into Your Next Ride',
  'USDF RIDER AWARDS AWARENESS',
  'Bronze Medal: 6 scores of 60%',
  'Silver Medal: 4 scores of 60%',
  'Gold Medal: 4 scores of 60%',
  'Master\'s Challenge',
  'Diamond Achievement',
  'DATA INTEGRITY GUARDRAIL',
];
for (const m of baseMarkers) {
  check(`BASE_CONTEXT contains "${m}"`, bc.includes(m));
}

// Confirm DATA INTEGRITY GUARDRAIL is the last major block before the closing
// of BASE_CONTEXT (i.e., USDF block precedes it).
const usdfIdx = bc.indexOf('USDF RIDER AWARDS AWARENESS');
const dataIntegrityIdx = bc.indexOf('DATA INTEGRITY GUARDRAIL');
check('USDF block precedes DATA INTEGRITY GUARDRAIL', usdfIdx > 0 && dataIntegrityIdx > usdfIdx);

// ---------- Voice prompt marker checks ----------
console.log('\n[2] Voice prompt marker presence');
check('VOICE_PROMPTS array has 4 entries', Array.isArray(pb.VOICE_PROMPTS) && pb.VOICE_PROMPTS.length === 4);

const voiceChecks = [
  { idx: 0, name: 'Classical Master', markers: ['Award and milestone context', 'Lesson notes through a classical lens', 'Technical knowledge as philosophical foundation'] },
  { idx: 1, name: 'Empathetic Coach', markers: ['Award and milestone meaning', "Rider's relationship with instruction", 'The knowledge-body gap as emotional terrain', 'VISUALIZATION AWARENESS'] },
  { idx: 2, name: 'Technical Coach',  markers: ['USDF award progress from available data', 'Lesson notes as biomechanical data', 'Technical & Philosophical Assessment as biomechanical map', 'VISUALIZATION AWARENESS'] },
  { idx: 3, name: 'Practical Strategist', markers: ['Award milestones as motivational anchors', 'Lesson notes as a practice plan source', 'Technical assessment gaps as planning targets'] },
];
for (const v of voiceChecks) {
  const prompt = pb.VOICE_PROMPTS[v.idx];
  check(`Voice ${v.idx} (${v.name}) is non-empty string`, typeof prompt === 'string' && prompt.length > 500);
  for (const m of v.markers) {
    check(`Voice ${v.idx} (${v.name}) contains "${m}"`, prompt.includes(m));
  }
}

// ---------- Builder smoke tests ----------
console.log('\n[3] Builder function invocation smoke tests');

// Minimal mock rider data — enough to satisfy any null guards without invoking real data paths
const mockRider = {
  user: { firstName: 'Test', lastName: 'Rider', userId: 'smoke-test-uid' },
  riderProfile: {
    firstName: 'Test',
    yearsRiding: 10,
    stateOfResidence: 'CO',
    currentCompetitionLevel: 'First Level',
    competitionGoalLevel: 'Third Level',
    competitionHistory: 'Schooled at First Level last year, planning recognized shows this season',
    primaryGoals: 'Earn Bronze Medal',
    learningStyle: 'kinesthetic',
  },
  horseProfiles: [{ horseName: 'TestHorse', breed: 'Warmblood', age: 10, currentLevel: 'First Level' }],
  debriefs: [],
  reflections: [],
  observations: [],
  journeyEvents: [],
  eventPrepPlans: [],
  showPreparations: [],
  physicalAssessments: [],
  riderAssessments: [],
  horseHealthEntries: [],
  riderHealthEntries: [],
  technicalPhilosophicalAssessments: [],
  lessonNotes: [],
  selfAssessments: { mental: { hasAssessment: false }, physical: { hasAssessment: false }, technical: { hasAssessment: false } },
};

function tryBuild(label, fn) {
  try {
    const out = fn();
    if (out == null) return check(label, false, 'returned null/undefined');
    if (typeof out === 'string') return check(label, out.length > 500, `string len=${out.length}`);
    if (typeof out === 'object') {
      const sys = out.system || out.systemPrompt || '';
      const usr = out.userMessage || out.user || '';
      const ok = typeof sys === 'string' && sys.length > 500 && typeof usr === 'string' && usr.length > 0;
      return check(label, ok, ok ? `(system=${sys.length}b, user=${usr.length}b)` : `system=${sys.length}b user=${usr.length}b`);
    }
    return check(label, false, `unexpected type ${typeof out}`);
  } catch (e) {
    return check(label, false, `threw ${e.message}`);
  }
}

tryBuild('buildCoachingPrompt(0, mockRider)', () => pb.buildCoachingPrompt(0, mockRider));
tryBuild('buildCoachingPrompt(1, mockRider)', () => pb.buildCoachingPrompt(1, mockRider));
tryBuild('buildCoachingPrompt(2, mockRider)', () => pb.buildCoachingPrompt(2, mockRider));
tryBuild('buildCoachingPrompt(3, mockRider)', () => pb.buildCoachingPrompt(3, mockRider));
tryBuild('buildJourneyMapPrompt(1, mockRider)', () => pb.buildJourneyMapPrompt(1, mockRider, {}));
tryBuild('buildJourneyMapPrompt(2, mockRider)', () => pb.buildJourneyMapPrompt(2, mockRider, {}));
tryBuild('buildGPTL1Prompt(mockRider)', () => pb.buildGPTL1Prompt(mockRider));
tryBuild('buildTrajectoryCall1Prompt(mockRider)', () => pb.buildTrajectoryCall1Prompt(mockRider, {}));
tryBuild('buildPhysicalGuidancePrompt(1, mockRider)', () => pb.buildPhysicalGuidancePrompt && pb.buildPhysicalGuidancePrompt(1, mockRider));

// ---------- Summary ----------
console.log(`\n${pass} pass / ${fail} fail`);
if (fail > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('\nAll smoke checks passed.');
