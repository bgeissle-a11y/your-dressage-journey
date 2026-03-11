/**
 * Lesson Notes Aggregator
 *
 * Summarizes instructor guidance, cues/corrections, and rider
 * reflections from lessons, clinics, and video reviews.
 * Extracts recurring instructor cues and recent takeaways
 * for cross-referencing with ride debriefs.
 * Pure function — no Firestore reads.
 */

/**
 * @param {Object[]} lessonNotes - Array of lesson note documents (drafts pre-filtered)
 * @returns {Object} Aggregated lesson notes summary
 */
function aggregateLessonNotes(lessonNotes) {
  if (!lessonNotes || !lessonNotes.length) {
    return {
      totalLessonNotes: 0,
      byLessonType: {},
      byInstructor: {},
      byHorse: {},
      recentLessons: [],
      allTakeaways: [],
      recurringCues: [],
    };
  }

  const sorted = [...lessonNotes].sort(
    (a, b) => (b.lessonDate || "").localeCompare(a.lessonDate || "")
  );

  // Count by lesson type
  const byLessonType = {};
  for (const note of lessonNotes) {
    if (note.lessonType) {
      byLessonType[note.lessonType] = (byLessonType[note.lessonType] || 0) + 1;
    }
  }

  // Count by instructor
  const byInstructor = {};
  for (const note of lessonNotes) {
    if (note.instructorName) {
      byInstructor[note.instructorName] = (byInstructor[note.instructorName] || 0) + 1;
    }
  }

  // Count by horse
  const byHorse = {};
  for (const note of lessonNotes) {
    if (note.horseName) {
      byHorse[note.horseName] = (byHorse[note.horseName] || 0) + 1;
    }
  }

  // Recent lessons — last 5 with key content
  const recentLessons = sorted.slice(0, 5).map((note) => {
    const result = {
      date: note.lessonDate || "",
      lessonType: note.lessonType || "",
      instructorName: note.instructorName || "",
      horseName: note.horseName || "",
      movementInstructions: note.movementInstructions || "",
      takeaways: (note.takeaways || []).filter(Boolean),
    };

    if (note.cuesCorrections) result.cuesCorrections = note.cuesCorrections;
    if (note.riderReflections) result.riderReflections = note.riderReflections;
    if (note.linkedDebriefId) result.linkedDebriefId = note.linkedDebriefId;

    return result;
  });

  // Collect all takeaways (most recent first, capped at 15)
  const allTakeaways = [];
  for (const note of sorted) {
    const items = (note.takeaways || []).filter(Boolean);
    for (const item of items) {
      allTakeaways.push({
        text: item,
        date: note.lessonDate || "",
        instructorName: note.instructorName || "",
        horseName: note.horseName || "",
      });
    }
  }

  // Recurring cues — extract phrases from cuesCorrections that appear
  // across 3+ lesson notes (normalized to lowercase for matching).
  // Uses sentence-level granularity for meaningful pattern detection.
  const cuesByNote = sorted
    .filter((n) => n.cuesCorrections)
    .map((n) => ({
      sentences: n.cuesCorrections
        .split(/[.!?\n]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 10),
      instructorName: n.instructorName || "",
      date: n.lessonDate || "",
    }));

  const sentenceCounts = {};
  for (const noteData of cuesByNote) {
    const seen = new Set();
    for (const sentence of noteData.sentences) {
      if (!seen.has(sentence)) {
        seen.add(sentence);
        if (!sentenceCounts[sentence]) {
          sentenceCounts[sentence] = { count: 0, instructors: new Set() };
        }
        sentenceCounts[sentence].count += 1;
        sentenceCounts[sentence].instructors.add(noteData.instructorName);
      }
    }
  }

  const recurringCues = Object.entries(sentenceCounts)
    .filter(([, data]) => data.count >= 3)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10)
    .map(([cue, data]) => ({
      cue,
      occurrences: data.count,
      instructors: [...data.instructors],
    }));

  return {
    totalLessonNotes: lessonNotes.length,
    byLessonType,
    byInstructor,
    byHorse,
    recentLessons,
    allTakeaways: allTakeaways.slice(0, 15),
    recurringCues,
  };
}

module.exports = { aggregateLessonNotes };
