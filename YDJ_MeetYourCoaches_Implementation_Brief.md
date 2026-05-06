# YDJ Meet Your Coaches Page — Implementation Brief
## Learn Section Addition
### May 2026

---

## Overview

A static educational page for the in-app Learn section: brief self-introductions
from the four coaching voices (Classical Master, Empathetic Coach, Technical
Coach, Practical Strategist). Each voice's card displays its canonical Lens,
Lineage, signature quote, and a first-person introductory paragraph.

This page is the **canonical reference card** for each voice across the app.
Tooltips, output cards, and any other surface that names a voice should align
with the content here. Together with Recommended Reading, this forms a small
"about the voices" cluster in Learn.

**Route:** `/learn/your-coaches`
**Nav label:** `Meet Your Coaches`
**Reference prototype:** `ydj-meet-your-coaches.html` (in project knowledge,
attached)
**Tier access:** All tiers (Working, Medium, Extended). No gating.
**Auth:** Logged-in users only (consistent with rest of Learn section).
**Companion page:** `/learn/recommended-reading` (cross-linked from this page's
footer card).

---

## Part 1 — Canonical Voice Data

The following must match exactly across this page, the tooltip system, and any
other voice-surfacing UI. If any value below conflicts with a value in another
file, **this brief and the tooltip spec are the source of truth.**

### 1.1 Voice Identity Reference

| Voice | Emoji | Color (canonical from `aiService.js` `VOICE_META`) | Quote |
|---|---|---|---|
| Classical Master | 🎯 | `#5C4033` | "Why not the first time?" |
| Empathetic Coach | ⭐ | `#C67B5C` | "You've got this." |
| Technical Coach | 🔬 | `#6B8E5F` | "Did you feel that?" |
| Practical Strategist | 📋 | `#4A6274` | "Be accurate!" |

### 1.2 Canonical Lens & Lineage Strings

These exact strings must appear on each card and must match the tooltip
spec verbatim:

**Classical Master**
- Lens: Training Scale, classical principles, horse welfare, long-term development
- Lineage: Podhajsky, de Kunffy, Kyrklund

**Empathetic Coach**
- Lens: Rider psychology, confidence, partnership, the human side of riding
- Lineage: Jane Savoie

**Technical Coach**
- Lens: Biomechanics, position, aids, timing, cause-and-effect
- Lineage: Beth Baumert, Sally Swift, Susanne von Dietze, Mary Wanless

**Practical Strategist**
- Lens: Goals, timelines, training plans, competition prep, measurable progress
- Lineage: Reiner and Ingrid Klimke; the systematic German tradition

### 1.3 Treat the Introductory Paragraphs as Fixed Copy

Each voice's first-person introduction has been written in that voice's
deliberate register and reviewed for tone consistency with the AI-generated
outputs. Do not paraphrase, summarize, or "tighten" any of the four
paragraphs. They are fixed copy.

---

## Part 2 — Component Conversion

### 2.1 Source File

The prototype `ydj-meet-your-coaches.html` is a complete, self-contained
HTML page. Convert it to a React component at:

```
src/pages/learn/MeetYourCoaches.jsx
```

(Adjust path to match the existing Learn-section folder structure — match
whatever pattern is already in use for other Learn pages.)

### 2.2 HTML → JSX Conversion

Standard React conversions:

- `class=` → `className=`
- All `<br>`, `<img>` etc. → self-closing JSX form
- HTML entities — keep as-is in JSX strings or convert to literal characters;
  either works
- The `<style>` block in `<head>` → CSS module:
  `src/pages/learn/MeetYourCoaches.module.css`

The CSS already uses CSS custom properties (`--brown`, `--classical`, etc.)
scoped via `:root` — these can stay as-is in the module and will work without
modification.

**Shared styling consideration:** This page and `RecommendedReading.jsx` use
the same CSS variables and most of the same nav, hero, and voice-card
styles. If both pages are being built together (or this is built second),
consider extracting the shared styles into:

```
src/pages/learn/learn-shared.module.css
```

…and have both pages import it. This is optional; if extracting the shared
module would slow the build, ship duplicated styles and refactor later.

### 2.3 Routing & Links

Replace the prototype's three `<a>` tags with React Router `<Link>` components:

```jsx
import { Link } from 'react-router-dom';

// Nav brand
<Link to="/learn" className="nav-brand">
  Your Dressage <span>Journey</span>
</Link>

// Nav back link
<Link to="/learn" className="nav-back">Back to Learn</Link>

// Cross-link to Recommended Reading (in the .cross-link card at the bottom)
<Link to="/learn/recommended-reading">See Recommended Reading</Link>
```

If the Learn hub route is different (`/dashboard/learn`, `/app/learn`, etc.),
substitute accordingly. The cross-link target must match wherever the
Recommended Reading page is registered.

### 2.4 No Re-import of Fonts

