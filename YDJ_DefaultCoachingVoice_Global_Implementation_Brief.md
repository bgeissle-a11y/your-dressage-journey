# YDJ Implementation Brief: Default Coaching Voice (Global) + Settings Copy Updates

**Status:** Ready for Claude Code
**Scope:** Frontend only. No prompt changes, no AI changes, no Firestore schema changes.
**Risk level:** Low. UI behavior + copy changes only.

This brief covers two related Settings page changes that should ship together:

- **Part A:** Make the existing "Focus Mode Default Voice" setting also drive the active tab in the Full (tabbed) Coaching Perspectives view, globally everywhere voices appear as tabs.
- **Part B:** Rename "Weekly Coach Brief" to "Pre-Lesson Summary" everywhere on the Rider Settings page, AND correct the language to reflect that there is no automatic delivery today — sending is rider-triggered.

---

## Important: source of truth

The mockup file `rider-settings.html` in the project has drifted from the deployed code. The deployed strings (visible in production at `your-dressage-journey.web.app/settings`) are the source of truth for find-and-replace targets in this brief. **Read the live code first** before making changes. Use grep to locate all occurrences — there may be additional instances beyond what's listed here.

## Note on naming consistency (do NOT change)

The platform uses two terms intentionally:
- **"Lesson Prep"** — used in the menu / nav
- **"Pre-Lesson Summary"** — used on the page itself and in other contexts

This is intentional. **Do not** "fix" this by aligning the menu and page labels. Settings page copy in this brief uses "Pre-Lesson Summary" because that's what the rider sees inside the feature.

---

# PART A — Default Coaching Voice, applied globally

## What this changes

Today, when a rider opens any view that displays the four coaching voices as tabs (Coaching Perspectives in Insights, Multi-Voice Coaching outputs, etc.), **The Classical Master tab is always active by default**. The rider can click to other tabs but has to do that every time.

The setting `defaultVoice` already exists in Rider Settings → App Preferences → "Focus Mode Default Voice". Today it only governs which voice appears first when the rider has Focus mode enabled. **This brief extends that same setting to also govern which tab is active on initial load in the Full (tabbed) view, everywhere voices appear as tabs.**

---

## What this does NOT change

Read these carefully — these are guardrails, not goals:

1. **Voice content does not change.** The same four AI outputs are generated. The same prompts run. The same cached outputs are read.
2. **Voice tab order does not change.** Tabs always render left-to-right in canonical order: Classical → Empathetic → Technical → Practical Strategist. The rider's preference only changes which tab is *active* when the view first loads.
3. **The rider can still click any tab at any time.** Nothing is hidden. Nothing is gated. This is purely about which tab opens first.
4. **No existing rider's experience breaks.** Riders who haven't set a preference (or have it set to `all` / "All Voices") continue to land on Classical Master, exactly as today.
5. **Focus mode behavior is unchanged.** This setting already drives Focus mode; that logic stays exactly as-is.
6. **No backend, no prompt, no Firestore schema changes.** The `defaultVoice` field already exists on the rider's settings object.

---

## Files to change — Part A

### A1. Settings page — relabel the existing setting

The setting is currently labeled scoped to Focus mode only. Update its label and hint so riders understand it now applies globally.

**Find** (deployed copy, per screenshot):
- Label: `Focus Mode Default Voice`
- Hint: `Which coach leads when Focus Mode is active. You can always switch.`

**Replace with:**
- Label: `Default Coaching Voice`
- Hint: `Which voice opens first when you view your coaching outputs. Applies in both Full and Focus modes. You can always switch tabs. Choose "All Voices" to default to The Classical Master.`

The dropdown options stay exactly as they are: `All Voices`, `The Classical Master`, `The Empathetic Coach`, `The Technical Coach`, `The Practical Strategist`.

No JS changes needed in the settings page — the existing save/load logic for `defaultVoice` is unchanged.

---

### A2. Coaching Perspectives component (Insights → Coaching tab)

This is the component shown at `/insights?tab=coaching`. Locate the component that renders the four voice tabs.

**Current behavior:** Component initializes with `activeTab = 'classical'` (or equivalent) hard-coded.

**New behavior:**

```javascript
// On component mount / initial render:
// 1. Read riderSettings.defaultVoice (already loaded with rider doc)
// 2. Map to active tab:
//    - 'classical' | 'empathetic' | 'technical' | 'strategist' → use that voice
//    - 'all' | undefined | null | any unrecognized value → fall back to 'classical'
// 3. Set as initial active tab.

const VALID_VOICES = ['classical', 'empathetic', 'technical', 'strategist'];

function getInitialActiveVoice(riderSettings) {
  const pref = riderSettings?.defaultVoice;
  return VALID_VOICES.includes(pref) ? pref : 'classical';
}

// Usage in component init:
const [activeVoice, setActiveVoice] = useState(getInitialActiveVoice(riderSettings));
```

