/**
 * Pre-Lesson Summary — Data Assembly (no AI call)
 *
 * Assembles a concise pre-lesson summary from existing Firestore data and
 * cached AI outputs. No Claude API call is made — this is purely data
 * lookup, filtering, and formatting.
 *
 * Unlike the Weekly Coach Brief, this output is rider-facing:
 *   - 14-day lookback (not 30) — current state, not retrospective
 *   - No coach-sharing consent required — the rider reads her own summary
 *   - Second-person / rider-facing register — no pronoun conversion
 *   - Includes an opening_line extracted from cached quickInsights
 *
 * See: YDJ_PreLessonSummary_Implementation_Brief.md
 */

const { Timestamp } = require("firebase-admin/firestore");
const { db } = require("../lib/firebase");
const { validateAuth } = require("../lib/auth");
const { wrapError } = require("../lib/errors");

// ── Shared constants (kept local to avoid cross-module coupling) ──

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

const PATH_LABELS = {
  ambitious_competitor: "Ambitious Competitor",
  steady_builder: "Steady Builder",
  curious_explorer: "Curious Explorer",
};

const MOVEMENT_KEYWORDS = [
  "half-halt", "half halt", "half-pass", "half pass", "shoulder-in",
  "haunches-in", "travers", "renvers", "leg yield", "leg-yield",
  "pirouette", "piaffe", "passage", "flying change", "simple change",
  "counter-canter", "counter canter", "medium trot", "extended trot",
  "collected", "volte", "turn on the haunches", "rein-back", "rein back",
  "walk-canter", "canter-walk", "trot-canter", "canter-trot",
  "transition", "lateral", "bend", "straightness", "impulsion",
  "contact", "connection", "throughness", "suppleness", "rhythm",
  "tempo", "balance", "seat", "aids", "diagonal",
];

// ── Helpers ──

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// Sentence-boundary punctuation detector that ignores periods inside
// numbers (e.g., "(8.2/10)") — those are not sentence terminators.
function isSentenceBoundary(str, i) {
  const ch = str[i];
  if (ch !== "." && ch !== "!" && ch !== "?") return false;
  const prev = str[i - 1] || "";
  const next = str[i + 1] || "";
  if (/\d/.test(prev) && /\d/.test(next)) return false;
  return true;
}

function truncateAtSentence(str, maxLen = 120) {
  if (!str || str.length <= maxLen) return str;
  const sub = str.slice(0, maxLen);
  let lastBoundary = -1;
  for (let i = sub.length - 1; i >= 0; i--) {
    if (isSentenceBoundary(sub, i)) { lastBoundary = i; break; }
  }
  if (lastBoundary > 20) return str.slice(0, lastBoundary + 1);
  return str.slice(0, maxLen).trimEnd() + "\u2026";
}