Strip `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, `<title>`, and the Google
Fonts `<link>` tag during conversion.

The Google Fonts (Playfair Display + Work Sans) are already loaded elsewhere
in the YDJ app — do not re-import them in this component.

---

## Part 3 — Nav / Learn Hub Integration

### 3.1 Add to Learn Hub

The Learn hub page needs a new card pointing to this page. Place it adjacent
to the Recommended Reading card so the two related pages cluster visually.

**Card title:** Meet Your Coaches
**Card subtitle / preview:** The four voices that shape every output —
in their own words.
**Icon suggestion:** A grouping of the four voice emojis (🎯 ⭐ 🔬 📋), or
a single neutral icon if the hub uses one icon per card.
**Route target:** `/learn/your-coaches`

Match the visual treatment of existing Learn hub cards. Do not introduce a
new card style.

### 3.2 Router Registration

Register the route in the app's router config:

```jsx
{
  path: '/learn/your-coaches',
  element: <MeetYourCoaches />,
}
```

Wrap in whatever auth guard / layout wrapper the rest of the Learn section
already uses.

---

## Part 4 — Cross-Surface Alignment Audit

This page formalizes canonical voice data that several other surfaces in the
app should agree with. After building this page, do a verification pass:

### 4.1 Tooltip Spec (Most Important)

The InfoTip `variant="voice"` tooltips should display content matching the
Lens and Lineage strings in Section 1.2 of this brief. If any tooltip's
text drifts from the canonical strings, update the tooltip — not this page.

### 4.2 Outputs Tips & FAQ — "Meet Your Coaching Team"

If the existing Outputs Tips & FAQ page (`ydj-outputs-tips-and-faq.html`)
has a "Meet Your Coaching Team" section, verify that:

- Emojis match (🎯 ⭐ 🔬 📋)
- Colors match the `aiService.js` set
- Quotes match
- Lens / Lineage descriptions don't contradict Section 1.2

Misalignments are bugs against this brief and should be fixed in the FAQ,
not here.

### 4.3 Output Cards (Multi-Voice Coaching, GPT, Physical Guidance, etc.)

Anywhere a voice icon appears on an output card, confirm the emoji matches
this canonical set. The previous emoji set (🏛️ 💛 🎯 📋) is deprecated and
should not appear anywhere in the codebase.

### 4.4 `learn-more-final.html` and Marketing Pages

Public marketing pages that reference the four voices should also use the
canonical emojis and colors. If a stale set is found, log it for cleanup
(does not need to block this brief from shipping).

---

## Part 5 — Verification Checklist

Before pushing to Firebase Hosting, verify:

- [ ] Page renders at `/learn/your-coaches` for a logged-in user
- [ ] All four coach cards display in this order:
  1. 🎯 Classical Master
  2. ⭐ Empathetic Coach
  3. 🔬 Technical Coach
  4. 📋 Practical Strategist
- [ ] Card colors use the canonical `aiService.js` set:
  - Classical `#5C4033`, Empathetic `#C67B5C`, Technical `#6B8E5F`,
    Strategist `#4A6274`
- [ ] Each card's Lens and Lineage strings match Section 1.2 verbatim
- [ ] Each card's signature quote appears in the card footer
- [ ] Cross-link card at the bottom links to
  `/learn/recommended-reading` and resolves correctly
- [ ] Nav back-link returns to the Learn hub
- [ ] Mobile breakpoint (≤600px) renders without horizontal scroll
- [ ] Fonts (Playfair Display headers, Work Sans body) load correctly
- [ ] Subtle paper-texture background overlay is visible but not distracting
- [ ] New "Meet Your Coaches" card appears on the Learn hub
- [ ] Page is accessible at all three subscription tiers
- [ ] No console errors

---

## Part 6 — What This Page Is Not

To prevent scope creep:

- **Not interactive.** No hover states beyond standard link styling, no
  click-to-expand, no audio samples of the voices. Pure static content.
- **Not personalized.** The same content displays for every rider regardless
  of level, tier, or history.
- **Not generated.** This is hand-authored static content, not AI output. No
  promptBuilder integration, no Cloud Function, no token cost.
- **Not a voice picker.** This page does not let riders select a "preferred
  voice" or hide a voice. The four voices remain on by default in all
  multi-voice outputs.
- **Not a tooltip replacement.** The InfoTip tooltips remain in place across
  the app for in-context voice info. This page is the deeper read.

---

## Notes for Claude Code

- This is a **static content page** — the second of two related Learn
  pages. If `RecommendedReading.jsx` is already built, the styling
  patterns are already established and this should be quick.
- Estimated effort: 30–45 minutes including nav integration and
  smoke-test. Less if shared styles are already extracted.
- The four canonical emojis (🎯 ⭐ 🔬 📋) are non-negotiable. They were
  chosen to align with the InfoTip tooltip spec and must not be
  substituted for "better-looking" alternatives during conversion.
- The cross-link card at the bottom is intentional — it pairs this
  page with Recommended Reading. Do not remove it.
- If the canonical voice colors in `aiService.js` `VOICE_META` ever
  change, this page must be updated to match — `aiService.js` remains
  the source of truth for color values.
