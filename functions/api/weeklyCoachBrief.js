/**
 * Weekly Coach Brief — Data Assembly (no AI call)
 *
 * Assembles a concise weekly rider summary from existing Firestore data
 * and cached AI outputs. No Claude API call is made — this is purely
 * data lookup, filtering, and formatting.
 *
 * See: YDJ_WeeklyCoachBrief_Implementation_Brief.md
 */

const { HttpsError } = require("firebase-functions/v2/https");
const { Timestamp } = require("firebase-admin/firestore");
const { db } = require("../lib/firebase");
const { validateAuth } = require("../lib/auth");
const { wrapError } = require("../lib/errors");

// ── Competition level display names ──

const COMP_LEVEL_LABELS = {
  none: "Pre-competition",
  intro: "Introductory",
  training: "Training Level",
  first: "First Level",
  second: "Second Level",
  third: "Third Level",
  fourth: "Fourth Level",
  "prix-st-georges": "Prix St. Georges",
  "intermediaire-1": "Intermediaire I",
  "intermediaire-2": "Intermediaire II",
  "grand-prix": "Grand Prix",
};

// ── Show-prep concerns normalizer ──

function extractCoachBriefConcerns(concerns) {
  if (Array.isArray(concerns)) return concerns.filter(Boolean);
  if (concerns && typeof concerns === "object") {
    const items = [];
    if (Array.isArray(concerns.flaggedByTest)) {
      concerns.flaggedByTest.forEach((entry) => {
        (entry.flaggedItems || []).forEach((item) => {
          items.push(item.text || item.id);
        });
      });
    }
    if (Array.isArray(concerns.additionalConcerns)) {
      items.push(...concerns.additionalConcerns);
    }
    return items.filter(Boolean);
  }
  return [];
}

// ── Rider-type chip labels ──

const PATH_LABELS = {
  ambitious_competitor: "Ambitious Competitor",
  steady_builder: "Steady Builder",
  curious_explorer: "Curious Explorer",
};

const PATH_CSS_CLASS = {
  ambitious_competitor: "competitor",
  steady_builder: "builder",
  curious_explorer: "explorer",
};

// ── Helpers ──

