/**
 * Synthetic session definitions for the coaching-repetition diagnostic.
 *
 * One CONSTANT rider (profile + self-assessment) is held fixed across every
 * session — the realistic model is one rider whose stable / rides vary, not a
 * different person each time. Only the horse + the 3 debriefs change per session.
 *
 * Set A (5 sessions): deliberately maximally different — different horse, level,
 *   problem domain, and emotional tone. Tests whether outputs CONVERGE even when
 *   inputs diverge (→ structural).
 * Set B (3 sessions): near-identical — same horse, same recurring issue, mild
 *   day-to-day variation, similar mood. Mirrors the real complaint (consecutive
 *   similar days). Tests input sensitivity (→ input-driven).
 *
 * Each session carries exactly 3 debriefs (the Tier-1 floor: profile + assessment
 * + 1 horse + 3 debriefs). All debrief field names match what
 * functions/aggregators/rideHistory.js surfaces to Claude.
 */

// ── Constant rider (same person every session) ─────────────────────────────
const RIDER_PROFILE = {
  fullName: "Test Rider (Diagnostic)",
  level: "Experienced adult amateur, schooling Third Level",
  frequency: "5-6",
  coach: "biweekly",
  trainingTime: "Early mornings before work, ~45 min per ride",
  compLevel: "First and Second Level recognized; schooling Third at home",
  recentScores: "Second Level Test 3 mid-60s last summer; one 68% high point",
  ownership: ["own", "lease"],
  whyRide: "Dressage is where I get quiet in my own head. The partnership is the point.",
  enjoyMost: "The moment a horse softens and offers something instead of being asked.",
  longTermGoals:
    "Develop each horse correctly for its own stage; earn my USDF Bronze the right way, not by drilling tests.",
  learningStyle: ["feel-based", "needs-the-why", "visual-imagery"],
};

const RIDER_ASSESSMENT = {
  bestWhen: "When I stop managing every stride and let the horse carry the rhythm.",
  bestFeelings: "Calm, almost playful. Curious instead of anxious.",
  bestDialogue: "'Let it happen.' I breathe out and wait.",
  losingWhen: "When something goes wrong early and I start gripping and over-riding.",
  losingFeelings: "Tight chest, shallow breath, narrowing focus onto the problem.",
  losingDialogue: "'Fix it, fix it now.' I get loud with my aids.",
  lostWhen: "Shows, or when a more advanced rider is watching me school.",
  lostFeelings: "Self-conscious, behind the motion, apologizing to the horse.",
  lostDialogue: "'Everyone can see this isn't working.'",
  energizers: "A clear single focus for the ride; good music in the barn aisle beforehand.",
  relaxers: "Long rein walk breaks; counting my exhales through transitions.",
  currentStrengths: ["patience on the ground", "soft hands", "reads the horse's mood well"],
  growthAreas: ["independent seat under pressure", "timing of the downward aid", "not over-riding"],
  positionAndSeat: 6,
  aidsAndCommunication: 6,
  feelAndTiming: 5,
  knowledgeAndUnderstanding: 7,
  mentalGame: 5,
};

// ── helpers ────────────────────────────────────────────────────────────────
function debrief(d) {
  return {
    rideDate: d.rideDate,
    horseName: d.horseName,
    sessionType: d.sessionType || "schooling",
    sessionModality: d.sessionModality || "in-saddle",
    overallQuality: d.overallQuality,
    confidenceLevel: d.confidenceLevel,
    riderEffort: d.riderEffort,
    horseEffort: d.horseEffort,
    riderEnergy: d.riderEnergy,
    horseEnergy: d.horseEnergy,
    mentalState: d.mentalState,
    movements: d.movements,
    wins: d.wins,
    challenges: d.challenges,
    ahaRealization: d.ahaRealization || "",
    horseNotices: d.horseNotices || "",
    workFocus: d.workFocus || "",
  };
}

// ── SET A — five maximally-different sessions ───────────────────────────────

