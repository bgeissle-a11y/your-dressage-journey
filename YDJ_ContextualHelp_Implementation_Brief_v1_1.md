# YDJ — Contextual Help System
# Implementation Brief

**Version:** 1.1
**Date:** May 2026
**Status:** Ready for Claude Code implementation
**Reference files:**
- `ydj-dashboard-v4.html` (dashboard structure)
- `ydj-outputs-tips-and-faq.html` (source content for atomized "About" sections — updated v1.1)
- `ydj-quickstart-map.html` (existing journey progress UI — do not duplicate)
- `CLAUDE.md` (voice lineage, intellectual references)
- `YDJ_AI_Coaching_Voice_Prompts_v3.md` (voice catchphrases)
- `YDJ_Pricing_Discounts_Consolidation_v2.md` Part 2 (canonical refresh cadence matrix — source of truth for all cadence copy below)
- `YDJ_GPT_Physical_30DayCycle_Implementation_Brief.md` (30-day cycle architecture)

---

## What changed in v1.1

- **Every cadence label rewritten.** The v1.0 brief carried over outdated cadence copy ("Weekly + on demand," "On data thresholds," "Bi-weekly") that pre-dated the April 21, 2026 cadence consolidation. All cadence copy now derives from `YDJ_Pricing_Discounts_Consolidation_v2.md` Part 2.
- **Self-Assessment Analysis removed.** That output does not exist in the platform. All references stripped from this brief, the per-output accordion mapping, and tooltip placements.
- **Threshold language in tooltips re-anchored to actual triggers.** The "5 debriefs + 6 reflection categories" copy in v1.0 was wrong; the real triggers vary per output and per tier.

---

## Why This Brief Exists

Pilot feedback (Anna, May 2026) revealed that even users who navigate the platform smoothly hit small confusion points where the answer existed only in the FAQ — too far away to be useful in the moment. The Outputs Tips & FAQ page is comprehensive but TLDR. The Quick Start Map already does the macro "where am I in the journey" work. The remaining gap is **micro-help at the exact moment a question forms** — and a few small structural moves that pull existing FAQ content into the contexts where it's needed.

**This brief does not add new features.** It adds tooltips, accordions, and inline status copy to existing pages. Most content is relocated from the (corrected) Outputs Tips & FAQ page, not newly written.

**What this brief does NOT touch:**
- Quick Start Map (`ydj-quickstart-map.html`) — already serves the macro journey-status function
- Dashboard nudges in `ydj-dashboard-v4.html` — already serve the "missing reflection categories" function
- The Outputs Tips & FAQ page itself — remains as the consolidated reference; we are pulling from it, not replacing it
- AI prompts or generation logic — no API changes
- The Quick Start Map ID/route — do not rename

---

## Part 0 — Canonical Cadence Reference

This section is the single source of truth for every cadence label, tooltip, "Next refresh" line, and About-this-output accordion in this brief. **Do not paraphrase.** Use these strings verbatim where rider-facing copy is required, and use the trigger logic as written when wiring the data layer.

All cadence rules below are derived from `YDJ_Pricing_Discounts_Consolidation_v2.md` Part 2 (April 21, 2026 — Final).

### Multi-Voice Coaching

**Trigger logic (all tiers):** Auto-regenerates when EITHER fires:
- 10 new debriefs since last generation, OR
- Cache buffer threshold met: 5 new debriefs OR 3 new debriefs + 1 new reflection

**Tier layering:**

| Tier | Cadence detail |
|---|---|
| Working | 10-debrief auto-regen, plus a monthly fallback (5+ briefs/reflections combined). Monthly fallback only fires if 10-debrief trigger hasn't already fired in the same calendar month. Max 1 generation per month. |
| Medium | 10-debrief auto-regen. Subject to weekly $20 cap. |
| Extended | Same as Medium + manual regeneration up to budget. 4-hour cooldown between manual regens. |

**Rider-facing label (cadence badge):** `Auto-refresh on activity`

**Tooltip copy:**
> Refreshes after every 10 new debriefs. Working tier: also a monthly fallback if the 10-debrief trigger hasn't fired. Extended tier: regenerate any time, with a 4-hour cooldown.