function firstSentence(str) {
  if (!str) return null;
  for (let i = 0; i < str.length; i++) {
    if (isSentenceBoundary(str, i)) return str.slice(0, i + 1).trim();
  }
  return truncateAtSentence(str, 150);
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

// ── Debrief relevance scoring (§3.1) ──
// Same shape as weeklyCoachBrief, with a +2 lesson-reference bonus
// (the Pre-Lesson Summary prizes lesson-linked entries more strongly).

function scoreDebriefEntry(text) {
  if (!text) return -1;
  const trimmed = text.trim();

  if (trimmed.length < 15) return -1;

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

  // Lesson reference — stronger weight than coach brief
  if (/lesson|instructor|trainer|coach|clinic/i.test(trimmed)) score += 5;

  const lowerText = trimmed.toLowerCase();
  for (const kw of MOVEMENT_KEYWORDS) {
    if (lowerText.includes(kw)) { score += 3; break; }
  }

  if (/when (i|she|he)\b/i.test(trimmed) && /(then|started|stopped|changed|improved|got|became)/i.test(trimmed)) {
    score += 2;
  }

  if (trimmed.length >= 40) score += 1;
  if (trimmed.length >= 60) score += 1;

  if (trimmed.length > 120) {
    const truncated = truncateAtSentence(trimmed, 120);
    const truncLower = truncated.toLowerCase();
    const hasKeyword = MOVEMENT_KEYWORDS.some((kw) => truncLower.includes(kw));
    const hasCauseEffect = /when (i|she|he)\b/i.test(truncated);
    if (!hasKeyword && !hasCauseEffect && score >= 3) return -1;
  }

  return score;
}

function selectRelevantEntries(entries, max = 2, minScore = 2) {
  const scored = entries
    .map((text) => ({ text, score: scoreDebriefEntry(text) }))
    .filter((e) => e.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
  return scored.map((e) => truncateAtSentence(e.text, 160));
}

// ── Fetch helper ──

async function fetchCollection(name, uid) {
  const ref = db.collection(name)
    .where("userId", "==", uid)
    .where("isDeleted", "==", false);
  const snap = await ref.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Main handler ──

async function handler(request) {
  try {
    const uid = validateAuth(request);

    const fourteenDaysAgo = daysAgo(14);

    const [
      riderProfiles,
      horseProfiles,
      allDebriefs,
      lessonNotes,
      showPreps,
      gptTrajectorySnap,
      coachingInsightsSnap,
    ] = await Promise.all([
      fetchCollection("riderProfiles", uid),
      fetchCollection("horseProfiles", uid),
      fetchCollection("debriefs", uid),
      fetchCollection("lessonNotes", uid),
      fetchCollection("showPreparations", uid),
      db.collection("analysisCache").doc(`${uid}_grandPrixTrajectory`).get(),
      db.collection("analysisCache").doc(`${uid}_coaching_insights`).get(),
    ]);

    // -- Identity --
    const profile = riderProfiles[0] || {};
    const riderName = profile.fullName || "Rider";
    const firstName = riderName.split(/\s+/)[0];
    const compLevel = profile.compLevel || null;
    const levelLabel = COMP_LEVEL_LABELS[compLevel] || null;
    const targetLevel = profile.targetLevel || profile.workingToward || null;
    const targetLevelLabel = targetLevel ? COMP_LEVEL_LABELS[targetLevel] || null : null;

    const horseNames = horseProfiles.map((h) => h.horseName).filter(Boolean);

    // -- Debriefs: last entry + ride count (14 days) --
    const sortedDebriefs = allDebriefs
      .map((d) => ({ ...d, _date: new Date((d.rideDate || "") + "T00:00:00") }))
      .filter((d) => !Number.isNaN(d._date.getTime()))
      .sort((a, b) => b._date - a._date);

    const lastEntryDate = sortedDebriefs.length > 0 ? sortedDebriefs[0].rideDate : null;
    const ridesLast14 = sortedDebriefs.filter((d) => d._date >= fourteenDaysAgo).length;

    // -- GPT L2 Trajectory (cached, consumed as-is) --
    let activePath = null;
    let activePathLabel = null;
    let trajectorySnippet = null;

    if (gptTrajectorySnap.exists) {
      const gptData = gptTrajectorySnap.data();
      const result = gptData.result || {};
      activePath = result.activePath || null;

      if (!activePath && result.trajectoryPaths?.paths) {
        const bestFit = result.trajectoryPaths.paths.find((p) => p.isBestFit);
        if (bestFit) {
          const nameMap = {
            "Ambitious Competitor": "ambitious_competitor",
            "Steady Builder": "steady_builder",
            "Curious Explorer": "curious_explorer",
          };
          activePath = nameMap[bestFit.name] || null;
        }
      }
      activePathLabel = PATH_LABELS[activePath] || null;

      if (result.timelineProjection) {
        trajectorySnippet = firstSentence(result.timelineProjection);
      }
      if (!trajectorySnippet && result.pathNarratives?.recommended_path?.reason) {
        trajectorySnippet = firstSentence(result.pathNarratives.recommended_path.reason);
      }
    }

    // -- Priority + Opening Line from cached Quick Insights (consumed as-is) --
    let priorityThisWeek = null;
    let openingLine = null;
    let aiCoachInsight = null;

    if (coachingInsightsSnap.exists) {
      const insightsData = coachingInsightsSnap.data();
      const result = insightsData.result || {};

      priorityThisWeek =
        result.priority_this_week ||
        result.quickInsights?.priority_this_week ||
        null;

      openingLine =
        result.opening_line ||
        result.quickInsights?.opening_line ||
        null;
    }

    // -- AI Coach Insight — from per-voice cache, NOT from priority_this_week --
    // Voice caches are stored as analysisCache/{uid}_coaching_{0..3}
    // Each contains: narrative, weeklyFocusExcerpt, _meta { name, index, perspective }
    // Try voices in order; use the first one that has a weeklyFocusExcerpt.
    const VOICE_META_FALLBACK = [
      { key: "coaching_0", name: "The Classical Master" },
      { key: "coaching_1", name: "The Empathetic Coach" },
      { key: "coaching_2", name: "The Technical Coach" },
      { key: "coaching_3", name: "The Practical Strategist" },
    ];

    for (const vm of VOICE_META_FALLBACK) {
      if (aiCoachInsight) break;
      const snap = await db.collection("analysisCache").doc(`${uid}_${vm.key}`).get();
      if (!snap.exists) continue;
      const vData = snap.data();
      const generatedAt = vData.generatedAt ? new Date(vData.generatedAt) : null;
      const isStale = generatedAt && (Date.now() - generatedAt.getTime()) > 30 * 24 * 60 * 60 * 1000;
      if (isStale || !vData.result) continue;

      const voiceResult = vData.result;
      const snippet =
        voiceResult.weeklyFocusExcerpt ||
        voiceResult.philosophical_reflection ||
        null;
      const meta = voiceResult._meta || {};

      if (snippet) {
        aiCoachInsight = {
          voiceName: meta.name || vm.name,
          snippet: truncateAtSentence(snippet, 300),
        };
      }
    }

    // -- Lesson insights (14 days) — takeaways + movementPurpose --
    const recentLessons = lessonNotes
      .filter((n) => !n.isDraft)
      .filter((n) => {
        const d = new Date((n.lessonDate || "") + "T00:00:00");
        return !Number.isNaN(d.getTime()) && d >= fourteenDaysAgo;
      })
      .sort((a, b) =>
        new Date((b.lessonDate || "") + "T00:00:00") -
        new Date((a.lessonDate || "") + "T00:00:00")
      );

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

    const recentPurposes = recentLessons
      .map((n) => (n.movementPurpose || "").trim())
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => truncateAtSentence(p, 200));

    // -- AHAs + Obstacles (14 days, relevance-filtered) --
    const recentDebriefs = sortedDebriefs.filter((d) => d._date >= fourteenDaysAgo);
    const ahaRaw = recentDebriefs.map((d) => d.ahaRealization).filter(Boolean);
    const ahas = selectRelevantEntries(ahaRaw, 2);

    const obstacleRaw = recentDebriefs.map((d) => d.challenges).filter(Boolean);
    const obstacles = selectRelevantEntries(obstacleRaw, 2);

    // -- Show prep (most recent, only if not past) --
    let showPrepData = null;
    if (showPreps.length > 0) {
      const sorted = [...showPreps].sort(
        (a, b) =>
          new Date((b.showDateStart || "") + "T00:00:00") -
          new Date((a.showDateStart || "") + "T00:00:00")
      );
      const latest = sorted[0];
      if (latest.showDateStart) {
        const showDate = new Date(latest.showDateStart + "T00:00:00");
        const daysOut = Math.ceil((showDate - new Date()) / (1000 * 60 * 60 * 24));
        if (daysOut >= 0) {
          const flaggedMovements = [];
          const concernsObj = latest.concerns;
          if (concernsObj && typeof concernsObj === "object" && !Array.isArray(concernsObj)) {
            if (Array.isArray(concernsObj.flaggedByTest)) {
              concernsObj.flaggedByTest.forEach((entry) => {
                (entry.flaggedItems || []).forEach((item) => {
                  flaggedMovements.push({
                    text: item.text || item.id || "",
                    coeff: Boolean(item.coeff),
                  });
                });
              });
            }
          }
          showPrepData = {
            showName: latest.showName || null,
            showDateStart: latest.showDateStart,
            daysOut,
            testLabel: (latest.testsSelected || [])[0] || null,
            flaggedMovements,
          };
        }
      }
    }

    // -- Assemble --
    const briefData = {
      // Identity
      riderName,
      firstName,
      horseNames,
      weekOf: weekOfLabel(),
      lastEntryDate,
      ridesLast14,

      // Level + trajectory
      levelLabel,
      compLevel,
      targetLevelLabel,
      activePathLabel,
      trajectorySnippet,

      // Cached AI content
      priorityThisWeek: priorityThisWeek ? truncateAtSentence(priorityThisWeek, 300) : null,
      aiCoachInsight,
      openingLine,

      // Lessons + debriefs (14-day window)
      lessonTakeaways: lessonTakeaways.slice(0, 5),
      recentPurposes,
      ahas,
      obstacles,

      // Show prep
      showPrepData,

      // Metadata
      generatedAt: new Date().toISOString(),
    };

    return { success: true, briefData };
  } catch (error) {
    throw wrapError(error, "generateLessonPrepSummary");
  }
}

module.exports = { handler };
