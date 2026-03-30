# YDJ NDPC Demo — Claude Code Development Guide
## Companion to `ydj-ndpc-demo-glimpse.html`

---

## Overview

This is the live booth version of First Glimpse, purpose-built for the National Dressage Pony Cup vendor booth. It differs from the other two versions in three meaningful ways:

| | First Glimpse | First Glimpse Quick | NDPC Demo |
|---|---|---|---|
| Context | General discovery | General, faster | Live at a horse show |
| Questions | 14 fixed | 9–12, rider chooses | 6–8 (minimal) |
| New question | Show level (optional) | Show level (optional) | "What are you bringing this weekend?" |
| Output framing | Personalized insight | Personalized insight | **This weekend only** |
| Actionable label | "Your First Step" | "Your First Step" | **"Take This Into the Arena"** |
| Margaret mode | No | No | **Yes — passive demo on welcome screen** |
| Email capture | No | No | **Yes — on result screen** |
| CTA | Join waitlist | Join waitlist | Learn More (links to main site) |

---

## Screen Flow

```
screenWelcome
  ├── "Try It Yourself" → screenName
  └── "See a Demo First" → screenMargaret (static, no API call)

screenName → screenHorseName
screenHorseName → screenHorseSpecial (horse hello moment fires here)
screenHorseSpecial → screenCategoryPick (max 2 tiles)
screenCategoryPick → screenCatQ (1 or 2 dynamic screens)
screenCatQ (last) → screenShowQ  ← THE NEW QUESTION
screenShowQ → screenLoading
screenLoading → (Phase 1: dots) → (Phase 2: coach reveal) → screenResult

screenResult:
  - Result card (insight + "Take This Into the Arena")
  - Email capture card (wire to backend — see below)
  - CTA card (Learn More → yourdressagejourney.com)
```

---

## What's Different from First Glimpse Quick

### 1. Welcome screen — two paths
The welcome has two buttons: **"Try It Yourself →"** and **"See a Demo First"**. The demo button goes directly to `screenMargaret`, which is a fully static screen — no API call, no questions, just pre-written content for Margaret and Pemberly. After reading, visitors can click "Try It Yourself →" from the Margaret screen to start the live flow.

### 2. Max 2 category tiles (not 3)
The booth audience has less time and more distraction. Max 2 tiles keeps the experience tighter.

### 3. Partnership question removed
Removed entirely. Not needed for the show-weekend framing.

### 4. Why Dressage removed
Also removed. The "what are you bringing this weekend?" question does more useful work in this context.

### 5. The new show question
```
"What's one thing you're working on that you hope shows up in your riding this weekend?"
```
This appears as the FINAL question before loading — after cat questions. Screen ID: `screenShowQ`. Answer stored as `answers.show_intention`.

### 6. Prompt is show-specific
The prompt explicitly tells Claude: *"The rider is here at a show RIGHT NOW. Output must focus on THIS WEEKEND — not long-term progress."* The actionable is framed as something doable today — in the warm-up, before a test, in the barn aisle.

### 7. Email capture card on result screen
The result screen includes an email capture card (`#emailCard`) between the result card and the CTA card. This is the primary lead capture mechanism for the booth. **The email submit is currently a stub** (logs to console, shows confirmation UI). Wire it to a real backend before the show — see Email Backend section below.

### 8. Demo banner
When Margaret's static result is being shown via the Margaret flow (if you ever route Margaret through the result screen), `#demoBanner` appears with a blue/purple gradient header explaining it's a demo. In the current implementation, Margaret has her own dedicated static screen and the banner is hidden for live riders.

---

## Margaret Demo Content

Margaret is a **fictional rider** created specifically for YDJ demos. Her profile:

- **Name:** Margaret
- **Horse:** Pemberly (Welsh-Thoroughbred cross)
- **Level:** First Level
- **Show context:** Competing this weekend
- **Story:** She's had breakthrough moments of real softness and swing, but braces at shows in anticipation of things that haven't happened yet. Pemberly reads the anticipation and mirrors it back.
- **Coach selected:** The Empathetic Coach (⭐)
- **Actionable:** "Breathe Before You Ask" — exhale before every transition in warm-up as a cue to Pemberly

The Margaret content is **hardcoded static HTML** in `#screenMargaret`. It does not make an API call. This means it always works, displays instantly, and is never affected by API availability at the booth.

**To update Margaret's content:** Edit the HTML directly in `#screenMargaret`. No JavaScript changes needed.

---

## Email Backend (Wire Before Show)

The `submitEmail()` function currently logs to console and shows a confirmation UI. Before the show, wire it to a real endpoint.

### Option A — Netlify Function (recommended)

Create `netlify/functions/ndpc-email.js`:

```javascript
export default async function handler(request) {
    if (request.method !== 'POST') return new Response('', { status: 405 });

    const { email, rider_name, horse_name, insight, actionTitle } = await request.json();

    // 1. Save lead to your list (Resend, Mailchimp, or just Firestore)
    // 2. Send confirmation email to rider
    // 3. Optionally notify Barb of new lead

    // Example: save to Firestore via Admin SDK
    // await db.collection('ndpc_leads').add({
    //     email, rider_name, horse_name, insight, actionTitle,
    //     captured_at: new Date().toISOString(),
    //     source: 'ndpc_booth_2026'
    // });

    return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
    });
}
```

Then update `submitEmail()` in the HTML:

```javascript
async function submitEmail() {
    const email = document.getElementById('inputEmail').value.trim();
    if (!email || !email.includes('@')) { /* validation unchanged */ return; }

    try {
        await fetch('/.netlify/functions/ndpc-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                rider_name:  answers.rider_name  || '',
                horse_name:  answers.horse_name   || '',
                insight:     document.getElementById('resultInsight').textContent,
                actionTitle: document.getElementById('actionableTitle').textContent,
            }),
        });
        // Show confirmation (existing UI code)
        document.getElementById('emailConfirm').style.display = 'block';
        // ...
    } catch (err) {
        console.error('Email capture failed:', err);
        // Still show confirmation to user — don't penalize them for backend errors
        document.getElementById('emailConfirm').style.display = 'block';
    }
}
```

### Option B — Direct Firestore write (if using Firebase)

Since the app already uses Firestore, you can write directly from the browser using the Firestore Web SDK. Create a `ndpc_leads` collection. No serverless function needed.

### Lead data structure

```
{
  email:        "rider@example.com",
  rider_name:   "Sarah",
  horse_name:   "Galileo",
  insight:      "[full insight paragraph text]",
  action_title: "[actionable title]",
  source:       "ndpc_booth_2026",
  captured_at:  "2026-07-15T14:32:00Z"
}
```

---

## API Setup

Same as the other First Glimpse versions. For booth use, two options:

**Option A — Direct browser call (current)**
Works fine for booth. Requires `anthropic-dangerous-direct-browser-access: true` header. API key is in the JS — acceptable for a controlled booth device, not for public web.

**Option B — Netlify proxy (if public-facing)**
Route through `/.netlify/functions/glimpse-ndpc` to keep API key server-side. See First Glimpse Quick guide for the full function skeleton — it's identical, just change the function name.

**Booth-specific concern:** Test the API call on the show venue's wifi before the event. If connectivity is unreliable, consider pre-generating a pool of 10–15 generic-but-good results and displaying those as a fallback. This is a `try/catch` addition to `callAPI()`.

---

## Deployment

```
File:    ydj-ndpc-demo-glimpse.html
Deploy:  Netlify (or Firebase Hosting)
URL:     yourdressagejourney.com/ndpc  (or a short link / QR code)
```

For QR codes at the booth, use a URL shortener so the QR is simple. The page should be mobile-first — most visitors will use their own phones.

Netlify redirect:
```toml
[[redirects]]
  from = "/ndpc-glimpse"
  to   = "/ydj-ndpc-demo-glimpse.html"
  status = 200
```

---

## Booth Operation Notes

**Before the show:**
- [ ] Test full flow on the booth device (tablet or phone)
- [ ] Test Margaret demo path — confirm it displays without API call
- [ ] Test email capture → confirm leads are being saved
- [ ] Test API call on venue wifi — confirm response times are acceptable
- [ ] Set CTA link to the correct URL

**During the show:**
- The booth device should have this URL bookmarked / set as home page
- After each visitor completes, they hit "Start over" — this fully resets state
- If a visitor wants to show a friend, use the "See a Demo First" / Margaret path to avoid triggering another API call

**Margaret as a conversation starter:**
The "See a Demo First" button is intentionally positioned for visitors who are browsing but not ready to commit. Booth staff can say: *"Here's what one rider got — want to see what yours says?"* This lowers the entry barrier and increases conversion to the live flow.

---

## Post-Show Follow-Up (48-Hour Email)

Per the NDPC booth plan, leads captured should receive a follow-up email within 48 hours of the show. This is separate from the immediate confirmation. Content suggestion:

**Subject:** Your Dressage Journey insight — plus something more

**Body:**
- Recap their insight (from stored `insight` field)
- "That was just a glimpse. Here's what a full analysis looks like…" (link to ydj-learn-more.html)
- Limited-time offer tied to the show: "As a NDPC rider, your first month is free — claim it before [date]"
- CTA: Sign up / start free trial

This email should be sent manually or via your email platform's automation for the first show. Automate in a future sprint.

---

## Files in This Suite

| File | Purpose |
|---|---|
| `ydj-first-glimpse.html` | Original — comprehensive, 14 questions |
| `ydj-first-glimpse-quick.html` | Quick — rider chooses categories, ~10 screens |
| `ydj-ndpc-demo-glimpse.html` | **This file** — show booth, Margaret demo, email capture |

All three share the same design system, color variables, font stack, and prompt delimiter convention (`|||ACTIONABLE|||` / `|||TEXT|||`). Keep them in sync if the core design changes.

---

*Prepared for Claude Code / VS Code handoff — March 2026*