**"Next refresh" copy:** `When you cross the next refresh trigger`

### Journey Map

**Trigger logic (all tiers):** Auto-regenerates when EITHER fires:
- 1 Journey Event logged in past 2 months + 5 combined briefs/reflections since last generation, OR
- 10 combined briefs/reflections since last generation

Builds on cache when possible.

**Tier layering:**

| Tier | Cadence detail |
|---|---|
| Working | Same triggers. Max 1 per month. |
| Medium | Same triggers. Max 2 per month. Subject to cap. |
| Extended | Same triggers. No frequency cap. Subject to cap. |

**Rider-facing label (cadence badge):** `Auto-refresh on activity`

**Tooltip copy:**
> Refreshes after 10 combined debriefs and reflections, or after a journey event plus 5 entries. Working tier: max once per month. Extended: no frequency cap.

**"Next refresh" copy:** `When you cross the next refresh trigger`

### Data Visualizations

Data Visualizations are produced as part of the **Multi-Voice Coaching** generation. The cadence is identical to Multi-Voice Coaching.

**Rider-facing label (cadence badge):** `Refreshes with Multi-Voice`

**Tooltip copy:**
> Refreshes whenever your Multi-Voice Coaching refreshes — every 10 debriefs (Working: monthly fallback; Extended: manual regen with 4-hour cooldown).

**"Next refresh" copy:** `Refreshes with Multi-Voice Coaching`

**⚠ Verification needed:** Confirm whether Data Visualizations has its own dashboard card or is embedded inside the Multi-Voice Coaching output. If embedded, no separate tooltip is required. If it has its own card, apply the tooltip above.

### Grand Prix Thinking

| Tier | Cadence |
|---|---|
| Working | Not available |
| Medium | 30-day cycle + 1 triggered mid-cycle refresh |
| Extended | Unrestricted manual regeneration, up to budget |

Internal 4-week progression within each cycle (Week 1–4 chips). Week pointer auto-advances every 7 days. **L2 (Training Trajectory) regenerates monthly in sync with L1, with a soft cap of 4 Opus generations/month at the Extended tier.**

**Rider-facing label (cadence badge):** `30-day cycle`

**Tooltip copy:**
> 30-day program with weekly progression. Medium tier: refreshes monthly with one mid-cycle refresh allowed. Extended tier: regenerate any time.

**"Next refresh" copy:** `[date] — end of current 30-day cycle`

### Physical Guidance

| Tier | Cadence |
|---|---|
| Working | Not available |
| Medium | 30-day cycle + 1 triggered mid-cycle refresh |
| Extended | Unrestricted manual regeneration, up to budget |

Same architecture as GPT.

**Rider-facing label (cadence badge):** `30-day cycle`

**Tooltip copy:**
> 30-day program with weekly progression. Medium tier: refreshes monthly with one mid-cycle refresh allowed. Extended tier: regenerate any time.

**"Next refresh" copy:** `[date] — end of current 30-day cycle`

### Event Planner

Generates on demand whenever a rider submits an Event Preparation form. Available across all tiers within tier limits.

**Rider-facing label (cadence badge):** `On demand`

**Tooltip copy:**
> Generated when you submit an Event Preparation form. One plan per event.

**"Next refresh" copy:** `Generated per event`

### Weekly Focus

Extraction-only across all tiers. Weekly Focus does not generate independently — it pulls from already-cached outputs (Multi-Voice Coaching, GPT, Physical Guidance, Show Planner). Updates whenever a source output regenerates.

**Tooltip copy (if applied):**
> Pulls highlights from your most recent coaching outputs. Updates automatically whenever those outputs refresh.

### Pre-Lesson Summary, Practice Card, Visualization Scripts, Show Planner, Readiness Snapshot

These outputs have their own cadence rules and tier gating; refer to `YDJ_Pricing_Discounts_Consolidation_v2.md` Part 2 if tooltips are added for them in a future pass. They are NOT covered by the Output Cadence tooltips in Part 2B of this brief — those apply to the six core outputs above.

---

## Part 1 — Reusable `<InfoTip>` Component

A single tooltip primitive used by every placement in this brief.

### 1A. Component file

Create: `src/components/InfoTip/InfoTip.jsx`

