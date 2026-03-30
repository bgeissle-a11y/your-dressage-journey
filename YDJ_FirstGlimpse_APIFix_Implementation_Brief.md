# First Glimpse — Claude Code Implementation Brief
## API Key + Timeout Fix · All Three Files

---

## What This Brief Covers

Three files need the same two surgical edits:
1. Add missing `x-api-key` header to the fetch call
2. Add a 25-second timeout with `AbortController`

No other changes. No structural work. Estimated time: 10–15 minutes.

---

## Files to Edit

| File | Location in project |
|---|---|
| `ydj-first-glimpse.html` | Root or `/public` |
| `ydj-first-glimpse-quick.html` | Root or `/public` |
| `ydj-ndpc-demo-glimpse-glimpse.html` | Root or `/public` |

---

## Step 1 — Add Your API Key to `.env` (Firebase)

Do **not** hardcode the key in the HTML for any file that will be publicly accessible. 

For local testing via Live Server: hardcoding temporarily is fine — see Step 2 Option A.

For Firebase Hosting (deployed): use a build step or environment config. The simplest approach for these static files is to use a Firebase Function as a proxy — but for now, if these are only on controlled devices (your laptop, booth tablet), Option A is acceptable.

---

## Step 2 — Replace `callAPI` Function in All Three Files

Find the existing `callAPI` function in each file. It currently looks like this in all three:

```javascript
async function callAPI(prompt) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,  // may be 900 in ndpc-demo-glimpse
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    return parseResponse(text);
}
```

Replace it with this in **all three files** (note `max_tokens` difference for ndpc-demo-glimpse — keep 900 there, 1000 in the other two):

### Option A — For testing / controlled devices (key in HTML)

```javascript
async function callAPI(prompt) {
    const API_KEY = 'YOUR_ANTHROPIC_API_KEY_HERE';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        clearTimeout(timeout);

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `API error ${res.status}`);
        }

        const data = await res.json();
        const text = data.content?.[0]?.text || '';
        return parseResponse(text);

    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
            throw new Error('Request timed out — please try again.');
        }
        throw err;
    }
}
```

**For `ydj-ndpc-demo-glimpse-glimpse.html` only:** change `max_tokens: 1000` to `max_tokens: 900`.

### Option B — For public deployment (Firebase Function proxy)

If any of these files will be publicly accessible before NDPC, use this instead.
Set up a Firebase callable function (see bottom of this brief) and replace the fetch URL:

```javascript
async function callAPI(prompt) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    try {
        const res = await fetch('/api/glimpse', {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });
        clearTimeout(timeout);

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `API error ${res.status}`);
        }

        const data = await res.json();
        const text = data.content?.[0]?.text || '';
        return parseResponse(text);

    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
            throw new Error('Request timed out — please try again.');
        }
        throw err;
    }
}
```

---

## Step 3 — Pricing Update (NDPC Demo Only)

In `ydj-ndpc-demo-glimpse-glimpse.html`, find and update these two values in the show special CTA card.

**Find:**
```html
<div class="price-original">$299/year</div>
```
**Replace with your actual regular annual price.**

**Find:**
```html
<div class="price-amount">$239</div>
```
**Replace with 80% of your regular annual price (20% off).**

**Find:**
```html
<div class="price-period">per year</div>
```
No change needed unless you want to show a monthly equivalent (e.g., "per year · $X/mo").

**Find:**
```html
<a href="https://yourdressagejourney.com/subscribe?promo=NDPC2026" class="btn-cta">
```
**Replace** the href with your actual Stripe payment link once it's live. The `?promo=NDPC2026` query param is useful for tracking booth conversions — keep it if your Stripe setup supports it.

---

## Step 4 — Test Locally with Live Server

1. Open any of the three files in VS Code
2. Click **Go Live** in the bottom status bar (Live Server extension)
3. Browser opens at `http://127.0.0.1:5500/filename.html`
4. Complete the full flow — should return a result in 6–12 seconds
5. Open browser DevTools → Console — any errors will appear there

---

## Step 5 — Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

Files will be live at `yourdressagejourney.com/ydj-ndpc-demo-glimpse-glimpse.html` etc.

To serve at clean URLs without `.html`, add to `firebase.json`:

```json
{
  "hosting": {
    "rewrites": [
      { "source": "/first-glimpse", "destination": "/ydj-first-glimpse.html" },
      { "source": "/first-glimpse-quick", "destination": "/ydj-first-glimpse-quick.html" },
      { "source": "/ndpc-glimpse", "destination": "/ydj-ndpc-demo-glimpse-glimpse.html" }
    ]
  }
}
```

---

## Optional — Firebase Function Proxy (for public URLs)

If any file will be live on a public URL before the show, add this function to protect the API key.

**`functions/src/glimpse.ts`** (or `.js` if not using TypeScript):

```javascript
const functions = require('firebase-functions');
const fetch = require('node-fetch');

exports.glimpse = functions.https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', 'https://yourdressagejourney.com');
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST')    { res.status(405).send('Method not allowed'); return; }

    const { prompt } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': functions.config().anthropic.key,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    const data = await response.json();
    res.json(data);
});
```

Set the key via Firebase CLI:
```bash
firebase functions:config:set anthropic.key="YOUR_KEY_HERE"
```

Then update the fetch URL in the HTML files to:
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/glimpse
```

Or use Firebase Hosting rewrites to proxy through `/api/glimpse` (cleaner — see Firebase docs for hosting rewrites to functions).

---

## Summary Checklist

- [ ] Add `x-api-key` header to `callAPI` in all three files
- [ ] Add `AbortController` timeout (25s) to `callAPI` in all three files  
- [ ] Keep `max_tokens: 900` in ndpc-demo-glimpse, `1000` in the other two
- [ ] Update pricing in `ydj-ndpc-demo-glimpse-glimpse.html` (regular price + show price)
- [ ] Update Stripe subscribe link in `ydj-ndpc-demo-glimpse-glimpse.html` once Stripe is live
- [ ] Test via Live Server before deploying
- [ ] Deploy via `firebase deploy --only hosting`
- [ ] Add Firebase Hosting rewrites for clean URLs (optional but recommended)
- [ ] Move to Function proxy before any file goes on a public URL

---

*Implementation brief — March 2026*
