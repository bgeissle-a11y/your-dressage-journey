# YDJ Science & Research Page — Implementation Brief
## Deploy `ydj-science.html` Inside and Outside the App
### April 2026

**Reference file:** `ydj-science.html` (complete, ready — no code changes needed to the page itself)

---

## Overview

The Science & Research page explains the peer-reviewed research behind every major YDJ design decision. It serves two distinct audiences simultaneously:

- **Existing riders** accessing it from the Learn menu inside the app — building trust in the platform, understanding why features are structured the way they are, deepening engagement
- **Prospective riders** arriving from external links — marketing pages, NDPC booth QR codes, word of mouth — who need more evidence before subscribing

The page is self-contained static HTML. It has no Firebase dependencies, no auth requirements, no API calls. It works for everyone immediately.

---

## 1. Internal Access — Learn Menu

The `ydj-nav-v2-mockup.html` already defines the Science & Research slot in the Learn dropdown:

```
— Learn —
📐  Arena Geometry Trainer
🗒  Test Explorer
🎤  PSG Step-Through
🔬  Science & Research       ← this page
```

### 1a. Nav wiring

In the Learn dropdown panel, the Science & Research entry is already scaffolded as:

```html
<a href="#" class="dm-card learn-card">
  <div class="dm-icon">🔬</div>
  <div class="dm-text">
    <div class="dm-label">Science &amp; Research</div>
    <div class="dm-desc">Learning theory behind YDJ</div>
  </div>
  <div class="dm-arrow">→</div>
</a>
```

**Update `href="#"` to `href="/science"` (or `href="ydj-science.html"` if still in HTML mode).**

No other nav changes needed — the slot already exists.

### 1b. Route

**Route:** `/science`

If the app is still serving HTML files directly: `ydj-science.html` placed in the project root, accessible at `yourdressagejourney.com/ydj-science.html`.

If the app has moved to React routing: create a route `/science` that renders the `ydj-science.html` content as a static page component, or serve the HTML file directly from the public directory alongside the React app.

### 1c. Back link inside the page

The page currently has `← Learn Menu` as the back link in the sticky nav. Wire it to navigate back to the Learn section of the dashboard (or simply `history.back()` if within the SPA). In HTML mode: `href="ydj-tips-and-faq.html"`.

### 1d. Tips & FAQ link

In `ydj-tips-and-faq.html`, add a card to the form cards grid pointing to the science page. Use the same `.form-card` pattern as the other entries:

```html
<a href="ydj-science.html" class="form-card">
    <div class="card-icon">🔬</div>
    <div class="card-title">The Science</div>
    <div class="card-desc">
        The peer-reviewed research behind YDJ's design — why reflection
        works, what the horse research says, and where we're honest about
        the limits of the evidence.
    </div>
    <span class="card-freq">Reference</span>
</a>
```

Also add to the `<nav class="toc">` table of contents (bottom of the TOC list):

```html
<a href="ydj-science.html">The Research Behind YDJ</a>
```

---

## 2. External Access — No Auth Required

The science page must be publicly accessible without login. This is intentional: it serves as a trust-building resource for prospective riders who have not yet signed up.

### 2a. Public URL

**Target URL:** `yourdressagejourney.com/science`

If the app requires authentication to access most routes, the `/science` route must be explicitly excluded from the auth guard. Add it to the public routes list alongside any existing unguarded pages (e.g., login, signup, the learn-more marketing page).

In Firebase Hosting config (`firebase.json`), if any rewrites redirect unauthenticated users, add an exception:

```json
{
  "hosting": {
    "rewrites": [
      { "source": "/science", "destination": "/ydj-science.html" },
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

Place `/science` before the catch-all `**` rewrite so it is matched first.

### 2b. ydj-learn-more.html

The marketing page `ydj-learn-more.html` should include a link to the science page. Find the section that discusses how YDJ works or the philosophy behind it and add a contextual link:

```html
<a href="/science" class="[existing-link-class]">
  Read the research behind YDJ →
