/**
 * refreshEligibleAt — compute the next moment a user's budget bucket rolls over.
 *
 * Used by Phase 4 (graceful exhaustion) so the rider's "weekly allowance is
 * used" banner can show a concrete refresh date. Spec §Part 6 #7:
 *
 *   Weekly  → next Monday 00:00 in the user's local timezone
 *   Monthly → first of next month at 00:00 UTC
 *
 * Per-user `timezone` lives on /users/{uid} as an IANA string (e.g.
 * "America/New_York"). If absent or invalid we fall back to UTC.
 *
 * Note: the existing weekly-bucket key in claudeCall.js still uses UTC ISO
 * weeks. Migrating that key is its own follow-up; this module only computes
 * the user-visible refresh moment. The two can disagree by up to a day
 * during the migration window — acceptable for a rider-facing banner.
 */

function _isValidTimezone(tz) {
  if (!tz || typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Given an instant (Date) and an IANA timezone, return its decomposed parts
 * in that timezone: { year, month, day, hour, minute, weekday (0=Sun..6=Sat) }.
 */
function _partsInZone(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value])
  );
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hour: parseInt(parts.hour === "24" ? "0" : parts.hour, 10),
    minute: parseInt(parts.minute, 10),
    weekday: weekdayMap[parts.weekday],
  };
}

/**
 * Build a Date for "midnight on Y-M-D" in the given timezone. Works by
 * iterating up to a couple of times to absorb DST transitions — good enough
 * for a once-per-week banner timestamp.
 */
function _zonedMidnight(year, month, day, timeZone) {
  // Naive UTC midnight as a starting guess.
  let guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  for (let i = 0; i < 4; i++) {
    const parts = _partsInZone(guess, timeZone);
    if (parts.year === year && parts.month === month && parts.day === day && parts.hour === 0 && parts.minute === 0) {
      return guess;
    }
    // Compute the offset between what we see and what we want and shift.
    const seenUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const wantUtc = Date.UTC(year, month - 1, day, 0, 0);
    guess = new Date(guess.getTime() + (wantUtc - seenUtc));
  }
  return guess;
}

/**
 * Next Monday 00:00 in `timeZone`. If `now` already falls on Monday at exactly
 * midnight in the user's zone, returns the following Monday (one full bucket
 * later) — i.e. strictly future.
 *
 * @param {Date} now
 * @param {string} timeZone IANA name, e.g. "America/New_York"
 * @returns {Date}
 */
function nextMondayMidnight(now, timeZone) {
  const tz = _isValidTimezone(timeZone) ? timeZone : "UTC";
  const parts = _partsInZone(now, tz);
  // Days until next Monday (weekday 1). 0 = Sun → 1 day. 1 = Mon → 7 days.
  const daysAhead = ((1 - parts.weekday + 7) % 7) || 7;

  // Compute the target calendar date by adding daysAhead in calendar-space
  // (not UTC instant-space). Use a UTC-anchored date purely as a vessel for
  // the Y/M/D arithmetic — we never read its time.
  const tmp = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + daysAhead));
  const targetY = tmp.getUTCFullYear();
  const targetM = tmp.getUTCMonth() + 1;
  const targetD = tmp.getUTCDate();

  return _zonedMidnight(targetY, targetM, targetD, tz);
}

/**
 * First of next month at 00:00 UTC. Used for monthly cap reset. Per spec
 * the monthly bucket key is calendar month UTC, so the user-facing refresh
 * moment matches.
 *
 * @param {Date} now
 * @returns {Date}
 */
function nextMonthFirstUTC(now) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  // Date constructor handles month=12 → next year correctly.
  return new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));
}

/**
 * Convenience: pick the right reset moment for a given cap kind.
 *
 * @param {"weekly"|"monthly"} kind
 * @param {object} [opts]
 * @param {Date} [opts.now]
 * @param {string} [opts.timeZone]
 * @returns {string} ISO timestamp
 */
function refreshEligibleAt(kind, { now = new Date(), timeZone = "UTC" } = {}) {
  if (kind === "monthly") {
    return nextMonthFirstUTC(now).toISOString();
  }
  return nextMondayMidnight(now, timeZone).toISOString();
}

module.exports = {
  refreshEligibleAt,
  nextMondayMidnight,
  nextMonthFirstUTC,
  _isValidTimezone,
};
