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

## 4. FEI test movement-sequence integration (added 2026-05-23)

**Why:** As of the 2026-05-23 frontend testDatabase unification, the new "Sequence" tab in Test Reference Panel + Test Explorer shows full numbered movements for all 18 USDF tests (Intro through Fourth) by loading the same comprehensive JSON files the backend EP-1 uses. The 5 FEI tests fall back to an empty-state message because their movement sequences aren't in `functions/data/fei_test_database_complete.json` — that file only has gait-grouped `required_movements` lists (e.g. "PIAFFE (8-10 steps)") plus orphaned `coefficient_movements` number arrays that reference movements not defined in the file.

**Current state of FEI data:**
- **PSG — already parsed.** `dressage tests/fei tests/psg_test.json` has all 26 movements with `{number, marker, description, directives, coefficient, remarks}` — created 2026-03-15, never integrated into `functions/data/` or the testDatabase loader. Spot-verify against the PSG 2026 PDF, then drop in.
- **Inter I, Inter II, Grand Prix, Grand Prix Special — PDFs only.** Source PDFs in `dressage tests/fei tests/`:
  - `Intermediate I 2026_0.pdf` (~17 movements expected)
  - `Intermediate II 2026_0.pdf` (~17 movements, introduces piaffe + passage)
  - `Grand Prix 2026_0.pdf` (~19 movements, extensive piaffe/passage/tempi)
  - `Grand Prix Special 2026.pdf` (~18 movements)
- Freestyle tests (`dressage tests/freestyle/`, plus PDFs for FEI freestyles in `dressage tests/fei tests/`) — separate effort; freestyle data structure is different from standard tests (no fixed movement sequence).

**Scope:**
1. Verify `dressage tests/fei tests/psg_test.json` against the 2026 PSG PDF — spot-check 5-6 movements (especially marker letters and coefficient flags). Note: the parsed file currently uses `description`/`directives` (plural) like USDF Intro/Training, which `_normalizeMovement()` in `src/services/testDatabase.js` already flattens.
2. Parse the 4 remaining FEI PDFs to JSON in the same shape as `psg_test.json`. Options: manual transcription (~70 movements total, slow but unambiguous), or LLM-assisted PDF extraction with per-movement verification.
3. Decide on canonical location — either move/copy the 5 parsed JSONs into `functions/data/` as individual files OR consolidate into a single `fei_tests_sequenced.json` (matching the shape of `usdf_first_level_tests.json`). The unified file is the cleaner integration story.
4. Update **backend** `functions/lib/testDatabase.js` to load the new file(s) so EP-1 can pull sequenced FEI movements (today it falls back to gait groups for FEI).
5. Update **frontend** `src/services/testDatabase.js` to import the same file(s) so the Sequence tab renders for FEI tests. The `TEST_ID_TO_BACKEND_ID` mapping already covers all 5 FEI tests (`psg`, `inter_1`, `inter_2`, `grand_prix`, `gp_special`).
6. Remove the FEI-specific empty-state message in `SequenceTab` / `SequenceView`.
7. Update the EP-1 prompt fabrication rule in `functions/lib/promptBuilder.js:4292` — once FEI tests have numbered movements, the "do not invent movement numbers" guardrail still applies but the model can now reference them legitimately.

**Files touched:**
- `dressage tests/fei tests/*.json` (new parsed files OR `functions/data/fei_tests_sequenced.json`)
- `functions/lib/testDatabase.js` (load new data)
- `src/services/testDatabase.js` (import new data, drop FEI carve-out)
- `src/components/TestReferencePanel/TestReferencePanel.jsx` (remove FEI empty-state branch in `SequenceTab`)
- `src/components/TestExplorer/TestExplorer.jsx` (same, in `SequenceView`)
- `functions/lib/promptBuilder.js` (verify EP-1 FEI movement rule still reads correctly)

**Effort:** PSG verify + integration ~1h. Parsing the 4 remaining FEI PDFs is the bulk of the work — depends heavily on parsing method chosen. LLM-assisted ~2-4h plus your verification time; manual transcription ~3-5h depending on focus.

**Why this isn't a launch blocker:** The 18 USDF tests covering Intro through Fourth are the path most pilot riders are on. FEI riders see a clear empty-state explaining why and can still use the gait-grouped Movements tab for their required-element reference. EP-1 still generates AI-enriched coaching for FEI plans — it just doesn't have a numbered movement spine to anchor its references against, which is the gap that the 2026-05-23 EP-3 movement validator (B30) is specifically there to catch.

---

## 5. TestRequirementsDisplay panel title + placement review (added 2026-05-23)

**Why:** As part of the 2026-05-23 Sequence-tab work, the movements list was removed from the `TestRequirementsDisplay` panel (the AI-enriched section sitting below Readiness Snapshot in Show Planner). The panel now shows only level context, collective marks, coefficient strategy, and overall tips — but the title still reads "Test Requirements — {level}", which is a holdover from when it owned the movement sequence. A title like "Level Strategy" or "Coaching Insights" would more accurately reflect the remaining content.

Also worth revisiting once FEI integration ships (item #4 above): with the Sequence tab carrying all sequenced movement data, the AI-enriched panel may want to live closer to the Sequence tab (e.g. as a "Strategy" sub-tab inside Test Reference Panel) rather than as a separate default-open block elsewhere on the page. Defer this until FEI integration is done so the redesign covers all 23 tests at once instead of just the 18 USDF ones.

**Scope:**
- Rename `TestRequirementsDisplay`'s `CollapsibleSection` title (~5 min).
- Optionally reposition the panel into Test Reference Panel as a new tab (~30 min) — bundle with the FEI integration in item #4.
- The `TestRequirementsDisplay` component is also rendered by `EventPlannerOutput.jsx` (used in legacy Event Prep flow). Any rename/restructure must update both call sites.

**Effort:** Rename alone ~5 min. Combined with the post-FEI redesign ~1h additional on top of item #4.

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
