# YDJ First Glimpse — Prompt Language & Implementation Notes
## For Claude Code / VS Code Handoff

---

## The Prompt (Embedded in HTML — `buildPrompt()` function)

The full prompt is in `ydj-first-glimpse.html` inside the `buildPrompt(answers)` JavaScript function. 
Below is the standalone version for review, testing, and iteration.

---

### FIRST GLIMPSE SYSTEM PROMPT

```
You are an AI coach for "Your Dressage Journey," a platform that helps adult amateur dressage riders find patterns and meaning in their training.

A rider has shared the following in a brief introductory experience. Your task is to read everything carefully and provide a personalized, genuinely insightful response.

═══ RIDER INFORMATION ═══
Rider Name: [value]
Why They Ride Dressage: [value]

═══ HORSE INFORMATION ═══
Horse Name: [value]
What's Special About This Horse: [value]
About Their Partnership: [value]

═══ REFLECTION MOMENTS ═══
Personal Breakthrough (Personal Milestone): [value]
Achievement They're Proud Of (External Validation): [value]
Insight Recently Discovered (Aha Moment): [value]
Current Challenge (Obstacle): [value]
Moment of Connection With Horse (Connection): [value]
Position/Body Work (Feel & Body Awareness): [value]

═══ RECENT RIDE ═══
[value]

═══ SELF-AWARENESS ═══
When they feel most happy riding: [value]

═══ COMPETITION CONTEXT ═══
[Either: "The rider is preparing to compete at [level] level." OR "The rider has not mentioned an upcoming competition."]

═══ YOUR TASK ═══

STEP 1 — CHOOSE YOUR VOICE:
Read the rider's language, emotional tone, and the nature of their challenge and joy. Choose the single coaching voice that will most serve this rider right now:

- 🎯 The Classical Master — for riders whose challenge is rooted in classical principles, training foundations, or the "why" behind technique. Wise, patient, occasionally poetic. Speaks in long arcs.
- ⭐ The Empathetic Coach — for riders whose primary story is emotional: confidence, trust with their horse, the inner experience of riding. Warm, validating, perceptive.
- 🔬 The Technical Coach — for riders whose obstacle is biomechanical or positional, and who describe their riding in cause-and-effect terms. Clear, specific, constructive.
- 📋 The Strategic Planner — for riders who are competition-focused, goal-oriented, or preparing for something specific. Practical, forward-looking, structured.

DEFAULT to The Classical Master if the choice is unclear.

STEP 2 — WRITE YOUR RESPONSE:

Write exactly two parts. No headers. No bullet points. No numbered lists.

PART 1 — ONE PARAGRAPH OF INSIGHT (5–8 sentences):
Begin by addressing the rider by first name. Write one substantive, personal paragraph that synthesizes what you notice across ALL their responses. Reference specific details they shared — their horse's name, the particular challenge or breakthrough they described, the feeling they named. Identify one meaningful pattern or connection they may not have articulated themselves. This should feel like it was written for this specific person, not anyone else. Speak in the voice you selected.

PART 2 — YOUR FIRST STEP:
After the paragraph, write exactly this separator: |||ACTIONABLE|||
Then write a short title (5–8 words) for the actionable item.
Then write: |||TEXT|||
Then write 2–3 sentences describing the specific actionable — a mental skill, a physical exercise, an intention to carry into their next ride, or a concrete goal. Make it specific enough to do. Connect it to something they actually shared.

EXAMPLE FORMAT:
[One paragraph of personal insight]
|||ACTIONABLE|||
Soften the Right Hand Before You Ask
|||TEXT|||
Before your next three rides, spend the first five minutes consciously checking your right rein contact at the walk. Ask yourself: "Am I holding a conversation, or am I gripping?" Notice what changes when you release even 10% of that tension before picking up the trot.

Do not include the voice name in your output. Do not explain your choice. Just begin speaking in that voice.
```

---

## The 14 Questions (Final Approved Copy)