**Important:**
- Tab render order does NOT change. Map over `VALID_VOICES` in canonical order when rendering tab buttons.
- After initial mount, `activeVoice` is controlled by the rider clicking tabs, exactly as today. The preference only seeds the initial state.
- If the rider has Focus mode enabled in settings, that takes precedence and follows existing Focus-mode logic. This brief does not touch Focus mode.
- Verify the value Firestore stores for "Practical Strategist" — the dropdown saves as `strategist` (per `rider-settings.html` line 880). The Coaching Perspectives component must use the same key. If the component currently uses a different key (e.g., `practical`), align both to a single value, or add a small alias map. **Do not introduce a new key.**

---

### A3. Any other view rendering voice tabs

**Audit and apply the same pattern to every voice-tabbed view.** This is the "globally" requirement.

Known candidates (verify in code; apply the same `getInitialActiveVoice()` helper):

- Insights → Coaching Perspectives (primary case, screenshot)
- Multi-Voice Coaching output displays anywhere they render as tabs
- Any cached output viewer that surfaces voices as a tabbed UI
- Any future component rendering the four voices as tabs

**Recommendation:** Extract `getInitialActiveVoice()` and `VALID_VOICES` into a shared utility (e.g., `src/utils/voicePreferences.js`) so every voice-tab component imports the same logic. This prevents drift if the canonical voice list ever changes.

**Do NOT apply this to:**
- Pre-Lesson Summary (single-voice or merged output, not tabbed)
- Practice Card (not a multi-voice tabbed view)
- Any output where voices are rendered stacked/sequential rather than tabbed
- Weekly Focus surface excerpts (not tabbed voice display)

If in doubt: **if the UI shows the four voices as clickable tabs and only one panel is visible at a time, apply this. Otherwise, don't touch it.**

---

## Edge cases — Part A

| Case | Behavior |
|---|---|
| Rider has never opened settings | `defaultVoice` is undefined → falls back to `'classical'`. Identical to today. |
| Rider's `defaultVoice` is `'all'` | In a tabbed view, only one tab can be active at a time → falls back to `'classical'`. The "All Voices" label is meaningful in Focus-mode context (means "don't force focus, show full view") but in Full view there's no "all tabs active" state. |
| Rider's `defaultVoice` is malformed/legacy value | Falls back to `'classical'`. |
| Rider changes preference in settings while another tab is open with Coaching Perspectives | No live update required. Preference takes effect on next load of the view. |

---

# PART B — Rename "Weekly Coach Brief" → "Pre-Lesson Summary" + correct sharing language

## Why

The Weekly Coach Brief has been retired and merged into the Pre-Lesson Summary. The Settings page → Coach Sharing section currently uses the retired name AND describes a delivery mechanism that doesn't exist: there is **no automatic delivery** to coaches today.

How sharing actually works today:
- The rider opens the Pre-Lesson Summary.
- A link on the summary itself ("Share with coach →") triggers a manual email send.
- That mechanism works.
- There is no scheduled, weekly, or per-lesson automatic send to coaches.
- Automatic delivery is a planned future enhancement.

The Coach Sharing section in Settings is preserved because it's the natural home for managing coach contacts and sharing preferences once automatic delivery exists. Keep the structure; correct the copy so it does not mislead riders into thinking sends happen automatically.

## Scope

This brief covers **only the Rider Settings page**. Other pages or features that may still reference "Weekly Coach Brief" are out of scope here and should be addressed in their own briefs.

## Find and replace — Coach Sharing section

The deployed copy in this section (per screenshot at `your-dressage-journey.web.app/settings`):