### 1B. Behaviour requirements

- **Trigger element:** small ⓘ icon, 14px, color `var(--ink-light)`, hover state `var(--gold)`. Aligned to baseline of adjacent text.
- **Desktop:** opens on hover with 200ms delay; closes on mouseleave.
- **Touch / mobile:** opens on tap; closes on tap-outside or tap-on-trigger. Use `pointermove` event presence to detect touch context — same pattern as the nav v2 dropdown solution in `YDJ_NavRevision_DashboardViz_Implementation_Brief.md` Section 6.
- **Keyboard:** focusable; opens on Enter/Space; closes on Escape.
- **Position:** auto-flips above/below/left/right based on viewport edge proximity. Prefer above on desktop, below on mobile.
- **Max width:** 280px. Padding 12px 14px. Border-radius 8px. Background white, border 1.5px `var(--parchment-dark)`, box-shadow `0 4px 14px rgba(44,31,20,0.12)`.
- **Typography:** 13px `var(--font-sans)`, line-height 1.5, color `var(--ink-mid)`. Headings (if used) `var(--font-serif)` 14px italic.
- **No close X button.** Tooltips are passive — they close when the user moves on.

### 1C. Props

```jsx
<InfoTip
  content={ReactNode | string}      // required
  variant="default" | "voice"        // optional; "voice" applies left border in voice color
  voiceColor={string}                // hex, required when variant="voice"
  iconSize={14 | 16}                 // optional, default 14
  ariaLabel={string}                 // required for a11y
  triggerClassName={string}          // optional, for inline alignment tweaks
/>
```

### 1D. Accessibility

- Trigger has `role="button"`, `tabIndex={0}`, `aria-expanded`, `aria-describedby` pointing to the content panel ID.
- Content panel has `role="tooltip"`.
- On open via keyboard, do NOT auto-focus into the panel (panels are read-only); leave focus on trigger.

---

## Part 2 — Tooltip Placements

Five locations. Each placement specifies: **where**, **trigger**, **content**, and **data source for any dynamic values**.

### 2A. First Light Regenerate Button

**Page:** First Light output page (verify exact path with current routing).

**Trigger placement:** ⓘ immediately right of the "Regenerate" button label, same vertical alignment.

**Tooltip content (static):**
> First Light can be refreshed once after you add new data — a reflection, debrief, observation, or event log entry. It's designed for early-stage insights and retires automatically after your 5th debrief, when your full coaching outputs take over.

**Notes for implementer:**
- Confirm the actual regen-availability field name on the First Light document before wiring; this brief does not assume one. If a `regenerationsRemaining` (or equivalent) counter exists, append a dynamic line: *"You have N regeneration available."* Otherwise, ship the static copy above.
- If First Light has been retired for this user (debrief count ≥ 5), the regenerate button should not be visible at all — the tooltip is irrelevant in that state.

### 2B. Output Card Cadence Tooltips

**Page:** dashboard (`ydj-dashboard-v4.html`) — every output card in Block 2 (Weekly Focus) and any output entry points in Block 3 (Your Data > Review group).

**Trigger placement:** ⓘ next to each output card title.

**Tooltip content:** four lines per output, populated from Part 0. Each tooltip shows:

```
[Output name]
[One-sentence description from FAQ overview]
Refreshes: [cadence label from Part 0]
Last refreshed: [timestamp from output document, formatted "Mar 28"]
```

**Cadence labels (use these strings verbatim — no paraphrasing):**

| Output | Cadence label | Source field for "Last refreshed" |
|---|---|---|
| Journey Map | Auto-refresh on activity | `outputs/journeyMap.generatedAt` |
| Multi-Voice Coaching | Auto-refresh on activity | `outputs/multiVoiceCoaching.generatedAt` |
| Data Visualizations | Refreshes with Multi-Voice | derived from MVC document |
| Grand Prix Thinking | 30-day cycle | `analysis/grandPrixThinkingCycle/{userId}.cycleStartDate` + 30 days |
| Physical Guidance | 30-day cycle | `analysis/physicalGuidanceCycle/{userId}.cycleStartDate` + 30 days |
| Event Planner | On demand | event document timestamp |