const A1_PIP = {
  id: "A1",
  set: "A",
  label: "Green 4yo Pip — establishing forward, patient/curious",
  horse: {
    horseName: "Pip",
    birthYear: "2022",
    breed: "Hanoverian",
    sex: "gelding",
    partnershipMonth: "9",
    partnershipYear: "2025",
    horseLevel: "training-not-showing",
    arrangement: "own",
    strengths: "Honest, tries hard, lovely uphill canter when balanced.",
    soundness: "Sound; still physically immature, tires quickly.",
    conditions: "Backed 6 months ago. Short attention span.",
    important: "First young horse I've started myself. Goal is correctness, no rush.",
  },
  debriefs: [
    debrief({
      rideDate: "2026-05-28", horseName: "Pip", sessionModality: "combined",
      overallQuality: 6, confidenceLevel: 6, riderEffort: 5, horseEffort: 7,
      riderEnergy: "calm", horseEnergy: "fresh", mentalState: "curious",
      movements: ["walk-work", "trot-work", "transitions", "rhythm"],
      wins: "Five minutes of groundwork first and he came into the ride softer. Got three forward trot departs off a light leg instead of a kick.",
      challenges: "Loses the trot after half a circle and breaks to walk. I have to ask again and again.",
      ahaRealization: "When I sat quiet and just kept the leg ON rather than nagging, he stayed up longer.",
      horseNotices: "He licked and chewed at the first walk break — that's new for him.",
      workFocus: "Forward as the first conversation, before anything else.",
    }),
    debrief({
      rideDate: "2026-05-31", horseName: "Pip", sessionModality: "in-saddle",
      overallQuality: 7, confidenceLevel: 7, riderEffort: 5, horseEffort: 6,
      riderEnergy: "calm", horseEnergy: "settled", mentalState: "playful",
      movements: ["trot-work", "canter-work", "transitions", "impulsion"],
      wins: "First balanced canter both directions without falling in. It felt uphill for a few strides.",
      challenges: "Canter-trot transitions dump onto the forehand. He gets quick before he comes back.",
      ahaRealization: "If I prepare the downward with my seat a stride early he doesn't fall on his face.",
      horseNotices: "Ears were soft and forward the whole canter — he was with me.",
      workFocus: "Let the young horse find balance; don't drill.",
    }),
    debrief({
      rideDate: "2026-06-03", horseName: "Pip", sessionModality: "combined",
      overallQuality: 6, confidenceLevel: 6, riderEffort: 4, horseEffort: 7,
      riderEnergy: "calm", horseEnergy: "tired", mentalState: "patient",
      movements: ["walk-work", "trot-work", "rhythm", "transitions"],
      wins: "Kept the whole ride to 25 minutes and quit while he was still trying. He felt proud.",
      challenges: "Attention faded in the last five minutes; he started looking at the gate.",
      ahaRealization: "His good work has a time limit right now and that's fine — the calendar is his, not mine.",
      horseNotices: "Big sigh and a stretch down when I gave the rein at the end.",
      workFocus: "Short, correct, finish on a yes.",
    }),
  ],
};