| Location | Current copy | Replace with |
|---|---|---|
| Section subtitle / description under "Coach Sharing" | `Share your Weekly Coach Brief with your trainers` | `Manage which coaches you can share your Pre-Lesson Summary with` |
| Disclosure / info box (top of section) | `When sharing is on, your coach receives a weekly training summary — themes, focus areas, and questions you've flagged for them. They do **not** see your full reflections, raw notes, or personal debrief entries.` | `Today, you send your Pre-Lesson Summary to a coach manually using the "Share with coach" link on the summary itself — there is no automatic delivery. Adding coaches here keeps your sharing preferences on file. Automatic delivery is a planned future enhancement. When you do share, your coach receives only the Pre-Lesson Summary — never your full reflections, raw notes, or personal debrief entries.` |
| Per-coach toggle label | `Share Weekly Coach Brief` | `Sharing enabled` |
| Per-coach toggle tooltip / `title` attribute | `Share Weekly Coach Brief with [Name]` | `Pre-Lesson Summary sharing with [Name]` |
| "Sharing on since [date]" status line | (no change — this is a consent timestamp, still meaningful) | (no change) |
| Link to view/send | `View & Send Weekly Brief →` | `View & Send Pre-Lesson Summary →` |
| Withdrawal disclaimer | `You can withdraw sharing consent at any time by toggling off. Your coach will stop receiving briefs immediately. You can re-enable at any time.` | `You can withdraw sharing consent at any time by toggling off — your sharing preferences update immediately. You can re-enable at any time.` |
| Add-coach consent note (in the "Add a coach" form) | `Your coach will receive a copy of your Weekly Coach Brief when sharing is on. You can turn sharing off or remove the coach at any time. YDJ will never contact your coach for any other purpose.` | `Adding a coach lets you share your Pre-Lesson Summary with them — today using the "Share with coach" link on each summary, and through automatic delivery in a future update. You can turn sharing off or remove the coach at any time. YDJ will never contact your coach for any other purpose.` |

## Routing / link target check

The "View & Send Pre-Lesson Summary" link previously pointed to the Weekly Coach Brief view. Verify it now points to the Pre-Lesson Summary view (the route corresponding to `ydj-pre-lesson-summary.html` per project knowledge — likely `/lesson-prep` or similar in the deployed app, since the menu uses "Lesson Prep"). If the link still points to a retired Weekly Coach Brief route, update it to the Pre-Lesson Summary route.

## What to NOT change

- Date stamps and consent timestamps remain as-is (e.g., "Sharing on since March 21, 2026"). Existing consent records are still valid; this is a feature rename, not a re-consent event.
- Coach email addresses, coach names, and the underlying data model remain unchanged.
- The toggle's behavior (on/off, persistence to Firestore) is unchanged. The toggle still records consent; today that consent is forward-looking, but the storage mechanism is the same.
- The `coaches` array in `collectSettings()` and any Firestore field names remain unchanged.
- Other pages that may reference "Weekly Coach Brief" are out of scope here.
- The "Lesson Prep" menu label stays as "Lesson Prep". Do not rename it to "Pre-Lesson Summary" — this dual-naming is intentional.

## Search for stragglers

After making the explicit replacements above, grep the Rider Settings code for any remaining instances of:
- `Weekly Coach Brief`
- `Weekly Brief`
- `weekly brief`
- `weekly training summary`
- `weeklyBrief` (only in user-facing strings; leave variable/field names alone unless they're unambiguously safe to rename)

Apply the same rename to any user-facing strings found. **Do not rename internal variable names, function names, or Firestore field names** as part of this brief — that's a larger refactor and out of scope.

Also grep for any user-facing language that implies automatic delivery (e.g., "your coach will receive", "your coach receives", "sent each week", "weekly summary"). Update to match the rider-triggered framing above, or remove if redundant.

---

# Combined QA checklist

Before marking complete, verify:

**Part A — Voice default:**
- [ ] Settings label and hint updated.
- [ ] Setting saves and loads correctly (no regression on existing logic).
- [ ] Coaching Perspectives view opens to the rider's preferred voice tab when set.
- [ ] Coaching Perspectives view opens to Classical Master when preference is unset, `'all'`, or invalid.
- [ ] Tab render order is unchanged: Classical → Empathetic → Technical → Practical Strategist.
- [ ] Clicking other tabs works exactly as before.
- [ ] **Voice content (the actual coaching text) is identical to before — no changes to what each voice says.**
- [ ] Focus mode behavior is unchanged.
- [ ] No console errors when `riderSettings` is loading or undefined.
- [ ] All other tabbed voice views (audit step A3 above) updated consistently.
- [ ] Existing pilot riders see no change in behavior unless they explicitly set a preference.

**Part B — Pre-Lesson Summary rename + accurate language:**
- [ ] All listed strings in the Coach Sharing section updated.
- [ ] Grep results show no remaining user-facing references to "Weekly Coach Brief" or "Weekly Brief" on the Settings page.
- [ ] No remaining language implying automatic delivery to coaches.
- [ ] "View & Send Pre-Lesson Summary" link points to the correct active route.
- [ ] Existing coach sharing consent records unchanged (timestamps preserved, toggles preserve state).
- [ ] Add-coach form copy updated.
- [ ] Internal variable/field names untouched (no schema impact).
- [ ] "Lesson Prep" menu label is unchanged.

---

# Rollout note

Both parts are safe to ship together without a migration. The voice-default fallback ensures every existing rider's experience is identical to today until they opt into a different default voice. The Pre-Lesson Summary rename is a copy-only change with no data implications. The corrected sharing language brings the UI in line with what the platform actually does today, removing a misleading promise of automatic delivery.