**Tooltip body copy (third line) is the matching tooltip from Part 0** — Part 0 is the single source of truth.

**Notes for implementer:**
- Verify field names against the actual generation documents before implementing. The 30-day cycle paths are confirmed in `YDJ_GPT_Physical_30DayCycle_Implementation_Brief.md` Part 1A. The Multi-Voice Coaching path is confirmed in `YDJ_WeeklyFocus_Implementation_Brief.md` Step 4.
- If `generatedAt` is null (output never generated), show *"Not yet generated"* in place of the date; the cadence line stays.

### 2C. Coaching Voice Tooltips

**Pages:** every location that displays a voice icon + name. Confirmed locations:
- Multi-Voice Coaching output page (each voice section header)
- Voice annotations in Journey Map, Physical Guidance, GPT, Event Planner, Data Visualizations
- Weekly Focus card voice tags
- Outputs Tips & FAQ "Meet Your Coaching Team" section

**Trigger placement:** ⓘ next to the voice name (NOT next to every voice annotation — annotation tooltips would be visually noisy. One per page section is enough.)

**Tooltip variant:** `variant="voice"` with the voice's color as the left-border accent.

**Tooltip content (static, per voice):**

#### Classical Master
```
🎯 The Classical Master
"Why not the first time?"
Lens: Training Scale, classical principles, horse welfare, long-term development.
Lineage: Podhajsky, de Kunffy, Kyrklund.
```

#### Empathetic Coach
```
⭐ The Empathetic Coach
"You've got this."
Lens: Rider psychology, confidence, partnership, the human side of riding.
Lineage: Jane Savoie's work on the mental side of riding.
```

#### Technical Coach
```
🔬 The Technical Coach
"Did you feel that?"
Lens: Biomechanics, position, aids, timing, cause-and-effect.
Lineage: Beth Baumert, Sally Swift, Susanne von Dietze, Mary Wanless.
```

#### Practical Strategist
```
📋 The Practical Strategist
"Be accurate!"
Lens: Goals, timelines, training plans, competition prep, measurable progress.
Lineage: Reiner and Ingrid Klimke; the systematic German tradition.
```

**⚠ Color resolution required before building:**

The codebase has two different voice color systems in active use:

| Voice | `YDJ_Voice_Integration_Update.docx` | `ydj-learn-more-final.html` |
|---|---|---|
| Classical Master | `#5C4033` | `#5C7A4A` |
| Empathetic Coach | `#2E7D32` | `#C9784C` |
| Technical Coach | `#1565C0` | `#3B7DD8` |
| Practical Strategist | `#E65100` | `#8B5C9E` |

The Voice Integration Update spec is older; the learn-more-final palette is more recent and visually softer (matches the parchment aesthetic better). **Confirm with founder which set is the current source of truth before applying tooltip border colors.** Whichever is chosen, the same set must be used in:
- All `<InfoTip variant="voice">` borders
- The Outputs Tips & FAQ "Meet Your Coaching Team" cards (verify alignment with chosen set)
- Voice annotation rendering across all output pages

### 2D. Locked/Pending Output Tooltips

**Where:** any UI element that says "complete more debriefs to unlock," "more data needed," "pending," or similar.

**Trigger placement:** ⓘ next to the locked/pending label.

**Tooltip content varies by output**, because each output has its own unlock condition (per Part 0):

#### Multi-Voice Coaching / Journey Map / Data Visualizations
> Auto-refreshes once you've crossed the activity trigger — typically 10 debriefs (or a mix of debriefs and reflections). You're at [N] combined entries.

#### Grand Prix Thinking
> Available on Medium and Extended tiers. Once activated, generates as a 30-day program with internal 4-week progression.

#### Physical Guidance
> Available on Medium and Extended tiers. Once activated, generates as a 30-day program with internal 4-week progression.

#### Event Planner
> Generates when you submit an Event Preparation form for an upcoming event.

**Data source:** reuse the `useJourneyProgress.js` hook from the Quick Start Map (`QuickStartMap_Implementation_Brief.md` Section 4). The hook already exposes `debriefCount` and `reflectionsByCategory`. For "combined entries," compute `debriefCount + reflectionCount` from the hook's data.

