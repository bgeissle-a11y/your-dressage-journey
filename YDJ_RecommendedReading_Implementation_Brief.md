# YDJ Recommended Reading Page — Implementation Brief
## Learn Section Addition
### May 2026

---

## Overview

A static educational page for the in-app Learn section: book recommendations
from the four coaching voices. Each voice presents 4–5 titles in their own
register (Classical Master, Empathetic Coach, Technical Coach, Practical
Strategist). No AI calls, no Firestore reads/writes, no tier gating — pure
content with the YDJ design system applied.

**Route:** `/learn/recommended-reading`
**Nav label:** `Recommended Reading`
**Reference prototype:** `ydj-recommended-reading.html` (in project knowledge,
attached)
**Tier access:** All tiers (Working, Medium, Extended). No gating.
**Auth:** Logged-in users only (consistent with rest of Learn section).

---

## Part 1 — Component Conversion

### 1.1 Source File

The prototype `ydj-recommended-reading.html` is a complete, self-contained
HTML page. Convert it to a React component at:

```
src/pages/learn/RecommendedReading.jsx
```

(Adjust path to match the existing Learn-section folder structure — match
whatever pattern is already in use for other Learn pages such as Tips & FAQ.)

### 1.2 HTML → JSX Conversion

Standard React conversions:

- `class=` → `className=`
- All `<br>`, `<img>` etc. → self-closing JSX form
- HTML entities (`&amp;`, `&mdash;`, etc.) — keep as-is in JSX strings or
  convert to literal characters; either works
- The `<style>` block in `<head>` can either:
  - **Option A (preferred):** Move to a CSS module:
    `src/pages/learn/RecommendedReading.module.css`
  - **Option B:** Keep as a single `<style>` block in the component using
    `dangerouslySetInnerHTML` — less clean but avoids token reflow

Use **Option A**. The CSS already uses CSS custom properties (`--brown`,
`--classical`, etc.) scoped via `:root` — these can stay as-is in the module
and will work without modification.

### 1.3 Routing & Links

The prototype contains two `<a href="/learn">` links (nav brand, back link).
Replace both with React Router `<Link>` components pointing to whatever the
Learn hub's actual route is:

```jsx
import { Link } from 'react-router-dom';

<Link to="/learn" className="nav-brand">Your Dressage <span>Journey</span></Link>
<Link to="/learn" className="nav-back">Back to Learn</Link>
```

If the Learn hub route is different (`/dashboard/learn`, `/app/learn`, etc.),
substitute accordingly.

### 1.4 No Removal of `<head>` Content

The prototype is a full HTML document. When converting to a React component,
strip out: `<!DOCTYPE>`, `<html>`, `<head>`, `<body>`, `<title>`, and the
Google Fonts `<link>` tag.

The Google Fonts (Playfair Display + Work Sans) are **already loaded
elsewhere in the YDJ app** — do not re-import them in this component. If for
some reason they aren't loaded globally, add the import to the app shell, not
to this component.

---

## Part 2 — Nav / Learn Hub Integration

### 2.1 Add to Learn Hub

The Learn hub page (wherever it lives — likely a card grid or list of
educational resources) needs a new entry pointing to this page.

**Card title:** Recommended Reading
**Card subtitle / preview:** From your four coaches — the books they most
often press into a rider's hands.
**Icon suggestion:** 📚 (book stack) — or match whatever icon convention the
Learn hub already uses.
**Route target:** `/learn/recommended-reading`

Match the visual treatment of existing Learn hub cards. Do not introduce a
new card style for this page.

### 2.2 Router Registration

Register the route in the app's router config:

```jsx
{
  path: '/learn/recommended-reading',
  element: <RecommendedReading />,
}
```

Wrap in whatever auth guard / layout wrapper the rest of the Learn section
already uses.

---

## Part 3 — Verification Checklist

Before pushing to Firebase Hosting, verify:

- [ ] Page renders at `/learn/recommended-reading` for a logged-in user
- [ ] All four voice sections display with correct canonical colors:
  - Classical Master `#5C4033`
  - Empathetic Coach `#C67B5C`
  - Technical Coach `#6B8E5F`
  - Practical Strategist `#4A6274`
- [ ] Nav back-link returns to the Learn hub
- [ ] Mobile breakpoint (≤600px) renders without horizontal scroll
- [ ] Fonts (Playfair Display headers, Work Sans body) load correctly
- [ ] Subtle paper-texture background overlay is visible but not distracting
- [ ] New "Recommended Reading" card appears on the Learn hub
- [ ] Page is accessible at all three subscription tiers (Working, Medium,
  Extended)
- [ ] No console errors

---

## Part 4 — What This Page Is Not

To prevent scope creep:

- **Not a reading tracker.** Riders cannot mark books as "read," "in
  progress," or "want to read" in this version. If that becomes desirable
  later, it would be a separate brief introducing a `riders/{userId}/library`
  Firestore subcollection.
- **Not affiliate-linked.** Book titles are not currently links to Amazon or
  any retailer. Do not add affiliate links without an explicit decision —
  affiliate disclosure would require ToS/Privacy updates and a tax/business
  review.
- **Not personalized.** The same content displays for every rider regardless
  of level, tier, or history. Voice-specific personalization is not part of
  this page.
- **Not generated.** This is hand-authored static content, not AI output. No
  promptBuilder integration, no Cloud Function, no token cost.

---

## Notes for Claude Code

- This is a **static content page** — easiest possible build in the YDJ
  codebase. Estimated effort: 30–45 minutes including nav integration and
  smoke-test.
- Do not "improve" the content text. Every paragraph in the four voice
  sections is in the deliberate register of that voice and has been edited
  for tone consistency. Treat the prose as fixed copy.
- The two signature taglines in the hero ("From Your Four Coaches" eyebrow,
  "Illuminate Your Journey" footer) are intentional — keep both.
- The "A Few Honest Notes" section at the bottom is the residual caveats
  block; it is intentionally short. Do not pad it.
