# Post-Go-Live Polish Backlog

Captured 2026-05-08 after the pre-go-live reliability sweep that addressed:
- Weekly Focus snapshot desync on mid-week regen
- Practice Card / Visualization Suggestion side-extract failure
- Celebration picker divergence between server cron and client
- 300s function timeouts (PG, GPT mental, Journey Map, Data Viz → all 540s)
- GPT L2 trajectory pipeline > 540s timeout (now chunked into 3 client-orchestrated steps)
- Cycle-expiry in-product prompt (PG and GPT)

Three remaining edge cases were deemed non-blocking for go-live but worth tackling in the first month of production. Listed in priority order.

---

## 1. Cloud Function error-rate alert

**Why:** When Anthropic returns 500/rate-limit mid-pipeline, the regen handler throws and returns an error to the client. If the rider has navigated away, they never see the toast. The cache stays stale until the next attempt. Today this is invisible unless someone manually scrolls Cloud Function logs.

**Estimated frequency:** ~1 in 200 regens based on Anthropic's typical error rate, plus spikes during their incidents.

**Scope:**
- Set up a Cloud Monitoring alert on `severity=ERROR` for these functions: `getMultiVoiceCoaching`, `getJourneyMap`, `getGrandPrixThinking`, `getDataVisualizations`, `getPhysicalGuidance`, `getEventPlanner`.
- Threshold: >5% error rate over a 15-minute window, OR any 5xx Anthropic response.
- Notification channel: email or Slack to admin.

**Effort:** ~1 hour (no code changes; Cloud Console config).

---

## 2. `lastRegenError` field + panel banner

**Why:** Closes the "navigate away with an error" case. Even with item 1 above, the *rider* still has no in-product signal that their last regen attempt failed.

**Scope:**
- When any regen handler throws (Physical Guidance, GPT mental, GPT trajectory steps, MVC), write `{ lastRegenError: { at: <iso>, message: <string>, output: <type> } }` to the user's cycle doc (or a new `users/{uid}/lastRegenError` doc — TBD which is cleaner).
- On successful regen, clear the field.
- Both panels read this on mount; if `lastRegenError` exists and is < 24 hr old, show a small banner: *"Your last refresh attempt didn't complete. Tap to try again."* Tap fires the same regen flow.
- Same banner pattern can also surface on the home page Weekly Focus block.

**Files touched:**
- `functions/api/grandPrixThinking.js` — add error capture in handler catch
- `functions/api/physicalGuidance.js` — same
- `functions/api/coaching.js` — same
- `src/components/AICoaching/GrandPrixPanel.jsx` — banner UI
- `src/components/AICoaching/PhysicalGuidancePanel.jsx` — banner UI
- `src/components/AICoaching/MultiVoicePanel.jsx` — banner UI

**Effort:** ~3 hours including testing.

---

## 3. Resume-mid-pipeline prompt for GPT L2 trajectory

**Why:** Step 1 of trajectory regen is the expensive Opus call (~$0.30 in tokens). If a rider clicks Regenerate, sees Step 1 complete in the UI, then closes the tab and never returns to that session, the `grandPrixTrajectoryStep1` cache sits unused. Their next regen attempt restarts from Step 1 fresh — wasting that prior Opus call.

**Estimated frequency:** Hard to predict; depends on rider patience during the 7-9 minute total runtime. Probably uncommon but the per-incident cost is real.

**Scope:**
- On GPT panel mount (after the staleOk read returns the current trajectory cache), additionally check whether `grandPrixTrajectoryStep1` exists *and* is newer than the final `grandPrixTrajectory` cache. If so, the rider has an incomplete pipeline.
- Show a small banner above the trajectory tab: *"You have a trajectory refresh in progress. Continue from where it left off?"* with a "Continue" button.
- Tap "Continue" → call step 2 with priorResults built from cached step 1 → step 3 → done.
- Existing `generateTrajectoryStep` server fallback already supports this (step 2 reads `grandPrixTrajectoryStep1` cache, step 3 reads both).

**Files touched:**
- `src/components/AICoaching/GrandPrixPanel.jsx` — mount-time check + banner UI + resume handler

**Effort:** ~2 hours including testing.

---

## Items NOT in this backlog (intentional)

These were considered and consciously deprioritized:

- **Auto-retry on Anthropic transient errors.** Decision: prefer manual rider-initiated retry. Auto-retry risks runaway costs if the failure is persistent (e.g., budget cap hit, prompt validation error).
- **Cron-driven monthly regen for inactive riders.** Decision: keep the 30-day cycle rider-triggered. The new "Ready to refresh? Tap here" prompt should drive enough engagement; cron-triggered regen for users who don't open the app risks generating outputs they never see.
- **Dedup `weeklyFocusRefresh.js` extractor functions.** Already done in commit `bc25132`.
- **Backfill stale snapshots from prior weeks.** Already done as one-shot via `scripts/backfillWeeklyFocusSnapshots.js`. Future stale snapshots are prevented by the per-regen `refreshWeeklyFocusSnapshotSection` wiring.

---

## Reference: relevant scripts and recent commits

Diagnostic and recovery scripts (under `scripts/`):
- `inspectRegenState.js <uid>` — full state inspection for a user
- `backfillWeeklyFocusSnapshots.js` — one-shot snapshot backfill across all users
- `triggerPhysicalRegen.js <uid>` — admin-triggered Physical Guidance regen via custom token
- `testTrajectoryChunked.js <uid>` — full 3-step trajectory pipeline smoke test
- `testTrajectoryStep3.js <uid>` — verifies step-cache resume path

Recent reliability commits:
- `91cf1d9` — Weekly Focus snapshot desync + Practice Card backfill
- `bc25132` — Dedup Weekly Focus extractors + cross-pilot backfill
- `e0b70eb` — Physical Guidance timeout 300→540s
- `267c912` — JourneyMap / GPT mental / DataViz timeouts 300→540s
- `ea1d727` — Cycle-expiry refresh prompt + 9-min poll horizon
- `7ebfd33` — Chunk GPT L2 trajectory pipeline into 3 steps