**Notes for implementer:**
- If the output is already unlocked, do not render the locked-state tooltip at all. The cadence tooltip from Section 2B applies instead.
- For Working tier riders viewing GPT or Physical Guidance, the locked tooltip should be the tier-gating message above — not a count-based message. Tier check before count-based copy.

### 2E. Output Page Cadence Strip

**Pages:** each individual output page (Journey Map, MVC, GPT, Physical Guidance, Event Planner, Data Visualizations).

**Placement:** small horizontal strip immediately below the page H1, above the output content. Single line of metadata.

**Pattern:**
```
Last refreshed [date] · Next refresh [next-refresh copy from Part 0] · How this works ⓘ
```

**Per-output "Next refresh" copy** is defined in Part 0. Use those strings verbatim.

**Tooltip content for the trailing ⓘ:** the full Part 0 tooltip copy for that output. Pull verbatim — do not write new copy.

**Style:** strip uses `var(--ink-light)` text at 12px, no background, separator dots between segments. Subtle — must not compete with the output H1.

---

## Part 3 — Structural Moves

Three changes that go beyond tooltips. Each pulls existing FAQ content into a more useful context.

### 3A. Atomize "About This Output" into Per-Page Accordions

**What:** at the bottom of every output page (below the output content, above the page footer), add a collapsed accordion: *"About this output"*. When expanded, it contains the matching FAQ section copied verbatim from `ydj-outputs-tips-and-faq.html` (v1.1 — corrected cadences).

**Mapping:**

| Output page | Source section in FAQ page |
|---|---|
| Journey Map | `#journey-map` section |
| Multi-Voice Coaching | `#multi-voice` section |
| Data Visualizations | `#data-viz` section |
| Grand Prix Thinking | `#grand-prix` section |
| Physical Guidance | `#physical` section |
| Event Planner | `#event-planner` section |

**Implementation:**
- Create a shared `<AboutThisOutput slug="multi-voice" />` component that fetches the relevant section content. Two reasonable approaches:
  1. Pull the section as static content from a new `aboutOutputs.json` constants file (preferred — versioned with the codebase, no FAQ page dependency).
  2. Render the FAQ page as a CMS-like source via fragment ID. Discouraged — couples output pages to a marketing page.
- Default state: collapsed. Heading: *"About this output"* — Playfair Display 16px, with a chevron rotating on expand.
- When expanded, content uses the same prose styles as the FAQ page itself.

**Important — content sync:** Use the v1.1 FAQ as the source. The "Generated:" emphasis blocks at the end of each FAQ section now contain the corrected cadence language and must be included in the accordion content verbatim.

**The Outputs Tips & FAQ page stays as it is.** It becomes the consolidated reference; the per-output accordions become the primary in-context explainers.

### 3B. Empty States as Explainers

**Where:** every place a card or section displays "no data yet," "pending," or an empty state for an output that hasn't been generated.

**Audit list:**
- Dashboard Block 2 — Weekly Focus cards in pending state (per `YDJ_WeeklyFocus_Implementation_Brief.md` "Loading states" section)
- Each individual output page when its document doesn't exist
- Event Planner when no upcoming event exists
- Show Planner when no upcoming show exists

**Pattern (replace existing empty-state copy with this structure):**

For activity-triggered outputs (MVC, Journey Map, Data Viz):
```
[Icon — output's existing icon]
[Output Name]
[1-sentence description of what this output is]
You're at [current combined-entry count]. Auto-refreshes once you cross the activity trigger.
```

For tier-gated 30-day cycle outputs (GPT, Physical Guidance):
```
[Icon — output's existing icon]
[Output Name]
[1-sentence description of what this output is]
Available on Medium and Extended tiers. [Upgrade link if Working tier]
```

For event-triggered outputs (Event Planner):
```
[Icon — output's existing icon]
[Output Name]
[1-sentence description of what this output is]
Submit an Event Preparation form to generate your first plan.
```

**Notes for implementer:**
- Pull the 1-sentence description from each output's existing card description in the dashboard or the Tips & FAQ overview cards.
- Use the same `useJourneyProgress` hook for the count.
- Where a static preview/sample doesn't exist, omit any preview link. Do not build sample previews as part of this brief.
- The current dashboard "no upcoming show" state (`.no-show-state` in `ydj-dashboard-v4.html`) already follows this pattern reasonably well. Bring the others into alignment.