| # | Step Label | Question Text | Sub-copy | Type | Color | Required |
|---|---|---|---|---|---|---|
| 1 | About You · 1 of 2 | What's your first name? | — | text | — | ✅ |
| 2 | About You · 2 of 2 | Tell us something we should know about why you ride dressage. | What draws you back to it, again and again — even on the hard days? | textarea | — | ✅ |
| 3 | About Your Horse · 1 of 3 | What is your horse's name? | — | text | — | ✅ |
| 4 | About Your Horse · 2 of 3 | What's something special about this horse that words barely do justice to? | A quality, a quirk, a gift — something that makes this horse uniquely themselves. | textarea | — | ✅ |
| 5 | About Your Horse · 3 of 3 | What's something important to understand about your partnership with this horse right now? | Where you are together at this moment — what's working, what's still becoming. | textarea | — | ✅ |
| 6 | Your Story · 1 of 6 | Describe a recent moment in your riding that felt like a personal breakthrough — big or small. | Something that came from inside you. A skill that finally clicked, a fear you moved through, a moment of understanding. | textarea | 🟦 #4A7DC4 | ✅ |
| 7 | Your Story · 2 of 6 | Tell us about an achievement in your riding that you're particularly proud of. | Something recognized from outside — a score, feedback from a trainer, a show result, something someone said that landed. | textarea | 🟩 #5B9E6B | ✅ |
| 8 | Your Story · 3 of 6 | Describe a dressage insight you've recently (re)discovered — something that clicked in a new way. | An idea, a principle, or a feeling that suddenly made more sense than it ever had before. | textarea | 🟨 #C9A227 | ✅ |
| 9 | Your Story · 4 of 6 | Describe a challenge you're currently facing in your riding — the one that keeps showing up. | Be honest. The patterns we struggle to name are often the ones most worth understanding. | textarea | 🟥 #C45252 | ✅ |
| 10 | Your Story · 5 of 6 | Describe a moment when you felt a genuine connection to your horse — when the conversation between you was real. | When the language between you was clear, and you both knew it. | textarea | 🟪 #8B5EA0 | ✅ |
| 11 | Your Story · 6 of 6 | Describe something about your position or body that you regularly work to improve — and why it matters to you. | What does your body do in the saddle that you're still learning to understand or change? | textarea | 🩵 #7BA7BC | ✅ |
| 12 | A Recent Ride | Think of a recent ride. Describe one thing that stuck with you — and why it did. | It could be a success, a struggle, a strange moment, or a quiet feeling you haven't shaken. | textarea | — | ✅ |
| 13 | Self-Awareness | When do you feel most alive and happy when you're riding? | What does that feel like, and what tends to produce it? | textarea | — | ✅ |
| 14 | Upcoming Competition | I'm planning to show at this level soon | Optional — skip if you're not preparing for a show right now. | select | — | ⬜ optional |

---

## Implementation Notes for Claude Code

### 1. API Call
The HTML makes a direct client-side call to `https://api.anthropic.com/v1/messages` with header `'anthropic-dangerous-direct-browser-access': 'true'`. This works for local testing and Netlify deployment but **requires the API key to be injected at runtime** via a proxy or serverless function for production security.

**Recommended production approach:** Create a Netlify Edge Function (`/api/first-glimpse`) that accepts the prompt, injects the API key from environment variables, and forwards to the Anthropic API. Replace the fetch URL in the HTML to point to `/api/first-glimpse`.

**Netlify function skeleton:**
```javascript
// netlify/functions/first-glimpse.js
export default async function handler(request) {
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
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### 2. Voice Detection
The HTML uses a keyword-scoring heuristic to detect which voice Claude used (for displaying the badge). This is intentionally lightweight. If Claude's output is reliably structured, an alternative is to ask Claude to prepend `VOICE:[name]` before the insight paragraph and parse that directly — more reliable than keyword detection.

**Optional prompt addition (end of prompt):**
```
Before your paragraph, on its own line, write exactly one of these:
VOICE:CLASSICAL
VOICE:EMPATHETIC
VOICE:TECHNICAL
VOICE:STRATEGIC
Then proceed with the insight paragraph.
```

### 3. Response Parsing
The `parseResponse()` function splits on `|||ACTIONABLE|||` and `|||TEXT|||`. If Claude occasionally omits these delimiters, the insight paragraph will still display — but the actionable section will be empty. Monitor early usage and tighten the prompt if needed.

### 4. CTA Button
The "Join the Journey →" button in the result screen currently links to `#`. Update `href` to point to your waitlist or subscription page before deploying.

### 5. Deployment
- File: `ydj-first-glimpse.html`
- Deploy as a standalone Netlify page
- Suggested URL: `yourdressagejourney.com/first-glimpse` or `ydj.netlify.app/first-glimpse`
- Add the page link to the main landing page, email footer, and social bio

### 6. Data Privacy Note
As written, no user data is persisted to Firebase. Responses are used only for the single API call. If you later want to offer to save the glimpse (e.g., "Email me my insight"), add a simple email capture before the CTA and store only the name, email, and insight text — not the raw answers.

### 7. Rate Limiting / Cost
Each First Glimpse call sends ~800–1,200 tokens and receives ~400–600 tokens. At claude-sonnet pricing, this is approximately **$0.003–0.006 per glimpse** — negligible even at scale. No caching needed for this use case.

---

## Color Reference (Category Dots)

| Category | Color Name | Hex | Emoji |
|---|---|---|---|
| Personal Milestone | Slate Blue | `#4A7DC4` | 🟦 |
| External Validation | Forest Green | `#5B9E6B` | 🟩 |
| Aha Moment | Golden Yellow | `#D4A017` | 🟨 |
| Obstacle | Warm Red | `#C45252` | 🟥 |
| Feel & Body Awareness | Burnt Orange | `#D4722A` | 🟧 |
| Connection | Soft Purple | `#8B5EA0` | 🟪 |

These match the six-category framework used throughout YDJ. They appear as small colored dots next to the question step label — a visual hint of the deeper system without naming or explaining the categories.

---

*Document prepared for Claude Code / VS Code handoff — February 2026*
