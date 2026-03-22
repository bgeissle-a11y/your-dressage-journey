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

function truncate(str, maxLen = 120) {
  if (!str || str.length <= maxLen) return str;
  const cut = str.lastIndexOf(".", maxLen);
  return str.slice(0, cut > 0 ? cut + 1 : maxLen) + (cut <= 0 ? "..." : "");
}

function firstSentence(str) {
  if (!str) return null;
  const match = str.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : truncate(str, 150);
}

function weekOfLabel() {
  const now = new Date();
  // Find Monday of current week
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
      recentReflections,
      recentLessonNotes,
      showPreps,
      journeyEvents,
      riderAssessments,
      gptTrajectorySnap,
      coachingCache,
    ] = await Promise.all([
      fetchCollection("riderProfiles", uid),
      fetchCollection("horseProfiles", uid),
      fetchCollection("debriefs", uid),
      fetchCollection("reflections", uid),
      fetchCollection("lessonNotes", uid),
      fetchCollection("showPreparations", uid),
      fetchCollection("journeyEvents", uid),
      fetchCollection("riderAssessments", uid),
      db.collection("analysisCache").doc(`${uid}_grandPrixTrajectory`).get(),
      db.collection("analysisCache").doc(`${uid}_coaching_0`).get(),
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

    // -- Check activity: skip if no entries in 14 days
    const fourteenDaysAgo = daysAgo(14);
    const hasRecentActivity = sortedDebriefs.some((d) => d._date >= fourteenDaysAgo);
    // Note: we still generate even without recent activity for manual sends,
    // but flag it so the brief can show a note

    // -- GPT Trajectory (L2 cached)
    let activePath = null;
    let activePathLabel = null;
    let activePathClass = null;
    let trajectorySnippet = null;

    if (gptTrajectorySnap.exists) {
      const gptData = gptTrajectorySnap.data();
      const result = gptData.result || {};

      activePath = result.activePath || null;
      activePathLabel = PATH_LABELS[activePath] || null;
      activePathClass = PATH_CSS_CLASS[activePath] || null;

      // Extract trajectory snippet (first sentence of the recommended path narrative)
      if (result.pathNarratives?.recommended_path) {
        const recPath = result.pathNarratives.recommended_path;
        const narrativeText =
          recPath.trajectory_summary ||
          recPath.summary ||
          recPath.narrative ||
          "";
        trajectorySnippet = firstSentence(narrativeText);
      }
    }

    // -- Growth edge: most recent riderAssessment growthAreas[0], fallback debrief challenges
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
      // Fallback: most recent debrief challenge
      const withChallenge = sortedDebriefs.find((d) => d.challenges?.trim());
      if (withChallenge) {
        growthEdge = truncate(withChallenge.challenges, 200);
      }
    }

    // -- AI Coach Insight (cached multi-voice coaching)
    let aiCoachInsight = null;
    if (coachingCache.exists) {
      const cacheData = coachingCache.data();
      const generatedAt = cacheData.generatedAt
        ? new Date(cacheData.generatedAt)
        : null;

      // Only use if < 30 days old
      const isStale =
        generatedAt && Date.now() - generatedAt.getTime() > 30 * 24 * 60 * 60 * 1000;

      if (!isStale && cacheData.result) {
        const voiceResult = cacheData.result;
        // Extract a summary snippet from the coaching output
        const snippet =
          voiceResult.topInsight ||
          voiceResult.keyObservation ||
          voiceResult.summary ||
          voiceResult.mainInsight ||
          null;

        // Voice names by index
        const voiceNames = [
          "The Classical Master",
          "The Empathetic Coach",
          "The Technical Coach",
          "The Practical Strategist",
        ];
        const voiceIndex = cacheData.voiceIndex ?? 0;
        const voiceName = voiceNames[voiceIndex];

        if (snippet) {
          aiCoachInsight = {
            voiceName,
            voiceIndex,
            snippet: truncate(snippet, 300),
            rationale: voiceResult.selectionRationale || voiceResult.rationale || null,
          };
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

    // -- AHA moments (30 days)
    const ahas = recentReflections
      .filter((r) => {
        const d = new Date(toISODate(r.createdAt) || 0);
        return r.category === "aha" && d >= thirtyDaysAgo;
      })
      .sort((a, b) => new Date(toISODate(b.createdAt) || 0) - new Date(toISODate(a.createdAt) || 0))
      .map((r) => truncate(r.mainReflection, 120));

    // -- Obstacles (30 days)
    const obstacles = recentReflections
      .filter((r) => {
        const d = new Date(toISODate(r.createdAt) || 0);
        return r.category === "obstacle" && d >= thirtyDaysAgo;
      })
      .sort((a, b) => new Date(toISODate(b.createdAt) || 0) - new Date(toISODate(a.createdAt) || 0))
      .map((r) => truncate(r.mainReflection, 120));

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
          concerns: (latest.concerns || []).filter(Boolean),
          testsSelected: latest.testsSelected || [],
          currentLevel: latest.currentLevel || null,
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

      // Lessons & reflections
      lessonTakeaways: lessonTakeaways.slice(0, 5),
      ahas: ahas.slice(0, 3),
      obstacles: obstacles.slice(0, 3),

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