### 3C. Persistent "Today" Status Line on Dashboard

**Where:** dashboard page, immediately above the Patterns block (Block 1 in `ydj-dashboard-v4.html`). Single line. Always visible.

**Content (computed from live data):**

Three states, in priority order:

**State 1 — pre-first-output (combined entries < 10 AND no journey event in 60 days):**
```
Today: [X] debriefs · [Y] of 6 reflection categories · [Remaining count] entries to your next coaching refresh
```

**State 2 — outputs active, recent activity:**
```
Today: last debrief [relative date, e.g., "2 days ago"] · [Y] entries this week
```

**State 3 — outputs active, no recent activity (>14 days since last debrief):**
```
Welcome back. Last ride logged [date]. Ready to log a new one?
```

**Style:**
- 13px, `var(--ink-mid)`, italic Playfair Display only on the first word ("Today:" / "Welcome back.").
- Centered, full-width strip with subtle bottom border.
- No background fill — should feel like a quiet status line, not a banner.

**Data source:** `useJourneyProgress` hook for counts; query last debrief date from `users/{uid}/debriefs` (existing query — already used elsewhere on the dashboard). For State 1 "Remaining count," compute against the 10-combined-entries trigger from Part 0 (Multi-Voice / Journey Map auto-regen activity threshold).

**Notes for implementer:**
- Do NOT duplicate the macro progress shown in the Quick Start Map. This is a single-line summary; the Quick Start Map remains the deep view.
- Do NOT show this line on any page other than the dashboard.
- "Entries this week" in State 2 = sum of debriefs + reflections + observations + lesson notes + journey events submitted in the trailing 7 days.

---

## Part 4 — What NOT to Build

- No new video content. Audio clips are a possible future direction but are out of scope for this brief.
- No replacement for the Quick Start Map. The dashboard status line in Section 3C is a one-line summary, not a competing journey view.
- No restructure of the Outputs Tips & FAQ page. It stays. The atomized accordions in Section 3A pull from it; they don't replace it.
- No tooltip on every voice annotation block. One voice tooltip per page section, on the voice name itself. More than that creates visual noise.
- No new copy. Every tooltip and accordion in this brief sources its content from existing files (`ydj-outputs-tips-and-faq.html` v1.1, `CLAUDE.md`, `YDJ_AI_Coaching_Voice_Prompts_v3.md`, `YDJ_Pricing_Discounts_Consolidation_v2.md`). If you find yourself writing new explanatory copy, stop and surface the question to the founder.
- No tooltip on the Quick Start Map itself. The map *is* the explainer for the macro journey; layering tooltips on it would be redundant.
- **No Self-Assessment Analysis tooltip, accordion, or empty state.** That output does not exist in the platform. If you see references in older project files, ignore them.

---

## Part 5 — Resolve Before Building

1. **Voice color system** (Section 2C) — confirm canonical hex set: Voice Integration Update (`#5C4033`, `#2E7D32`, `#1565C0`, `#E65100`) or learn-more-final (`#5C7A4A`, `#C9784C`, `#3B7DD8`, `#8B5C9E`).
2. **First Light regen counter field name** (Section 2A) — verify the actual field exposed on the First Light document before wiring the dynamic count line in the tooltip. If no field exists, ship the static copy.
3. **First Light page route** (Section 2A) — confirm the route/file path for the First Light output page; not directly visible in the project files reviewed.
4. **About This Output content source** (Section 3A) — confirm preference for the static `aboutOutputs.json` approach versus a fragment-based pull. Recommendation: static file.
5. **Data Visualizations card placement** (Part 0 / Section 2B) — confirm whether Data Visualizations has its own dashboard card or is embedded inside the Multi-Voice Coaching output. Determines whether Section 2B applies a separate tooltip to it.

---

## Part 6 — Implementation Checklist