const A2_MAESTRO = {
  id: "A2",
  set: "A",
  label: "PSG schoolmaster Maestro — tempi/pirouette + show nerves",
  horse: {
    horseName: "Maestro",
    birthYear: "2008",
    breed: "Dutch Warmblood",
    sex: "gelding",
    partnershipMonth: "2",
    partnershipYear: "2024",
    horseLevel: "psg",
    arrangement: "lease",
    strengths: "Made schoolmaster, confirmed changes, generous when ridden accurately.",
    soundness: "Sound, on a maintenance program; older campaigner.",
    conditions: "Will tell on me when my position is crooked — won't compensate.",
    important: "Leasing to learn the upper-level feel. Recognized show in two weeks.",
  },
  debriefs: [
    debrief({
      rideDate: "2026-05-27", horseName: "Maestro", sessionType: "schooling",
      overallQuality: 7, confidenceLevel: 5, riderEffort: 8, horseEffort: 6,
      riderEnergy: "wired", horseEnergy: "willing", mentalState: "anxious",
      movements: ["tempi-changes", "flying-change", "counter-canter", "collection", "test-ride-through"],
      wins: "Clean four-tempis down the long side on the first try. He waited for my aid.",
      challenges: "I rush the collection before the pirouette and he gets tight. My nerves about the show are leaking into the ride.",
      ahaRealization: "When I hold my breath, he hollows. The tension is mine first, then his.",
      horseNotices: "He grinds slightly when I take too much rein — a clear 'too much' message.",
      workFocus: "Ride the horse in front of me, not the show in my head.",
    }),
    debrief({
      rideDate: "2026-05-30", horseName: "Maestro", sessionType: "schooling",
      overallQuality: 6, confidenceLevel: 5, riderEffort: 8, horseEffort: 6,
      riderEnergy: "tense", horseEnergy: "willing", mentalState: "focused",
      movements: ["pirouette", "collection", "counter-canter", "tempi-changes"],
      wins: "Left pirouette stayed active — I rode out forward instead of trying to salvage a stuck one.",
      challenges: "Right pirouette I lost the impulsion and tried to fix it in place. Should have ridden out.",
      ahaRealization: "Abandoning the bad pirouette early is the correct answer, not a failure.",
      horseNotices: "He offered the changes I didn't ask for — anticipating the test pattern already.",
      workFocus: "Vary the location of the movements so he responds to aids, not letters.",
    }),
    debrief({
      rideDate: "2026-06-02", horseName: "Maestro", sessionType: "schooling",
      overallQuality: 7, confidenceLevel: 6, riderEffort: 7, horseEffort: 7,
      riderEnergy: "steadier", horseEnergy: "generous", mentalState: "determined",
      movements: ["test-ride-through", "tempi-changes", "pirouette", "collection", "accuracy"],
      wins: "One full test run at home in the mid-60s feel. Geometry was accurate at the markers.",
      challenges: "I keep wanting to run the whole test again to feel safe. I know that backfires.",
      ahaRealization: "I've now ridden the full pattern twice — one more before the show is the limit.",
      horseNotices: "Softest he's been in the bridle all week after I finally exhaled in the walk breaks.",
      workFocus: "Targeted movement schooling, not pattern drilling, going into the show.",
    }),
  ],
};

const A3_RUBY = {
  id: "A3",
  set: "A",
  label: "OTTB Ruby — tension/relaxation, spooky corner, contact",
  horse: {
    horseName: "Ruby",
    birthYear: "2018",
    breed: "Thoroughbred (OTTB)",
    sex: "mare",
    partnershipMonth: "5",
    partnershipYear: "2023",
    horseLevel: "second",
    arrangement: "own",
    strengths: "Quick, sensitive, brilliant when relaxed; huge engine.",
    soundness: "Sound. Ulcer history — managed with diet.",
    conditions: "Tense in new environments; backs off contact when worried.",
    important: "Sensitive mare. Relaxation is everything with her or nothing else works.",
  },
  debriefs: [
    debrief({
      rideDate: "2026-05-29", horseName: "Ruby", sessionType: "schooling",
      overallQuality: 4, confidenceLevel: 4, riderEffort: 8, horseEffort: 5,
      riderEnergy: "frustrated", horseEnergy: "spooky", mentalState: "frustrated",
      movements: ["walk-work", "leg-yield", "bend-flexion", "contact"],
      wins: "Honestly not much. I kept my temper, which with her is a win.",
      challenges: "She spooked at the C end every pass and curled behind the contact. The harder I rode forward the tighter she got.",
      ahaRealization: "Driving a tense horse forward into a fixed hand just traps her. I made it worse.",
      horseNotices: "She held her breath through the scary corner — I could feel her back lock.",
      workFocus: "Relaxation before anything. No contact battle.",
    }),
    debrief({
      rideDate: "2026-06-01", horseName: "Ruby", sessionType: "schooling",
      overallQuality: 6, confidenceLevel: 6, riderEffort: 6, horseEffort: 6,
      riderEnergy: "calmer", horseEnergy: "wary", mentalState: "problem-solving",
      movements: ["walk-work", "shoulder-in", "bend-flexion", "rhythm", "contact"],
      wins: "Started in walk shoulder-in near the scary corner and she softened and reached for the bit.",
      challenges: "Still had to rebuild trust every time we changed direction. Contact comes and goes.",
      ahaRealization: "Lateral work gave her something to DO with the energy instead of bracing against it.",
      horseNotices: "Two big snorts after the first good shoulder-in — the tension blew out.",
      workFocus: "Suppleness and a forward-seeking contact, not a frame.",
    }),
    debrief({
      rideDate: "2026-06-04", horseName: "Ruby", sessionType: "schooling",
      overallQuality: 7, confidenceLevel: 6, riderEffort: 6, horseEffort: 7,
      riderEnergy: "encouraged", horseEnergy: "rideable", mentalState: "hopeful",
      movements: ["trot-work", "shoulder-in", "leg-yield", "rhythm", "contact", "straightness"],
      wins: "First relaxed trot work past C with her seeking down to the bit. It felt like the same horse and a different horse.",
      challenges: "If I take the contact for granted for even a stride she checks out behind it again.",
      ahaRealization: "Her trust in my hand is a living thing I rebuild every ride, not a switch that stays on.",
      horseNotices: "Soft eye, swinging tail in the trot — she was breathing with the rhythm.",
      workFocus: "Keep relaxation first; let contact be an invitation she accepts.",
    }),
  ],
};