function toISODate(val) {
  if (!val) return null;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (val.toDate) return val.toDate().toISOString();
  return String(val);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * Truncate at a sentence boundary (period, ! or ?) within maxLen.
 * Prefers a complete sentence over hard character truncation.
 */
function truncateAtSentence(str, maxLen = 120) {
  if (!str || str.length <= maxLen) return str;
  // Find the last sentence-ending punctuation within maxLen
  const sub = str.slice(0, maxLen);
  const lastPeriod = Math.max(sub.lastIndexOf("."), sub.lastIndexOf("!"), sub.lastIndexOf("?"));
  if (lastPeriod > 20) {
    return str.slice(0, lastPeriod + 1);
  }
  // No good sentence boundary — hard truncate with ellipsis
  return str.slice(0, maxLen).trimEnd() + "\u2026";
}

function firstSentence(str) {
  if (!str) return null;
  const match = str.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : truncateAtSentence(str, 150);
}

function weekOfLabel() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

function weekId() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

// ── Debrief relevance filtering (§2.4) ──
//
// Scores debrief AHA/obstacle entries for coach-readability.
// The coach was not present at the ride — entries must give enough
// context to act on or connect to something the coach knows.

// Dressage movement keywords for relevance detection
const MOVEMENT_KEYWORDS = [
  "half-halt", "half halt", "half-pass", "half pass", "shoulder-in",
  "haunches-in", "travers", "renvers", "leg yield", "leg-yield",
  "pirouette", "piaffe", "passage", "flying change", "simple change",
  "counter-canter", "counter canter", "medium trot", "extended trot",
  "collected", "volte", "turn on the haunches", "rein-back", "rein back",
  "walk-canter", "canter-walk", "trot-canter", "canter-trot",
  "transition", "lateral", "bend", "straightness", "impulsion",
  "contact", "connection", "throughness", "suppleness", "rhythm",
  "tempo", "balance", "seat", "aids", "half-halt", "diagonal",
];

function scoreDebriefEntry(text) {
  if (!text) return -1;
  const trimmed = text.trim();

  // Exclude: too short or vague
  if (trimmed.length < 15) return -1;

  // Exclude: purely emotional without observable content
  const vaguePatterns = [
    /^(good|bad|hard|ok|fine|meh|ugh|yay|nice|great)\b/i,
    /^(felt|feeling) (frustrated|happy|sad|good|bad|ok|great|tired)/i,
    /^(that didn'?t work|better today|hard ride|something felt off)\.?$/i,
    /^(not great|pretty good|went well)\.?$/i,
  ];
  for (const pat of vaguePatterns) {
    if (pat.test(trimmed)) return -1;
  }

  let score = 0;

  // High priority: references a lesson, instructor, or correction
  if (/lesson|instructor|trainer|coach|clinic/i.test(trimmed)) score += 3;

  // High priority: references a specific movement by name
  const lowerText = trimmed.toLowerCase();
  for (const kw of MOVEMENT_KEYWORDS) {
    if (lowerText.includes(kw)) { score += 3; break; }
  }

  // High priority: cause-and-effect pattern
  if (/when (i|she|he)\b/i.test(trimmed) && /(then|started|stopped|changed|improved|got|became)/i.test(trimmed)) {
    score += 2;
  }

  // Medium priority: references horse by name (non-trivial observation)
  if (trimmed.length >= 40) score += 1;

  // Medium priority: specific enough (longer entries tend to have more detail)
  if (trimmed.length >= 60) score += 1;

  // Penalty: would lose key detail if truncated to 120 chars
  // If the entry is >120 chars and truncating removes everything after the first period,
  // check if the truncated version still has a movement keyword or cause-effect
  if (trimmed.length > 120) {
    const truncated = truncateAtSentence(trimmed, 120);
    const truncLower = truncated.toLowerCase();
    const hasKeyword = MOVEMENT_KEYWORDS.some((kw) => truncLower.includes(kw));
    const hasCauseEffect = /when (i|she|he)\b/i.test(truncated);
    if (!hasKeyword && !hasCauseEffect && score >= 3) {
      // Truncation would remove the specific detail — skip this entry
      return -1;
    }
  }

  return score;
}

/**
 * Filter and select top debrief entries for AHA or obstacle sections.
 * Returns up to `max` entries, scored by relevance.
 * Returns empty array if no entries score above the exclude threshold.
 */
function selectRelevantEntries(entries, max = 2) {
  const scored = entries
    .map((text) => ({ text, score: scoreDebriefEntry(text) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);

  return scored.map((e) => truncateAtSentence(e.text, 120));
}

// ── Fetch helpers ──

async function fetchCollection(name, uid, extraFilters = []) {
  let ref = db.collection(name).where("userId", "==", uid).where("isDeleted", "==", false);
  for (const [field, op, val] of extraFilters) {
    ref = ref.where(field, op, val);
  }
  const snap = await ref.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchCoaches(uid) {
  const snap = await db.collection("riders").doc(uid).collection("coaches").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Main handler ──

async function handler(request) {
  try {
    const uid = validateAuth(request);

    // 1. Check coach consent
    const coaches = await fetchCoaches(uid);
    const activeCoaches = coaches.filter((c) => c.sharingEnabled);
    if (activeCoaches.length === 0) {
      throw new HttpsError(
        "failed-precondition",
        "No active coach sharing consent. Enable sharing in Settings before generating a brief."
      );
    }

    // 2. Gather all data sources in parallel
    const thirtyDaysAgo = daysAgo(30);

    const [
      riderProfiles,
      horseProfiles,
      allDebriefs,
      recentLessonNotes,
      showPreps,
      journeyEvents,
      riderAssessments,
      gptTrajectorySnap,
      coachingInsightsSnap,
    ] = await Promise.all([
      fetchCollection("riderProfiles", uid),
      fetchCollection("horseProfiles", uid),
      fetchCollection("debriefs", uid),
      fetchCollection("lessonNotes", uid),
      fetchCollection("showPreparations", uid),
      fetchCollection("journeyEvents", uid),
      fetchCollection("riderAssessments", uid),
      db.collection("analysisCache").doc(`${uid}_grandPrixTrajectory`).get(),
      db.collection("analysisCache").doc(`${uid}_coaching_insights`).get(),
    ]);

    // 3. Process each data source

    // -- Rider name & level
    const profile = riderProfiles[0] || {};
    const riderName = profile.fullName || "Rider";
    const compLevel = profile.compLevel || null;
    const levelLabel = COMP_LEVEL_LABELS[compLevel] || null;

    // -- Horse names
    const horseNames = horseProfiles.map((h) => h.horseName).filter(Boolean);

    // -- Debriefs: last entry + ride count (30 days)
    const sortedDebriefs = allDebriefs
      .map((d) => ({ ...d, _date: new Date(d.rideDate + "T00:00:00") }))
      .sort((a, b) => b._date - a._date);

    const lastEntryDate = sortedDebriefs.length > 0
      ? sortedDebriefs[0].rideDate
      : null;

    const ridesLast30 = sortedDebriefs.filter((d) => d._date >= thirtyDaysAgo).length;

    // -- Check activity
    const fourteenDaysAgo = daysAgo(14);
    const hasRecentActivity = sortedDebriefs.some((d) => d._date >= fourteenDaysAgo);

    // -- GPT Trajectory (L2 cached) — §2.3
    let activePath = null;
    let activePathLabel = null;
    let activePathClass = null;
    let trajectorySnippet = null;

    if (gptTrajectorySnap.exists) {
      const gptData = gptTrajectorySnap.data();
      const result = gptData.result || {};

      // Primary: activePath top-level field (post-redesign)
      activePath = result.activePath || null;

      // Fallback: if activePath is absent, find path where isBestFit === true
      if (!activePath && result.trajectoryPaths?.paths) {
        const bestFit = result.trajectoryPaths.paths.find((p) => p.isBestFit);
        if (bestFit) {
          // Map path name back to key
          const nameMap = {
            "Ambitious Competitor": "ambitious_competitor",
            "Steady Builder": "steady_builder",
            "Curious Explorer": "curious_explorer",
          };
          activePath = nameMap[bestFit.name] || null;
        }
      }

      activePathLabel = PATH_LABELS[activePath] || null;
      activePathClass = PATH_CSS_CLASS[activePath] || null;

      // Extract trajectory snippet — first sentence of the path narrative
      // Primary: pathNarratives.recommended_path.narrative
      if (result.pathNarratives?.recommended_path?.narrative) {
        trajectorySnippet = firstSentence(result.pathNarratives.recommended_path.narrative);
      }

      // Fallback: philosophy of the active path
      if (!trajectorySnippet && activePath && result.trajectoryPaths?.paths) {
        const matchedPath = result.trajectoryPaths.paths.find((p) => p.isBestFit) ||
          result.trajectoryPaths.paths.find((p) =>
            (p.name || "").toLowerCase().replace(/\s+/g, "_") ===
            activePath
          );
        if (matchedPath?.philosophy) {
          trajectorySnippet = firstSentence(matchedPath.philosophy);
        }
      }
    }

    // -- Growth edge (§2.2): most recent riderAssessment growthAreas[0], fallback debrief challenges
    let growthEdge = null;
    if (riderAssessments.length > 0) {
      const sorted = [...riderAssessments].sort(
        (a, b) => new Date(toISODate(b.createdAt) || 0) - new Date(toISODate(a.createdAt) || 0)
      );
      const latest = sorted[0];
      if (latest.growthAreas?.length > 0) {
        growthEdge = latest.growthAreas[0];
      }
    }
    if (!growthEdge && sortedDebriefs.length > 0) {
      const withChallenge = sortedDebriefs.find((d) => d.challenges?.trim());
      if (withChallenge) {
        growthEdge = truncateAtSentence(withChallenge.challenges, 200);
      }
    }

    // -- AI Coach Insight (§2.1) — extract from cached multi-voice coaching
    //
    // Actual cache structure (from coaching.js):
    //   coaching_insights cache contains quickInsights with:
    //     priority_this_week, celebration, top_patterns[], practiceCard
    //   coaching_0..3 caches contain per-voice results with:
    //     narrative (300-400 words), weeklyFocusExcerpt (2-3 sentences), _meta
    //
    // There is no "dominant voice" concept — all 4 voices generate in parallel.
    // For the brief we use quickInsights.priority_this_week as the most concise
    // coaching-relevant snippet. If absent, fall back to voice 0's weeklyFocusExcerpt.
    let aiCoachInsight = null;

    if (coachingInsightsSnap.exists) {
      const insightsData = coachingInsightsSnap.data();
      const generatedAt = insightsData.generatedAt
        ? new Date(insightsData.generatedAt)
        : null;
      const isStale =
        generatedAt && Date.now() - generatedAt.getTime() > 30 * 24 * 60 * 60 * 1000;

      if (!isStale && insightsData.result) {
        const qi = insightsData.result;
        const snippet = qi.priority_this_week || null;

        if (snippet) {
          aiCoachInsight = {
            voiceName: "Combined Coaching Insight",
            voiceIndex: null,
            snippet: truncateAtSentence(snippet, 300),
            rationale: qi.celebration || null,
          };
        }
      }
    }

    // Fallback: try individual voice cache (voice 0 — Classical Master)
    if (!aiCoachInsight) {
      const voice0Snap = await db.collection("analysisCache").doc(`${uid}_coaching_0`).get();
      if (voice0Snap.exists) {
        const v0Data = voice0Snap.data();
        const generatedAt = v0Data.generatedAt ? new Date(v0Data.generatedAt) : null;
        const isStale =
          generatedAt && Date.now() - generatedAt.getTime() > 30 * 24 * 60 * 60 * 1000;

        if (!isStale && v0Data.result) {
          const voiceResult = v0Data.result;
          const snippet =
            voiceResult.weeklyFocusExcerpt ||
            voiceResult.philosophical_reflection ||
            null;
          const meta = voiceResult._meta || {};

          if (snippet) {
            aiCoachInsight = {
              voiceName: meta.name || "The Classical Master",
              voiceIndex: meta.index ?? 0,
              snippet: truncateAtSentence(snippet, 300),
              rationale: meta.perspective || null,
            };
          }
        }
      }
    }

    // -- Lesson takeaways (30 days)
    const recentLessons = recentLessonNotes
      .filter((n) => {
        const d = new Date((n.lessonDate || "") + "T00:00:00");
        return d >= thirtyDaysAgo;
      })
      .sort((a, b) => new Date(b.lessonDate + "T00:00:00") - new Date(a.lessonDate + "T00:00:00"));

    const lessonTakeaways = [];
    const seen = new Set();
    for (const lesson of recentLessons) {
      for (const t of lesson.takeaways || []) {
        const key = t.trim().toLowerCase();
        if (key && !seen.has(key)) {
          seen.add(key);
          lessonTakeaways.push(t.trim());
        }
      }
    }

    // -- AHA moments (30 days) — from post-ride debriefs with relevance filter (§2.4)
    const recentDebriefs = sortedDebriefs.filter((d) => d._date >= thirtyDaysAgo);
    const ahaRaw = recentDebriefs.map((d) => d.ahaRealization).filter(Boolean);
    const ahas = selectRelevantEntries(ahaRaw, 2);

    // -- Obstacles (30 days) — from post-ride debriefs with relevance filter (§2.4)
    const obstacleRaw = recentDebriefs.map((d) => d.challenges).filter(Boolean);
    const obstacles = selectRelevantEntries(obstacleRaw, 2);

    // -- Show prep: flagged concerns + show details
    let showPrepData = null;
    if (showPreps.length > 0) {
      const sorted = [...showPreps].sort(
        (a, b) =>
          new Date(b.showDateStart + "T00:00:00") - new Date(a.showDateStart + "T00:00:00")
      );
      const latest = sorted[0];
      const showDate = new Date(latest.showDateStart + "T00:00:00");
      const daysOut = Math.ceil((showDate - new Date()) / (1000 * 60 * 60 * 24));

      if (daysOut >= 0) {
        showPrepData = {
          showName: latest.showName || null,
          showDateStart: latest.showDateStart,
          daysOut,
          concerns: extractCoachBriefConcerns(latest.concerns),
          testsSelected: latest.testsSelected || [],
          currentLevel: latest.currentLevel || latest.horse?.currentLevel || null,
        };
      }
    }

    // -- Upcoming event (next future journeyEvent)
    let upcomingEvent = null;
    const futureEvents = journeyEvents
      .filter((e) => {
        const d = e.eventDate || e.date;
        return d && new Date(d + "T00:00:00") >= new Date();
      })
      .sort(
        (a, b) =>
          new Date((a.eventDate || a.date) + "T00:00:00") -
          new Date((b.eventDate || b.date) + "T00:00:00")
      );

    if (futureEvents.length > 0) {
      const evt = futureEvents[0];
      const evtDate = evt.eventDate || evt.date;
      const daysOut = Math.ceil(
        (new Date(evtDate + "T00:00:00") - new Date()) / (1000 * 60 * 60 * 24)
      );
      upcomingEvent = {
        name: evt.title || evt.eventType || "Event",
        type: evt.eventType || null,
        date: evtDate,
        daysOut,
      };
    }

    // 4. Assemble briefData
    const now = new Date().toISOString();
    const briefData = {
      // Identity
      riderName,
      horseNames,
      weekOf: weekOfLabel(),
      weekId: weekId(),
      lastEntryDate,
      ridesLast30,
      hasRecentActivity,

      // Level & trajectory
      levelLabel,
      compLevel,
      activePathLabel,
      activePathClass,
      trajectorySnippet,

      // Growth edge
      growthEdge,

      // AI coach insight
      aiCoachInsight,

      // Show prep
      showPrepData,

      // Lessons & debrief insights
      lessonTakeaways: lessonTakeaways.slice(0, 5),
      ahas,
      obstacles,

      // Upcoming event
      upcomingEvent,

      // Consent info
      coaches: activeCoaches.map((c) => ({
        name: c.name,
        email: c.email,
        optInDate: c.optInDate,
      })),

      // Metadata
      generatedAt: now,
    };

    // 5. Store the brief
    const briefDocRef = db
      .collection("riders")
      .doc(uid)
      .collection("coachBriefs")
      .doc(weekId());

    await briefDocRef.set({
      briefData,
      generatedAt: now,
      status: "generated",
      coaches: activeCoaches.map((c) => ({ name: c.name, email: c.email })),
    });

    return { success: true, briefData, briefId: weekId() };
  } catch (error) {
    throw wrapError(error, "generateWeeklyCoachBrief");
  }
}

module.exports = { handler };
