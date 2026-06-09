/**
 * Focal-horse helpers (client-side).
 *
 * The Journey Map is per-horse when the evidence ledger is active: one
 * rider-selected focal horse per generation, defaulting to the most-active
 * horse. These mirror the server's `pickFocalHorse` (functions/lib/evidenceLedger.js)
 * so the client and server agree on the default — which also keeps the per-horse
 * cache key consistent across the fast path and the full generation path.
 *
 * "Most active" = most non-draft, non-deleted debriefs for a named horse.
 */

/** Distinct horse names that appear in the rider's debriefs, most-active first. */
export function listHorsesByActivity(debriefs = []) {
  const counts = new Map();
  for (const d of debriefs) {
    if (!d || d.isDeleted || d.isDraft) continue;
    const name = (d.horseName || '').trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  // Count desc, then name asc for a deterministic default on ties.
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
}

/** The single most-active horse, or null when the rider has no named-horse debriefs. */
export function pickMostActiveHorse(debriefs = []) {
  return listHorsesByActivity(debriefs)[0] || null;
}