const A4_DUKE = {
  id: "A4",
  set: "A",
  label: "Lease Duke — rider's own seat/breathing, joyful aha",
  horse: {
    horseName: "Duke",
    birthYear: "2014",
    breed: "Quarter Horse cross",
    sex: "gelding",
    partnershipMonth: "1",
    partnershipYear: "2026",
    horseLevel: "first",
    arrangement: "lease",
    strengths: "Steady, forgiving, packs me around so I can work on myself.",
    soundness: "Sound, low-maintenance.",
    conditions: "Will quietly ignore mushy aids — needs clarity, not strength.",
    important: "My 'work on the rider' horse. Forgiving enough that my position is the variable.",
  },
  debriefs: [
    debrief({
      rideDate: "2026-05-26", horseName: "Duke", sessionType: "schooling",
      overallQuality: 5, confidenceLevel: 6, riderEffort: 7, horseEffort: 5,
      riderEnergy: "stiff", horseEnergy: "lazy", mentalState: "self-critical",
      movements: ["circles", "transitions", "rider-position", "breathing"],
      wins: "Noticed how much I collapse my right side on circles right — at least I can feel it now.",
      challenges: "I hold my breath through every downward transition and brace in the chair seat.",
      ahaRealization: "He isn't dull — I'm muffling my own aids with a braced body.",
      horseNotices: "He swished his tail every time I gripped with my knee.",
      workFocus: "My seat is the instrument; tune it before blaming the horse.",
    }),
    debrief({
      rideDate: "2026-05-29", horseName: "Duke", sessionType: "schooling",
      overallQuality: 7, confidenceLevel: 7, riderEffort: 6, horseEffort: 6,
      riderEnergy: "lighter", horseEnergy: "willing", mentalState: "encouraged",
      movements: ["transitions", "circles", "rider-position", "breathing", "straightness"],
      wins: "Counted exhales into each downward and the transitions got round instead of falling apart.",
      challenges: "The second I think about anything else the breath-holding sneaks back.",
      ahaRealization: "My exhale is an aid. When I breathe out he steps under behind. Did you feel that? — I finally did.",
      horseNotices: "He came up in the back and gave me a soft snort when I softened.",
      workFocus: "Breathe to ride; the seat follows the breath.",
    }),
    debrief({
      rideDate: "2026-06-01", horseName: "Duke", sessionType: "schooling",
      overallQuality: 8, confidenceLevel: 8, riderEffort: 5, horseEffort: 6,
      riderEnergy: "joyful", horseEnergy: "generous", mentalState: "confident",
      movements: ["transitions", "circles", "rider-position", "straightness", "balance"],
      wins: "Best ride in months and I did LESS. Even weight, even circles, breathing — and he just offered it.",
      challenges: "Now I want to chase this feeling, which is its own trap.",
      ahaRealization: "Doing less, but more correctly, is the whole game. I felt my seat become independent for real.",
      horseNotices: "He marched off on a loose rein at the end like he'd had a good day too.",
      workFocus: "Allow more than I do; protect the new feeling without grabbing for it.",
    }),
  ],
};