### Component foundation
- [ ] Build `<InfoTip>` component with desktop hover, touch tap, keyboard support
- [ ] Implement auto-flip positioning with viewport edge detection
- [ ] Add `variant="voice"` with left-border color prop
- [ ] Verify a11y: `role`, `aria-expanded`, `aria-describedby`, Escape-to-close
- [ ] Storybook or test page with all variants documented

### Tooltip placements (Part 2)
- [ ] **2A** — First Light regenerate button tooltip (verify regen field first)
- [ ] **2B** — Cadence tooltip on each output card on the dashboard (6 outputs — Journey Map, MVC, Data Viz, GPT, Physical Guidance, Event Planner)
- [ ] **2C** — Voice tooltip on each voice name on Multi-Voice Coaching page (4 voices)
- [ ] **2C** — Voice tooltip on voice section headers in Journey Map, GPT, Physical Guidance, Event Planner, Data Visualizations
- [ ] **2C** — Voice tooltip on voice tags in Weekly Focus cards
- [ ] **2D** — Locked/pending tooltip wired to `useJourneyProgress`, with per-output copy from Part 0 + tier-gating logic for GPT/Physical Guidance
- [ ] **2E** — Cadence strip below H1 on each of 6 output pages

### Structural moves (Part 3)
- [ ] **3A** — Create `aboutOutputs.json` constants file with content extracted from `ydj-outputs-tips-and-faq.html` v1.1 (no Self-Assessment section)
- [ ] **3A** — Build `<AboutThisOutput slug={...} />` accordion component
- [ ] **3A** — Add the accordion to all 6 output pages (mapping in 3A)
- [ ] **3B** — Audit existing empty states and replace with the appropriate explainer pattern (activity-triggered / tier-gated / event-triggered)
- [ ] **3C** — Build `<TodayStatus />` strip; mount on dashboard above Patterns block; wire to `useJourneyProgress` and last-debrief query

### Verification
- [ ] All tooltips work on mobile (touch tap, tap-outside-to-close)
- [ ] All tooltips close on Escape; trigger remains focused
- [ ] No tooltip exceeds 280px width on any device
- [ ] Voice colors match the resolved canonical set across MVC page, voice annotations, voice tooltips, and FAQ page
- [ ] Cadence "Last refreshed" displays correctly when output document doesn't exist
- [ ] Locked-state tooltip disappears once an output is unlocked
- [ ] Tier-gated outputs (GPT, Physical Guidance) show tier-gating message for Working tier riders, not count-based message
- [ ] Dashboard `<TodayStatus />` correctly transitions through all 3 states
- [ ] About This Output accordion content matches FAQ page (v1.1) verbatim
- [ ] Empty-state explainer copy is consistent across all 4+ surfaces and matches the appropriate pattern (activity / tier / event)
- [ ] No Self-Assessment Analysis surface anywhere in the implementation

### Regression checks
- [ ] Quick Start Map unchanged, still routable, still functional
- [ ] Outputs Tips & FAQ page (v1.1) unchanged after this implementation
- [ ] Dashboard nudge logic unchanged
- [ ] No new Firestore reads added — all data comes from existing hooks/queries
- [ ] No copy in the implementation contradicts `YDJ_Pricing_Discounts_Consolidation_v2.md` Part 2

---

## Part 7 — Why These Specific Choices

A short note for the implementer: this brief deliberately does not propose new explanatory content because the platform already has it. Anna's "what does 'one regenerate available' mean?" was answerable from existing FAQ content; the failure was that she couldn't find it from where she was standing. Every change in this brief moves existing content closer to where the question actually forms — six pixels from the regenerate button, on the output card itself, beside the voice name. Tooltips, accordions, and a status line are not features. They are relocation moves that make the documentation invisible until it's needed.

The result, if implemented well, is a platform that feels like it explains itself — without making anyone read a manual.

---

*End of brief. Reference `ydj-dashboard-v4.html`, `ydj-outputs-tips-and-faq.html` (v1.1), `ydj-quickstart-map.html`, `CLAUDE.md`, `YDJ_AI_Coaching_Voice_Prompts_v3.md`, and `YDJ_Pricing_Discounts_Consolidation_v2.md` Part 2 for source content. Reference `QuickStartMap_Implementation_Brief.md` Section 4 for the `useJourneyProgress` hook signature. Do not duplicate existing data layers.*
