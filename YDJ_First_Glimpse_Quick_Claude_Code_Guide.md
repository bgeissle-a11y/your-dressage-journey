# YDJ First Glimpse Quick — Claude Code Development Guide
## Companion to `ydj-first-glimpse-quick.html`

---

## Overview

`ydj-first-glimpse-quick.html` is a lighter, more playful alternative to the original `ydj-first-glimpse.html`. Both files are intentionally separate and serve different contexts. Do not merge them.

| | First Glimpse (original) | First Glimpse Quick |
|---|---|---|
| **Tone** | Thoughtful, comprehensive | Playful, fast, choice-driven |
| **Question count** | 14 fixed | 9–12 depending on choices |
| **Category approach** | All 6, one per screen | Rider picks 1–3 tiles |
| **Best for** | Email campaigns, landing page | Social links, barn demos, QR codes |
| **URL suggestion** | `/first-glimpse` | `/first-glimpse-quick` |

---

## Architecture

The file is a single-page wizard using **vanilla JS with named screen divs** — no framework. Every screen is a `<div class="screen">` that is shown/hidden by the `goTo(id)` function. The `active` class triggers the CSS `fadeUp` animation.

### Screen flow

```
screenWelcome
  → screenName
  → screenWhy
  → screenHorseName
  → screenHorseSpecial   ← "Hello, [Horse]" moment fires here
  → screenPartnership    ← skippable
  → screenCategoryPick   ← tile picker (1–3 selections)
  → screenCatQ           ← renders dynamically, loops per selected category
  → screenRide
  → screenHappiness
  → screenShow           ← optional
  → screenLoading        ← Phase 1 (dots) → Phase 2 (coach reveal)
  → screenResult
```

### Key state variables

```javascript
const answers = {};          // All collected answer strings, keyed by field name
let selectedCats = [];       // Ordered array of chosen category keys e.g. ['obstacle','aha']
let catQIndex = 0;           // Which cat question is currently showing
```

---

## Critical Implementation Details

### 1. The Horse Hello Moment
In `submitHorseName()`, the horse's name is written into `#horseHello` BEFORE `goTo('screenHorseSpecial')` is called, then faded in 500ms after the screen transition completes. This timing matters — if you adjust the CSS animation duration, adjust the setTimeout to match.

```javascript
// Current timing (do not reduce below 400ms)
goTo('screenHorseSpecial');
setTimeout(() => { helloEl.style.opacity = '1'; }, 500);
```

### 2. Category Tile Logic
`toggleCat(tile)` enforces a max of 3 selections. When 3 are selected, all unselected tiles get class `dimmed` (opacity 0.45, pointer-events none). Attempting to select a 4th triggers a CSS shake on the tile. The selected order is preserved in `selectedCats[]` — this order determines the sequence of cat question screens.

### 3. Dynamic Cat Question Screen
`screenCatQ` is a single div that gets its innerHTML replaced by `showCatQuestion(index)` each time. There is no pre-rendered HTML for these screens. `catBack()` handles navigation back through cat questions, eventually returning to `screenCategoryPick` when index reaches 0.

### 4. Loading → Coach Reveal Sequence
The loading screen has two phases managed by visibility:
- **Phase 1** (`#loadPhase1`): Floating horse emoji + spinning dots. Shown immediately, fades out when API returns.
- **Phase 2** (`#loadPhase2`): Coach reveal with icon, name, tagline. Uses staggered CSS animation delays (0s, 0.4s, 0.7s). Holds for 2200ms before `displayResult()` is called.

If the API call fails before Phase 2, `displayError()` calls `goTo('screenResult')` directly, skipping the reveal entirely.

### 5. Voice Detection
`detectVoice(text)` uses keyword scoring on Claude's output text. This is a heuristic — it will be correct ~80% of the time. The more reliable alternative (recommended for v2) is to add a structured prefix to the prompt:

```
Before your insight paragraph, on its own line, write exactly one of:
VOICE:CLASSICAL | VOICE:EMPATHETIC | VOICE:TECHNICAL | VOICE:STRATEGIC
```

Then parse it with:
```javascript
const voiceMatch = text.match(/^VOICE:(\w+)/);
const voiceKey = voiceMatch ? voiceMatch[1].toLowerCase() : 'classical';
```

### 6. `color-mix()` CSS Function
The selected tile glow uses `color-mix(in srgb, var(--tile-color) 15%, transparent)` for the box-shadow. This is supported in all modern browsers (Chrome 111+, Safari 16.2+, Firefox 113+) but will silently fail in older browsers — tiles will just lack the glow. Acceptable for this audience.

---

## API Integration

### Current setup (development / pilot)
Direct browser call with `anthropic-dangerous-direct-browser-access: true`. Works for local testing and Netlify deploys where you control access.