const A5_LUNA = {
  id: "A5",
  set: "A",
  label: "Luna returning from suspensory — careful conditioning, cautious/hopeful",
  horse: {
    horseName: "Luna",
    birthYear: "2016",
    breed: "Oldenburg",
    sex: "mare",
    partnershipMonth: "6",
    partnershipYear: "2019",
    horseLevel: "training",
    arrangement: "own",
    strengths: "Elegant mover, careful, deeply bonded to me after years together.",
    soundness: "Returning from a hind suspensory strain; cleared for walk/trot rehab.",
    conditions: "On a vet-directed return-to-work plan. No lateral work yet.",
    important: "Seven years together. Coming back slowly from injury — patience and soundness over progress.",
  },
  debriefs: [
    debrief({
      rideDate: "2026-05-28", horseName: "Luna", sessionType: "conditioning",
      overallQuality: 6, confidenceLevel: 6, riderEffort: 4, horseEffort: 5,
      riderEnergy: "cautious", horseEnergy: "quiet", mentalState: "watchful",
      movements: ["walk-work", "rhythm", "straightness"],
      wins: "Twenty minutes of straight, forward, rhythmic walk on the vet's plan. She felt level.",
      challenges: "I'm hyper-vigilant about every step — hard to enjoy the ride when I'm bracing for a misstep.",
      ahaRealization: "My job right now is rhythm and straightness, nothing fancier. That IS the work.",
      horseNotices: "She kept turning an ear back to me like she was checking in too.",
      workFocus: "Pure rhythm; protect the rehab, trust the plan.",
    }),
    debrief({
      rideDate: "2026-05-31", horseName: "Luna", sessionType: "conditioning",
      overallQuality: 6, confidenceLevel: 5, riderEffort: 4, horseEffort: 5,
      riderEnergy: "anxious", horseEnergy: "quiet", mentalState: "cautious",
      movements: ["walk-work", "trot-work", "rhythm", "balance"],
      wins: "First two minutes of trot from the plan — even, regular, no head-bob. Cried a little, honestly.",
      challenges: "I second-guess whether each trot step is sound. The worry is louder than the work.",
      ahaRealization: "Seven years of partnership means I'll feel a problem before any test would show it. I can trust that.",
      horseNotices: "She offered to stretch down in the walk break — relaxed, not guarding.",
      workFocus: "Rhythm and regularity as the soundness barometer.",
    }),
    debrief({
      rideDate: "2026-06-03", horseName: "Luna", sessionType: "conditioning",
      overallQuality: 7, confidenceLevel: 6, riderEffort: 4, horseEffort: 5,
      riderEnergy: "hopeful", horseEnergy: "content", mentalState: "tender",
      movements: ["walk-work", "trot-work", "rhythm", "straightness", "balance"],
      wins: "Four minutes of trot in two sets, both directions, dead level. The plan is working.",
      challenges: "Holding myself back from asking for more because she felt so good.",
      ahaRealization: "Restraint is the discipline now. The horse can't read the calendar and neither should my hope.",
      horseNotices: "Soft, deep breaths at the end — she's enjoying having a job again.",
      workFocus: "Stay inside the plan; let soundness, not ambition, set the pace.",
    }),
  ],
};

// ── SET B — three near-identical sessions (the real complaint) ──────────────
// Same horse Comet, same recurring issue (canter→trot downward transitions
// falling on the forehand + losing left bend), similar mildly-frustrated-but-
// determined mood, mild day-to-day variation.