</a>
```

Or as a standalone CTA block if the marketing page has a "why trust us" section — this page is the evidence.

### 2c. NDPC Demo Page

In `ydj-ndpc-demo.html` and the Quick Glimpse page, add a subtle footer link or secondary CTA pointing to the science page. Prospective riders at the booth who want more before committing — especially trainers and coaches — will want this. Suggested placement: below the primary sign-up CTA as secondary text:

```
Curious about the research behind YDJ?
<a href="yourdressagejourney.com/science">Read the science →</a>
```

### 2d. First Glimpse pages

In `ydj-first-glimpse.html` and `ydj-first-glimpse-quick.html`, add a link to the science page at the bottom. Riders who've seen the AI output and want to understand *why* it works the way it does have a natural next step.

---

## 3. SEO & Shareability (Minimal)

Add to the `<head>` of `ydj-science.html`:

```html
<meta name="description" content="The peer-reviewed research behind Your Dressage Journey — learning theory, motor science, equestrian research, and why every feature is built the way it is.">
<meta property="og:title" content="The Science Behind Your Dressage Journey">
<meta property="og:description" content="Adult learning theory, motor learning science, equestrian research, and honest limits. The evidence base for YDJ.">
<meta property="og:url" content="https://yourdressagejourney.com/science">
<meta name="robots" content="index, follow">
```

These enable reasonable link previews when the URL is shared via email, text, or social media — relevant for the NDPC context where QR codes will be used.

---

## 4. Implementation Checklist

### Internal (app)
- [ ] Wire Learn dropdown "Science & Research" entry: update `href="#"` to `/science` (or `ydj-science.html`)
- [ ] Add `/science` route to React router (or confirm HTML file is in project root)
- [ ] Wire `← Learn Menu` back link in the page nav
- [ ] Add science page card to `ydj-tips-and-faq.html` form cards grid
- [ ] Add science page link to `ydj-tips-and-faq.html` table of contents

### External (public)
- [ ] Confirm `/science` route is excluded from auth guard (publicly accessible without login)
- [ ] Add Firebase Hosting rewrite for `/science` → `ydj-science.html` (before catch-all)
- [ ] Add contextual link to `ydj-learn-more.html`
- [ ] Add secondary link to `ydj-ndpc-demo.html` and Quick Glimpse page
- [ ] Add bottom link to `ydj-first-glimpse.html` and `ydj-first-glimpse-quick.html`

### Meta (head of ydj-science.html)
- [ ] Add `<meta name="description">` tag
- [ ] Add `<meta property="og:title">` and `<meta property="og:description">` tags
- [ ] Add `<meta property="og:url">` with production URL
- [ ] Add `<meta name="robots" content="index, follow">`

### Testing
- [ ] Test: page loads without auth (open in incognito, no login)
- [ ] Test: page loads from Learn dropdown when logged in
- [ ] Test: all eight quick-nav buttons scroll to correct sections
- [ ] Test: all finding cards expand and collapse correctly
- [ ] Test: scroll spy updates active nav button as user scrolls
- [ ] Test: back link returns to correct location from inside vs. outside app
- [ ] Test: `yourdressagejourney.com/science` resolves correctly (not redirected to login)
- [ ] Test: OG tags render correctly when URL is pasted into iMessage or Slack

---

## 5. What Does NOT Need to Change

- The HTML file itself — `ydj-science.html` is complete and requires no code changes
- No Firestore reads or writes — the page is purely static
- No authentication logic within the page — it handles both audiences with the same file
- No new React components — the page renders as HTML regardless of the surrounding app architecture

---

## Notes on the Dual Audience

The page handles both audiences from a single file:

- **Logged-in riders** arrive from the Learn dropdown. The sticky nav back link returns them to the app. The page feels like part of YDJ.
- **Prospective riders** arrive from external links. The page is self-explanatory — it opens with the platform name, explains what YDJ is, and links internally to nothing that requires auth. The "← Learn Menu" back link is a minor orphan for them; this is acceptable and the alternative (different page versions) is not worth the complexity.

The only thing that differs between these two experiences is the back link destination. If this becomes a friction point, a simple URL parameter (`?from=marketing`) can conditionally change the back link to point to `ydj-learn-more.html` instead of the app. This is optional and can be added later if needed.

---

*April 2026. File: `ydj-science.html` (ready, no changes needed). References:
`ydj-nav-v2-mockup.html` (Learn group nav slot), `ydj-learn-more.html`,
`ydj-ndpc-demo.html`, `ydj-first-glimpse.html`, `ydj-tips-and-faq.html`.*