### Production setup (recommended before public launch)
Route through a Netlify serverless function to keep the API key out of the browser.

**Step 1:** Create `netlify/functions/glimpse-quick.js`:

```javascript
export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    const { prompt } = await request.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
    });
}
```

**Step 2:** In `callAPI()` in the HTML, change the fetch URL:
```javascript
// Replace:
const response = await fetch('https://api.anthropic.com/v1/messages', { ... });

// With:
const response = await fetch('/.netlify/functions/glimpse-quick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
});
```

**Step 3:** In `netlify.toml`, add the function config:
```toml
[functions]
  directory = "netlify/functions"
```

**Step 4:** Set `ANTHROPIC_API_KEY` in Netlify environment variables (Site Settings → Environment Variables).

---

## Cost & Performance

| Metric | Expected Value |
|---|---|
| Input tokens per call | ~700–1,100 (varies with answer length) |
| Output tokens per call | ~400–600 |
| Cost per glimpse (Sonnet) | ~$0.003–0.006 |
| API response time | 3–8 seconds typical |
| Loading screen minimum | 2.2s Phase 2 hold — keeps coach reveal from feeling rushed |

No caching needed. No rate limiting needed for pilot scale.

---

## Testing Checklist

Before deploying, test these specific flows:

- [ ] **Minimum path**: Select 1 category, skip partnership, skip show → result displays
- [ ] **Maximum path**: Select 3 categories, fill partnership, select show level → result displays
- [ ] **Horse hello timing**: Horse name appears correctly on next screen, fades in smoothly
- [ ] **Category max**: Try selecting a 4th tile → shake animation, no selection
- [ ] **Back navigation through cat questions**: 3 cats selected → navigate back through all 3 → lands on category picker
- [ ] **Show level acknowledgment**: Select a level → "We'll keep this in mind." appears before auto-advancing
- [ ] **Restart**: Complete full flow → restart → all fields cleared, categories deselected
- [ ] **Required field validation**: Attempt to advance past name/why/horseName/horseSpecial with empty field → shake + red border
- [ ] **Enter key**: Text inputs advance on Enter; textareas do not (Shift+Enter for line breaks)
- [ ] **Mobile layout**: Category grid stacks to single column at 480px; all tap targets ≥ 44px
- [ ] **Coach reveal sequence**: Phase 1 fades → icon pops → name fades → tagline fades → 2.2s hold → result

---

## Deployment

```
File:    ydj-first-glimpse-quick.html
Deploy:  Netlify (same project as main YDJ app)
URL:     yourdressagejourney.com/first-glimpse-quick
         or ydj.netlify.app/first-glimpse-quick
```

For Netlify to serve the file at a clean URL without `.html`:
Add a redirect in `netlify.toml`:
```toml
[[redirects]]
  from = "/first-glimpse-quick"
  to   = "/ydj-first-glimpse-quick.html"
  status = 200
```

---

## What to Link Where

| Channel | Which version | Why |
|---|---|---|
| Landing page hero CTA | First Glimpse (original) | More comprehensive, high-intent visitors |
| Social bio link | First Glimpse Quick | Fast, shareable, discovery context |
| QR code at barn / show | First Glimpse Quick | Mobile, spontaneous, time-limited |
| Email campaigns | First Glimpse (original) | Warm audience, willing to invest more |
| Sponsored post / ad | First Glimpse Quick | Cold traffic, low friction entry |
| National Dressage Pony Cup sponsor activation | First Glimpse Quick | Live event, quick demo context |

---

## Next Phase: Email Capture & Delivery

When you're ready to add email capture (the quiz-result-by-email model discussed), the insertion point is a new screen between `screenShow` and `screenLoading`:

```
screenShow → screenEmail (new) → screenLoading
```

`screenEmail` collects name (pre-filled from answers.rider_name) + email address. On submit, it:
1. Stores email in answers
2. Calls `submitAndLoad()` as usual
3. On result display, ALSO triggers a serverless function to send the formatted insight via Resend or SendGrid

The result screen in email-capture mode shows a shorter teaser ("Your coach today is The Classical Master — your full insight is on its way to [email]") rather than the full output, creating anticipation and driving inbox engagement.

This is approximately 4–6 hours of additional development.

---

## Shared Elements with First Glimpse (original)

These are intentionally identical and should stay in sync if either is updated:

- CSS custom properties (`:root` color variables)
- Category color hex values
- Google Fonts imports (Playfair Display + Work Sans)
- The AI prompt structure and `|||ACTIONABLE|||` / `|||TEXT|||` delimiters
- `parseResponse()` and `detectVoice()` logic
- CTA card copy and styling
- Top bar / progress bar structure

If you update the prompt in one version, update the other. Consider extracting prompt-building to a shared JS module if the project grows.

---

*Prepared for Claude Code / VS Code handoff — February 2026*