const COMET_HORSE = {
  horseName: "Comet",
  birthYear: "2017",
  breed: "Holsteiner",
  sex: "gelding",
  partnershipMonth: "3",
  partnershipYear: "2021",
  horseLevel: "third",
  arrangement: "own",
  strengths: "Powerful, good changes, honest worker.",
  soundness: "Sound.",
  conditions: "Naturally hollow left; strong right shoulder; heavy in downward transitions.",
  important: "My main competition horse. We keep circling the same homework.",
};

const B1_COMET = {
  id: "B1",
  set: "B",
  label: "Comet day 1 — canter-trot on forehand, left bend",
  horse: COMET_HORSE,
  debriefs: [
    debrief({
      rideDate: "2026-05-25", horseName: "Comet", sessionType: "schooling",
      overallQuality: 6, confidenceLevel: 6, riderEffort: 7, horseEffort: 6,
      riderEnergy: "focused", horseEnergy: "willing", mentalState: "determined",
      movements: ["canter-work", "transitions", "bend-flexion", "balance"],
      wins: "First few canter-trot transitions were balanced when I prepared with my seat.",
      challenges: "After a few reps he gets heavy and falls on the forehand into trot. Left bend goes missing.",
      ahaRealization: "He's heaviest going to the left where he's naturally hollow.",
      horseNotices: "Leaned on my left rein in the downwards.",
      workFocus: "Engage the hind leg before the downward; keep left bend.",
    }),
    debrief({
      rideDate: "2026-05-25", horseName: "Comet", sessionType: "schooling",
      overallQuality: 6, confidenceLevel: 5, riderEffort: 7, horseEffort: 6,
      riderEnergy: "focused", horseEnergy: "willing", mentalState: "determined",
      movements: ["canter-work", "transitions", "bend-flexion", "shoulder-in"],
      wins: "Shoulder-in left for a few strides helped him step under and lighten.",
      challenges: "Still drops onto the forehand in the actual canter-trot transition. Same spot every time.",
      ahaRealization: "If I half-halt earlier and engage first, he doesn't fall as hard.",
      horseNotices: "Heavy in my hand the moment he thinks 'trot.'",
      workFocus: "Activate then receive — not pull then slow.",
    }),
    debrief({
      rideDate: "2026-05-25", horseName: "Comet", sessionType: "schooling",
      overallQuality: 5, confidenceLevel: 5, riderEffort: 8, horseEffort: 6,
      riderEnergy: "tiring", horseEnergy: "willing", mentalState: "mildly-frustrated",
      movements: ["canter-work", "transitions", "bend-flexion", "balance"],
      wins: "Didn't get into a pulling match with him today.",
      challenges: "Same heavy downward, same lost left bend. We keep circling the same homework.",
      ahaRealization: "More reps aren't fixing it — something earlier in the prep is the issue.",
      horseNotices: "Braces his underneck when he gets heavy.",
      workFocus: "Stop drilling the transition; fix the balance before it.",
    }),
  ],
};

const B2_COMET = {
  id: "B2",
  set: "B",
  label: "Comet day 2 — same issue, horse stiff",
  horse: COMET_HORSE,
  debriefs: [
    debrief({
      rideDate: "2026-05-27", horseName: "Comet", sessionType: "schooling",
      overallQuality: 5, confidenceLevel: 5, riderEffort: 7, horseEffort: 5,
      riderEnergy: "focused", horseEnergy: "stiff", mentalState: "determined",
      movements: ["canter-work", "transitions", "bend-flexion", "balance"],
      wins: "Good forward canter once he warmed up out of the stiffness.",
      challenges: "Canter-trot transitions still fall on the forehand, worse going left. Heavy left rein again.",
      ahaRealization: "He's stiffer on the left so the left bend is the root, not the transition itself.",
      horseNotices: "Leaned on the left rein in every downward.",
      workFocus: "Suppleness left before asking for the transition.",
    }),
    debrief({
      rideDate: "2026-05-27", horseName: "Comet", sessionType: "schooling",
      overallQuality: 6, confidenceLevel: 5, riderEffort: 7, horseEffort: 6,
      riderEnergy: "focused", horseEnergy: "willing", mentalState: "determined",
      movements: ["canter-work", "transitions", "shoulder-in", "bend-flexion"],
      wins: "A little shoulder-fore left before the downward and one transition stayed up.",
      challenges: "Couldn't repeat it reliably — most transitions he still dropped onto the forehand.",
      ahaRealization: "Engaging the inside hind first is the key, but my timing is late.",
      horseNotices: "Gets heavy the instant he anticipates trot.",
      workFocus: "Earlier half-halt, engage the inside hind, then receive.",
    }),
    debrief({
      rideDate: "2026-05-27", horseName: "Comet", sessionType: "schooling",
      overallQuality: 5, confidenceLevel: 5, riderEffort: 8, horseEffort: 6,
      riderEnergy: "tiring", horseEnergy: "willing", mentalState: "mildly-frustrated",
      movements: ["canter-work", "transitions", "bend-flexion", "balance"],
      wins: "Kept my cool and quit on a half-decent one.",
      challenges: "Same homework as always — heavy downward, lost left bend. Feels like we never move past it.",
      ahaRealization: "Drilling it more isn't the answer; the left-side balance is the real project.",
      horseNotices: "Braces the underneck and leans when he tires.",
      workFocus: "Address the hollow left side, not the transition symptom.",
    }),
  ],
};

