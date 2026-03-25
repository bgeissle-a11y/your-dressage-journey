# Weekly Focus — Show Card Addendum
**Applies to:** `YDJ_WeeklyFocus_Implementation_Brief.md`
**Scope:** Show Planning card only. All other steps unchanged. The Weekly Focus component is already live as part of the dashboard — do not change any existing structure, routing, or other cards.

---

## Replace Step 5 — Show Planning link destination

In the "Full Analysis" links table, the Show Planning row is incorrect. Replace:

| Show Planning | `/outputs/event-planner` or `/journey-events` |

With:

| Show Planning | `/show-planner` |

The show planner is a top-level feature, not nested under outputs.

---

## Replace Step 9 — Show Planning Card Logic

Remove the existing Step 9 entirely and replace with the following.

---

### Show Planning Card — Two States

**Empty state** — no show preparation entry exists within the next 70 days (10 weeks):
- Card title: "Nothing on the calendar yet"
- Body: quiet message with a link to the Journey Event Log
- Do not hide the card — its presence is a reminder show planning is available

**Active state** — one or more shows exist within 70 days:
- Display 3 tasks: exactly **one per area** — mental, technical, physical
- Tasks come from the week bucket that matches the current days-out count
- "View full Show Plan →" navigates to `/show-planner/{showId}`
- Link color: `--rust` to match show card color identity

---

### Multi-Show Selection

A rider may have multiple upcoming shows. Always use the **soonest** — the one they need to prepare for first.

```javascript
// Query showPreparations:
//   where showDateStart >= today
//   AND showDateStart <= today + 70 days
//   AND status !== 'completed'
//   orderBy showDateStart asc
//   limit 1

const eligible = upcomingShows
  .map(s => ({ ...s, daysOut: Math.ceil((s.date - today) / 86400000) }))
  .filter(s => s.daysOut > 0 && s.daysOut <= 70)
  .sort((a, b) => a.daysOut - b.daysOut);

const activeShow = eligible[0]; // undefined if none within 70 days
```

When a show passes, the next eligible show in the list automatically becomes active on the next page load. No manual intervention needed.

---

### Week-Mapping Formula

Map the soonest show's `daysOut` to the show planner's 10-week bucket structure:

```javascript
const weekNum = Math.min(10, Math.max(1, Math.ceil(daysOut / 7)));
```

| Days out | weekNum | Theme |
|---|---|---|
| 64–70 (cap) | 10 | Intention |
| 57–63 | 9 | Groundwork |
| 50–56 | 8 | Foundation |
| 43–49 | 7 | Technical |
| 36–42 | 6 | Build |
| 29–35 | 5 | Refine |
| 22–28 | 4 | Sharpen |
| 15–21 | 3 | Solidify |
| 8–14  | 2 | Trust |
| 1–7   | 1 | Show Week |

---

### Task Source

Read from: `users/{userId}/outputs/showPlanner.weeklyShowTasks[weekNum]`

This field is keyed by the **active show's Firestore document ID**, so a rider with two shows has independent task caches per show:

```
users/{userId}/outputs/showPlanner/{showEventId}/weeklyShowTasks/{weekNum}
  → { mental: [{title, cue}], technical: [{title, cue}], physical: [{title, cue}] }
```

Display the **first item** from each area array. One task per area, always three total.

**Add `weeklyShowTasks` to the Show Planner Cloud Function** following the same pattern as Steps 1a–1c. The prompt addition:

```
In addition to the full show prep plan, include a field called "weeklyShowTasks" —
an object with keys "mental", "technical", and "physical". Each key holds an array
of task objects for that section, ordered by priority.

Each task object: { "title": "5 words max", "cue": "One specific action for this week." }

These tasks must:
- Be drawn directly from the full plan for this week (not new content)
- Be the highest-priority item from each section for this week number
- Be self-contained — readable without the full plan

Return format (add to existing JSON response):
"weeklyShowTasks": {
  "mental":    [{ "title": "...", "cue": "..." }, ...],
  "technical": [{ "title": "...", "cue": "..." }, ...],
  "physical":  [{ "title": "...", "cue": "..." }, ...]
}
```

**Fallback:** If `weeklyShowTasks` hasn't been generated yet for the current `weekNum`, use the hardcoded task content from `ydj-weekly-focus-showcard.html` → `TASKS_BY_WEEK[weekNum]`. This ensures the card never shows empty when a show is active.

---

### Interaction State

Add `show` to `checkedItems` in `weeklyFocus/{weekId}`:

```javascript
checkedItems: {
  gpt:      boolean[],          // existing
  physical: boolean[],          // existing
  show:     { [taskKey]: boolean }  // ADD — keyed as "{weekNum}-{area}", e.g. "8-mental"
}
```

Using `"{weekNum}-{area}"` as the key ensures checked state is week-specific and resets naturally when the week bucket changes.

---

### updateProgress() Fix

The existing `updateProgress()` selector is missing `.show-checkbox`. Update to:

```javascript
const all = document.querySelectorAll('.gpt-check, .phys-check, .show-checkbox');
```

---

### Show Card HTML Reference

See `ydj-weekly-focus-showcard.html` for the isolated show card — both active and empty states, all CSS, and the complete `buildShowTasks()` function. Use this as the definitive markup reference for `WFShowCard.jsx`.
