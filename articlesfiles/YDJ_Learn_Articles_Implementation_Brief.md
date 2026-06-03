# YDJ Learn Articles — Implementation Brief
## Deploy two mental-game articles into the Learn menu, public-access
### Reflections series: "Is Showing For Me?" and "Can How You Breathe Change How You Ride?"

**Reference files (complete, ready — no changes needed to the pages themselves):**
- `ydj-learn-showing.html`
- `ydj-learn-breathing.html`

These are self-contained static HTML pages. No Firebase dependencies, no auth requirements, no API calls, no React components. They follow the exact same deployment pattern as `ydj-science.html` — read `YDJ_Science_Page_Implementation_Brief.md` if you need the precedent. This brief is deliberately narrow: it adds two static pages and wires them into the existing nav and hosting. Nothing else changes.

---

## Context

These two articles are the first entries in a written "Reflections" series on the overlooked mental game of dressage. They are educational, public-facing, and meant to be reachable both from inside the app (Learn menu) and from external links (social posts, email). Access model is identical to the Science & Research page: publicly accessible, no login required, served as a static file via Firebase Hosting rewrite.

More articles will be added to this series over time, so the nav change introduces a **new third section in the Learn dropdown** ("Reflections") that future articles will be appended to — not a one-off slot.

---

## 1. Place the files

The static public pages live in **`public/`** (Vite copies the entire `public/` directory verbatim into `build/` at build time, and Firebase Hosting serves `build/`). The deployed Science page is `public/ydj-science.html`.

Place both files in **`public/`**, using these exact filenames:

- `public/ydj-learn-showing.html`
- `public/ydj-learn-breathing.html`

No build-config change is needed — Vite picks up new files in `public/` automatically. Just confirm they appear in `build/` after the next `npm run build`.

---

## 2. Firebase Hosting rewrites (public, pretty URLs)

In `firebase.json` → `hosting.rewrites`, follow the exact house pattern already used for `/science`. Each public static page has **two** rewrite entries: the pretty URL, and a self-referential `.html` entry that lets the direct `.html` path bypass the SPA catch-all. Add **four** lines total, all **before** the catch-all `**` rewrite (order matters — specific routes must precede `**` or they get swallowed by `index.html`):

```json
{ "source": "/showing",                 "destination": "/ydj-learn-showing.html" },
{ "source": "/ydj-learn-showing.html",  "destination": "/ydj-learn-showing.html" },
{ "source": "/breathing",               "destination": "/ydj-learn-breathing.html" },
{ "source": "/ydj-learn-breathing.html","destination": "/ydj-learn-breathing.html" },
```

Insert these alongside the existing `/science` and `/ydj-science.html` rewrites (immediately before them is fine). Do not modify, reorder, or remove any existing rewrite, redirect, function rewrite, or header. The only change is adding these four lines ahead of the `**` catch-all.

**Public URLs after deploy:**
- `yourdressagejourney.com/showing`
- `yourdressagejourney.com/breathing`

These resolve without authentication — the pages have no auth logic and the rewrite serves the static file directly, bypassing the SPA. No auth-guard change is needed; verify in incognito (see testing).

---

## 3. Nav wiring — add a "Reflections" section to the Learn dropdown

**File:** `src/components/Layout/AppLayout.jsx`
**Location:** the `NAV_GROUPS` constant, the group with `id: 'learn'`.

The `learn` group currently has two sections: `Dressage Study` and `Background`. **Add a new section, `Reflections`, as the LAST section in the `learn` group's `sections` array** (after `Background`).

Static-HTML links in this nav use the `href` key (rendered as a full-page `<a>`); React-routed links use the `to` key (rendered as a router `<Link>`). These articles are static HTML, so they use `href` — matching how `Science & Research` is wired (`href: '/ydj-science.html'`).

Add this section object to the `learn` group's `sections` array, after the `Background` section:

```js
{
  heading: 'Reflections',
  links: [
    { icon: '\uD83C\uDFC6', label: 'Is Showing For Me?', href: '/showing' },
    { icon: '\uD83E\uDEC1', label: 'Can Breathing Change How You Ride?', href: '/breathing' },
  ],
},
```