const B3_COMET = {
  id: "B3",
  set: "B",
  label: "Comet day 3 — same issue, slight improvement",
  horse: COMET_HORSE,
  debriefs: [
    debrief({
      rideDate: "2026-05-29", horseName: "Comet", sessionType: "schooling",
      overallQuality: 6, confidenceLevel: 6, riderEffort: 7, horseEffort: 6,
      riderEnergy: "focused", horseEnergy: "willing", mentalState: "determined",
      movements: ["canter-work", "transitions", "shoulder-in", "bend-flexion", "balance"],
      wins: "Best left bend of the week after some leg-yield and shoulder-in to supple him first.",
      challenges: "Canter-trot still gets heavy, but it fell less hard today. Progress is slow.",
      ahaRealization: "Suppling the left side BEFORE the transition is finally paying off a little.",
      horseNotices: "Lighter left rein after the lateral work.",
      workFocus: "Supple left first; engage the hind; receive softly.",
    }),
    debrief({
      rideDate: "2026-05-29", horseName: "Comet", sessionType: "schooling",
      overallQuality: 6, confidenceLevel: 6, riderEffort: 7, horseEffort: 6,
      riderEnergy: "focused", horseEnergy: "willing", mentalState: "cautiously-optimistic",
      movements: ["canter-work", "transitions", "bend-flexion", "balance"],
      wins: "Two transitions in a row stayed off the forehand when my half-halt was early enough.",
      challenges: "Timing is still hit or miss; when I'm late he falls onto the forehand like always.",
      ahaRealization: "The fix was earlier prep and left suppleness all along, not stronger hands.",
      horseNotices: "Softer in the bridle when I engaged the hind first.",
      workFocus: "Protect the timing; engage then receive.",
    }),
    debrief({
      rideDate: "2026-05-29", horseName: "Comet", sessionType: "schooling",
      overallQuality: 6, confidenceLevel: 6, riderEffort: 7, horseEffort: 6,
      riderEnergy: "satisfied", horseEnergy: "willing", mentalState: "determined",
      movements: ["canter-work", "transitions", "shoulder-in", "bend-flexion"],
      wins: "Ended on the lightest downward of the week. Same homework but a small step forward.",
      challenges: "Still the same recurring issue overall — left bend and heavy downwards are the long-term project.",
      ahaRealization: "Consistency over weeks, not heroics in one ride, is what will move this.",
      horseNotices: "Less brace in the underneck by the end.",
      workFocus: "Keep the recipe: supple left, engage, receive — every ride.",
    }),
  ],
};

const SESSIONS = [A1_PIP, A2_MAESTRO, A3_RUBY, A4_DUKE, A5_LUNA, B1_COMET, B2_COMET, B3_COMET];

module.exports = { RIDER_PROFILE, RIDER_ASSESSMENT, SESSIONS };