Notes:
- `\uD83C\uDFC6` is 🏆 (trophy — the showing/competition piece). `\uD83E\uDEC1` is 🫁 (lungs — the breathing piece). If either reads oddly in the live menu, acceptable swaps: showing → `\uD83C\uDFDF` 🏟 (already used elsewhere for Show Prep, so prefer the trophy to avoid duplication); breathing → `\uD83C\uDF2C` 🌬 (wind). Pick one each; do not leave both an old and new emoji on the same item.
- The label for the breathing piece is shortened from the full article title to fit the dropdown width. Do not change the `<title>` or `<h1>` inside the HTML file — only the nav label is shortened.
- Use the `href` values `/showing` and `/breathing` (the pretty URLs from the rewrite), consistent with how the rest of the nav references static pages by clean path.

---

## 4. Cross-links from existing public surfaces (optional but recommended)

Low priority; do only if quick. These mirror what the Science Page brief did, building discovery paths for prospective riders. Each is a single contextual link, styled with whatever link class the host page already uses. Do not restructure any of these pages.

- **`ydj-learn-more-final.html`** — this is the live marketing page (confirm against the deployed version before editing). Near the existing Science bridge block (search for the `ydj-science.html` link, around the "SCIENCE BRIDGE" comment), an optional second bridge line pointing to `/showing` as a sample of the thinking. Keep it subtle; the marketing page is not a content index.
- **Social posts** point to `/showing` and `/breathing` directly — no page change needed, just the live URLs.

Skip the NDPC and First Glimpse cross-links for these articles; the Science page already carries that load and these are not launch-critical.

---

## 5. Hard constraints — what must NOT change

- **Do not modify the two HTML files' content, copy, structure, or styles.** They are final. The only human-authored values that may differ from production are the back-link target and the science-link target (both already set to `/dashboard` and `/ydj-science.html` respectively); leave them as written.
- **Do not add a React route** for these pages. They are static files served by the Hosting rewrite, exactly like the science page. No new page component, no router entry, no lazy import.
- **Do not touch any other `NAV_GROUPS` group** (`record`, `plan`, `coaching`, `assess`, `profiles`) or the existing `Dressage Study` / `Background` sections. The only nav edit is appending one new section object to the `learn` group.
- **Do not alter the nav rendering logic**, the `href`/`to` branch, touch handlers, theme logic, or any other part of `AppLayout.jsx` outside the `NAV_GROUPS` data.
- **Do not reorder or remove existing `firebase.json` rewrites.** Only add the two new lines ahead of the catch-all.
- **Do not add auth gating, Firestore reads, analytics events, or API calls** to these pages. They are intentionally inert static content.

---

## 6. Out of scope

- No Learn "hub"/index landing page. The dropdown is the index; there is no separate `ydj-learn.html` and none should be created.
- No changes to `ydj-science.html` or the Science Page wiring.
- No new series-navigation UI (prev/next article links, series landing). Articles are self-contained and cross-link only to the science page and back to the dashboard. A series index can be designed later if the article count grows.
- No social/OG image asset creation. The OG meta tags are text-only by design for now.

---

## 7. Implementation checklist

**Files**
- [ ] Confirm where `ydj-science.html` is physically served from; place `ydj-learn-showing.html` and `ydj-learn-breathing.html` in the same location with identical filenames.

**Hosting**
- [ ] Add `/showing` and `/breathing` rewrites to `firebase.json`, before the `**` catch-all.

**Nav**
- [ ] In `AppLayout.jsx`, append the `Reflections` section object to the `learn` group's `sections` array (after `Background`). No other nav edits.

**Optional cross-links**
- [ ] (Optional) Add one contextual link to `/showing` near the Science bridge on the live marketing page.

**Testing**
- [ ] Incognito (logged out): `yourdressagejourney.com/showing` and `/breathing` both load, no login prompt, no redirect to `index.html`.
- [ ] Logged in: Learn dropdown shows the new "Reflections" section with both items; clicking each opens the correct article.
- [ ] Both articles render correctly on iOS Safari (mobile-first check): hero, body type, pullquotes, the breathing article's green "One thing to try" callout, and the "Go Deeper" strip all display.
- [ ] In each article, "← Back to YDJ" returns to `/dashboard`; "Read the science behind YDJ →" opens `/ydj-science.html`.
- [ ] Paste `yourdressagejourney.com/showing` into iMessage/Slack — OG title/description preview renders.

---

*Reference: `ydj-learn-showing.html`, `ydj-learn-breathing.html` (both ready, no changes needed). Pattern precedent: `YDJ_Science_Page_Implementation_Brief.md`. Nav file: `src/components/Layout/AppLayout.jsx` (`NAV_GROUPS` → `learn` group). Hosting: `firebase.json` rewrites.*
