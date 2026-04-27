# YDJ Lesson Notes — Transcript Processing (Path A)
## Implementation Brief — April 2026 (Rev 2 — updated after live transcript test)

**Scope:** Add AI-powered transcript processing to `lesson-notes.html` and introduce a third Coach's Eye bucket. Processing calls the Anthropic API via a new Firebase Function. Raw transcripts are not stored. No new API tier required.

**Dependencies:** Firebase Functions (existing), Anthropic API (existing), Firestore (existing), `promptBuilder.js` (new function added), `lesson-notes.html` (surgical edits).

---

## 1. Form Changes — `lesson-notes.html`

### 1A. New CSS — Add to `<style>` block

Add after the `.voice-status` rules (around line 341):

```css
/* Transcript Processing Panel */
.transcript-panel {
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-border);
    border-radius: 14px;
    margin-bottom: 32px;
    overflow: hidden;
}

.transcript-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    cursor: pointer;
    user-select: none;
    background: white;
    border-bottom: 2px solid transparent;
    transition: border-color 0.25s ease;
}

.transcript-panel.open .transcript-panel-header {
    border-bottom-color: var(--color-border);
}

.transcript-panel-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.05em;
    color: var(--color-primary);
    display: flex;
    align-items: center;
    gap: 10px;
}

.transcript-panel-title .tp-badge {
    font-family: 'Work Sans', sans-serif;
    font-size: 0.72em;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: var(--color-secondary);
    color: white;
    padding: 3px 9px;
    border-radius: 50px;
}

.transcript-panel-chevron {
    font-size: 0.8em;
    color: var(--color-text-light);
    transition: transform 0.25s ease;
}

.transcript-panel.open .transcript-panel-chevron {
    transform: rotate(180deg);
}

.transcript-panel-body {
    display: none;
    padding: 24px;
}

.transcript-panel.open .transcript-panel-body {
    display: block;
}

.transcript-intro {
    font-size: 0.9em;
    color: var(--color-text-light);
    margin-bottom: 16px;
    line-height: 1.6;
}

.transcript-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 14px;
    flex-wrap: wrap;
}

.btn-process {
    padding: 12px 24px;
    border-radius: 10px;
    border: none;
    font-family: 'Work Sans', sans-serif;
    font-size: 0.95em;
    font-weight: 600;
    cursor: pointer;
    background: var(--color-accent);
    color: white;
    transition: all 0.25s ease;
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn-process:hover:not(:disabled) {
    background: #a85e3f;
    transform: translateY(-1px);
}

.btn-process:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
}

.btn-clear-transcript {
    padding: 12px 18px;
    border-radius: 10px;
    border: 2px solid var(--color-border);
    font-family: 'Work Sans', sans-serif;
    font-size: 0.9em;
    font-weight: 500;
    cursor: pointer;
    background: white;
    color: var(--color-text-light);
    transition: all 0.25s ease;
}

.btn-clear-transcript:hover {
    border-color: var(--color-accent);
    color: var(--color-accent);
}

.processing-status {
    font-size: 0.88em;
    color: var(--color-primary);
    font-style: italic;
    display: none;
}

.processing-status.active {
    display: block;
}

.processing-status.error {
    color: var(--color-accent);
}

.transcript-result-notice {
    display: none;
    margin-top: 16px;
    padding: 12px 16px;
    background: #EFF7EC;
    border: 1.5px solid #6B8E5F;
    border-radius: 10px;
    font-size: 0.88em;
    color: #3A5C35;
    line-height: 1.6;
}

.transcript-result-notice.active {
    display: block;
}

/* Coach's Eye bucket — distinct from the other two */
.coaches-eye-label {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
}

.coaches-eye-label .eye-badge {
    font-size: 0.75em;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: var(--color-bg-secondary);
    color: var(--color-primary);
    border: 1.5px solid var(--color-border);
    padding: 3px 9px;
    border-radius: 50px;
}
```

---

### 1B. New HTML — Transcript Panel

**Find:** The opening of Section 2 (Instructor Guidance), specifically this line:
```html
<!-- Section 2: Instructor Guidance -->
<div class="section">
    <div class="section-header">
        <div class="section-title">Instructor Guidance</div>
        <div class="section-description">Paste a transcription, type from memory, or dictate — whatever gets the guidance captured.</div>
    </div>
```

**Replace with:**
```html
<!-- Section 2: Instructor Guidance -->
<div class="section">
    <div class="section-header">
        <div class="section-title">Instructor Guidance</div>
        <div class="section-description">Paste your transcript below to let YDJ organize it — or type directly into the fields.</div>
    </div>

    <!-- Transcript Processing Panel -->
    <div class="transcript-panel" id="transcriptPanel">
        <div class="transcript-panel-header" onclick="toggleTranscriptPanel()">
            <div class="transcript-panel-title">
                ✦ Process a Lesson Transcript
                <span class="tp-badge">Optional</span>
            </div>
            <span class="transcript-panel-chevron">▼</span>
        </div>
        <div class="transcript-panel-body">
            <p class="transcript-intro">
                Paste the full text of your lesson transcript — from any transcription tool or service. No speaker labels needed. YDJ will identify your instructor's voice and organize guidance into movements, cues, and coaching observations. Before saving, do a quick scan for dressage terminology your tool may have mangled (common: "haunches" → "hunches," "volte" → "vault," "half halt" → "half fault").
            </p>
            <div class="question" style="margin-bottom:0;">
                <label for="rawTranscript">Paste Transcript</label>
                <div class="voice-input-container">
                    <textarea id="rawTranscript" class="large" placeholder="Paste your full lesson transcript here..."></textarea>
                    <button type="button" class="voice-btn" data-target="rawTranscript" title="Dictate transcript">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                    </button>
                    <div class="voice-status" id="rawTranscript-status">Listening...</div>
                </div>
                <div class="char-counter"><span id="rawTranscriptCount">0</span> characters</div>
            </div>
            <div class="transcript-actions">
                <button type="button" class="btn-process" id="processBtn" onclick="processTranscript()" disabled>
                    <span>✦</span> Process with AI
                </button>
                <button type="button" class="btn-clear-transcript" onclick="clearTranscript()">Clear</button>
                <span class="processing-status" id="processingStatus">Analyzing your transcript...</span>
            </div>
            <div class="transcript-result-notice" id="transcriptResultNotice">
                ✓ Fields populated from your transcript. Review each section, correct any dressage terminology your transcription tool may have mangled, and add your own reflections before saving.
            </div>
        </div>
    </div>
```

---

### 1C. New HTML — Coach's Eye Bucket

**Find:** The closing `</div>` of the Instructor Guidance section (after the cuesCorrections char-counter div and before `</div> <!-- Section 3 -->`):
```html
                    <div class="char-counter"><span id="cuesCorrectionsCount">0</span> characters</div>
                </div>
            </div>
        </div>

        <!-- Section 3: Your Reflections -->
```

**Replace with:**
```html
                    <div class="char-counter"><span id="cuesCorrectionsCount">0</span> characters</div>
                </div>

                <!-- Bucket 3: Coach's Eye -->
                <div class="question" style="margin-bottom:0; margin-top:32px;">
                    <div class="coaches-eye-label">
                        <label for="coachesEye" style="margin-bottom:0;">Coach's Eye</label>
                        <span class="eye-badge">Optional</span>
                    </div>

                    <div class="prompt-box" id="coachesEyePromptBox">
                        <div class="prompt-box-toggle" onclick="togglePromptBox('coachesEyePromptBox')">
                            <span>✦ What belongs here</span>
                            <span class="prompt-box-chevron">▼</span>
                        </div>
                        <div class="prompt-box-body">
                            <ul>
                                <li>Imagery or metaphors your instructor used to describe the feeling (e.g. "like water flowing downhill")</li>
                                <li>Observations about your horse — tension, way of going, asymmetry, a good moment</li>
                                <li>Any praise or positive feedback your instructor gave (these are data too)</li>
                                <li>Anything your instructor said that connected to a bigger training idea</li>
                            </ul>
                        </div>
                    </div>

                    <div class="voice-input-container">
                        <textarea id="coachesEye" placeholder="e.g. Martin said Rocket was particularly through today on the left rein. Used the image of 'leading him into the bend rather than pushing.' Said the connection in the half-pass was the best he's seen..."></textarea>
                        <button type="button" class="voice-btn" data-target="coachesEye" title="Voice input">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                            </svg>
                        </button>
                        <div class="voice-status" id="coachesEye-status">Listening...</div>
                    </div>
                </div>
            </div>

        <!-- Section 3: Your Reflections -->
```

---

### 1D. JavaScript Changes

#### 1. Add `rawTranscript` character counter

**Find** in the `DOMContentLoaded` listener (around line 967):
```javascript
        document.getElementById('movementInstructions').addEventListener('input', function() {
```

**Insert before it:**
```javascript
        document.getElementById('rawTranscript').addEventListener('input', function() {
            document.getElementById('rawTranscriptCount').textContent = this.value.length;
            document.getElementById('processBtn').disabled = this.value.trim().length < 100;
        });
```

#### 2. Add `coachesEye` character counter

**Find:**
```javascript
        document.getElementById('cuesCorrections').addEventListener('input', function() {
            document.getElementById('cuesCorrectionsCount').textContent = this.value.length;
        });
```

**Insert after it:**
```javascript
        document.getElementById('coachesEye').addEventListener('input', function() {
            // no counter needed — no max length — field is optional
        });
```

#### 3. Add Transcript Panel Functions

Add the following new functions in the JavaScript block, before the `// ========== VOICE INPUT ==========` comment:

```javascript
    // ========== TRANSCRIPT PANEL ==========
    function toggleTranscriptPanel() {
        document.getElementById('transcriptPanel').classList.toggle('open');
    }

    function clearTranscript() {
        document.getElementById('rawTranscript').value = '';
        document.getElementById('rawTranscriptCount').textContent = '0';
        document.getElementById('processBtn').disabled = true;
        document.getElementById('processingStatus').classList.remove('active', 'error');
        document.getElementById('transcriptResultNotice').classList.remove('active');
    }

    async function processTranscript() {
        const transcript = document.getElementById('rawTranscript').value.trim();
        if (!transcript || transcript.length < 100) {
            showToast('Please paste a longer transcript before processing.', true);
            return;
        }

        const horseName = document.getElementById('horseSelect').options[
            document.getElementById('horseSelect').selectedIndex
        ]?.text || 'the horse';
        const instructorName = document.getElementById('instructorName').value.trim() || 'the instructor';

        const btn = document.getElementById('processBtn');
        const status = document.getElementById('processingStatus');

        btn.disabled = true;
        status.textContent = 'Analyzing your transcript...';
        status.classList.add('active');
        status.classList.remove('error');

        try {
            const result = await callTranscriptAPI(transcript, horseName, instructorName);

            if (result.movementInstructions) {
                document.getElementById('movementInstructions').value = result.movementInstructions;
                document.getElementById('movementInstructionsCount').textContent = result.movementInstructions.length;
            }
            if (result.cuesCorrections) {
                document.getElementById('cuesCorrections').value = result.cuesCorrections;
                document.getElementById('cuesCorrectionsCount').textContent = result.cuesCorrections.length;
            }
            if (result.coachesEye) {
                document.getElementById('coachesEye').value = result.coachesEye;
            }

            status.classList.remove('active');
            document.getElementById('transcriptResultNotice').classList.add('active');

            // Scroll to Movement Instructions
            document.getElementById('movementInstructions').scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (err) {
            console.error('Transcript processing error:', err);
            status.textContent = 'Something went wrong. Please try again or fill in the fields manually.';
            status.classList.add('error');
            btn.disabled = false;
        }
    }

    async function callTranscriptAPI(transcript, horseName, instructorName) {
        // Calls the Firebase Function endpoint for transcript processing
        const response = await fetch('/api/processLessonTranscript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript, horseName, instructorName })
        });

        if (!response.ok) throw new Error('API call failed: ' + response.status);
        const data = await response.json();
        return data;
    }
```

#### 4. Update `collectFormData()`

**Find:**
```javascript
        cuesCorrections: document.getElementById('cuesCorrections').value.trim(),
```

**Insert after it:**
```javascript
        coachesEye: document.getElementById('coachesEye').value.trim(),
        transcriptProcessed: document.getElementById('rawTranscript').value.trim().length > 0,
```

#### 5. Update `populateForm()` (for draft loading)

**Find:**
```javascript
        if (data.cuesCorrections) {
            document.getElementById('cuesCorrections').value = data.cuesCorrections;
            document.getElementById('cuesCorrectionsCount').textContent = data.cuesCorrections.length;
        }
```

**Insert after it:**
```javascript
        if (data.coachesEye) document.getElementById('coachesEye').value = data.coachesEye;
```

#### 6. Fix existing voice input reference (line ~1037)

The existing `recognition.onresult` handler already references `transcript` target ID. Verify this won't conflict:

**Find:**
```javascript
            if (targetId === 'transcript') {
                document.getElementById('transcriptCount').textContent = el.value.length;
            }
```

**Replace with:**
```javascript
            if (targetId === 'rawTranscript') {
                document.getElementById('rawTranscriptCount').textContent = el.value.length;
                document.getElementById('processBtn').disabled = el.value.trim().length < 100;
            } else if (targetId === 'movementInstructions') {
                document.getElementById('movementInstructionsCount').textContent = el.value.length;
            } else if (targetId === 'cuesCorrections') {
                document.getElementById('cuesCorrectionsCount').textContent = el.value.length;
            }
```

---

## 2. New Firebase Function — `processLessonTranscript`

**File:** `functions/api/processLessonTranscript.js` (new file)

**Route:** `POST /api/processLessonTranscript`

**Auth:** Requires Firebase Auth token (same pattern as existing API routes).

```javascript
const { onRequest } = require('firebase-functions/v2/https');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

exports.processLessonTranscript = onRequest({ cors: true }, async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const { transcript, horseName, instructorName } = req.body;

    if (!transcript || transcript.length < 100) {
        return res.status(400).json({ error: 'Transcript too short or missing.' });
    }

    const prompt = buildTranscriptPrompt(transcript, horseName, instructorName);

    try {
        const message = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 3000,
            messages: [{ role: 'user', content: prompt }]
        });

        const raw = message.content[0].text;
        const parsed = parseTranscriptResponse(raw);
        return res.json(parsed);

    } catch (err) {
        console.error('Anthropic API error:', err);
        return res.status(500).json({ error: 'Processing failed.' });
    }
});

function buildTranscriptPrompt(transcript, horseName, instructorName) {
    return `You are processing a dressage lesson transcript. The horse's name is ${horseName}. The instructor's name is ${instructorName}.

CONTEXT: This is a raw audio transcript of a dressage lesson. It may contain:
- No speaker labels (unlabeled running text is the most common format)
- Transcription service headers/footers — ignore these completely
- Repeated real-time rhythm words ("tap, tap, tap," "good, good, good," "yeah, yeah") — these are coaching rhythms, not instructions; filter them out or condense to a single instance
- Mangled dressage terminology — common errors: "hunches in" = haunches-in, "vault" = volte, "half fault" = half-halt, "punches in" = haunches-in, "Piaf" = piaffe, "massage" = passage. Correct these silently in the output.
- Rider acknowledgments ("yeah," "okay," "got it") mixed in — these are the rider speaking, not the instructor; ignore them

IDENTIFYING THE INSTRUCTOR'S VOICE: When there are no speaker labels, the instructor's voice is the one giving directions, corrections, and feedback. The rider's voice is brief acknowledgments. Focus only on what the instructor said.

Your task is to organize this transcript into three structured sections. Return ONLY a JSON object with exactly three fields: movementInstructions, cuesCorrections, coachesEye. No preamble, no markdown fences, no explanation — only valid JSON.

MOVEMENT INSTRUCTIONS
Extract each movement or exercise the instructor addressed. For each:
- Name the movement using correct dressage terminology (correct any transcription errors)
- Describe what the instructor asked for, including how the exercise was to be ridden
- Note if it was returned to or emphasized multiple times — mark these with [PRIORITY]
- Note any progressions built within the exercise (e.g. single quarter pirouette → two consecutive quarters)
Format as a plain text list, one movement per paragraph. Do not use bullet symbols.

INSTRUCTIONAL CUES & CORRECTIONS
Extract the specific verbal cues, corrections, and instructions the instructor gave.
- Preserve the instructor's exact phrasing where distinctive or memorable — these phrasings have coaching value
- Mark any cue that appeared more than once with [PRIORITY]
- Include brief positive feedback when it accompanied a specific correction or movement ("nice," "yes," "that's it") — mark these as [PRAISE]
- Do NOT include filler affirmations ("good, good, good") that were real-time encouragement without specific content
Format as a plain text list, one cue per line. Do not use bullet symbols.

COACH'S EYE
Extract anything the instructor said about:
- The horse's way of going, tension, suppleness, energy, or physical state
- Imagery or metaphors used to describe a movement or feeling
- Moments where the instructor specifically noted improvement or quality ("that was lovely," "nice, on the money")
- Any biomechanical observation about the horse (e.g. which direction the horse evades, asymmetry, willingness)
- Any broader training principle or philosophical comment
Do not include generic praise. Only observations with specific content.
If nothing fits this category, return an empty string for this field.

JSON format required:
{
  "movementInstructions": "...",
  "cuesCorrections": "...",
  "coachesEye": "..."
}

TRANSCRIPT:
${transcript}`;
}

function parseTranscriptResponse(raw) {
    try {
        const clean = raw.replace(/```json|```/g, '').trim();
        return JSON.parse(clean);
    } catch (e) {
        // Fallback: return raw as movement instructions if parse fails
        return {
            movementInstructions: raw,
            cuesCorrections: '',
            coachesEye: ''
        };
    }
}
```

**Register the route** in `functions/index.js` (or equivalent router file) following the existing pattern for other API endpoints.

---

## 2A. Prompt Design Notes — From Live Transcript Testing

The `buildTranscriptPrompt` function above incorporates findings from testing against a real TurboScribe lesson transcript (April 2026). These are the confirmed behaviors the prompt must handle:

**Unlabeled transcripts are the norm.** TurboScribe's free tier produces no speaker labels — just running text. The prompt identifies the instructor's voice by role (the one giving directions) rather than by label. The instructor name field on the form provides additional signal. This works reliably.

**Rhythm artifacts must be filtered.** Transcription tools catch every real-time word. A pirouette drill produced 80+ consecutive "tap" entries. The prompt instructs the AI to condense or filter these — they are coaching rhythm, not instruction content.

**Dressage terminology is reliably mangled.** Confirmed TurboScribe errors from the test transcript:
| Transcribed as | Correct term |
|---|---|
| "hunches in" | haunches-in |
| "vault" / "a vault" | volte |
| "half fault" | half-halt |
| "punches in" | haunches-in |
| "Piaf" | piaffe |
| "massage" | passage |
| "rain release" | rein release |

The prompt instructs silent correction. The result notice tells riders to scan before saving.

**Transcription service watermarks appear in output.** TurboScribe wraps content with "(Transcribed by TurboScribe. Go Unlimited to remove this message.)" The prompt instructs the AI to ignore these completely.

**The [PRIORITY] flag works correctly.** In the test transcript, the AI correctly identified "through the jaw on the right," "loose glutes," "not too steep," "hold the line," and "left hand physically right" as repeated corrections — all legitimately the recurring cues in that lesson.

**max_tokens set to 3000.** A 45-minute PSG lesson at TurboScribe quality produces dense output across all three buckets. 2000 tokens was marginal; 3000 provides adequate headroom without waste.

---

## 3. Firestore Schema Changes

**Collection:** `riders/{userId}/lessonNotes/{lessonId}`

**Add two fields to existing schema:**

| Field | Type | Description |
|-------|------|-------------|
| `coachesEye` | string | Coach imagery, horse observations, praise, philosophical notes |
| `transcriptProcessed` | boolean | True if AI transcript processing was used for this entry |

**Do NOT store the raw transcript.** Privacy rationale: the transcript contains the coach's voice and IP. Storing it creates obligations. The processed output (the three fields) is what has value for coaching analysis. Add a sentence to the next ToS draft: *"Raw lesson transcripts submitted for processing are not retained. Only the structured summary generated from the transcript is stored as part of your lesson record."*

**Full updated schema for reference:**
```
lessonDate: string (YYYY-MM-DD)
horseId: string
horseName: string
instructorName: string
lessonType: string (in-person | clinic | video-lesson | video-review | other)
linkedDebriefId: string | null
movementInstructions: string
cuesCorrections: string
coachesEye: string          ← NEW
transcriptProcessed: boolean ← NEW
riderReflections: string
takeaways: string[]
createdAt: ISO string
id: string
```

---

## 4. Prompt Architecture Changes

### 4A. `promptBuilder.js` — Update Lesson Notes context assembly

**Find** the block that assembles lesson notes data for AI prompts (search for `movementInstructions` or `cuesCorrections` in the lesson notes assembly section).

**Add** `coachesEye` to the assembled context block:

```javascript
// In the lesson notes context assembly section:
if (lessonNote.coachesEye) {
    lessonContext += `\nCoach's Eye (imagery, horse observations, praise):\n${lessonNote.coachesEye}`;
}
```

### 4B. `YDJ_Prompt_Additions_Lesson_Notes.md` — Update the LESSON NOTES AWARENESS block

**Add** the following paragraph to the existing LESSON NOTES AWARENESS block (after the WHEN NO LESSON NOTES ARE PRESENT section):

```
COACH'S EYE FIELD:
A third lesson notes field — Coach's Eye — captures instructor observations
about the horse's way of going, imagery and metaphors used to describe movements
or feelings, moments of praise, and broader training principles mentioned. This
field is the richest source of metaphor for the Classical Master and Empathetic
Coach, and the richest source of horse-state data for longitudinal pattern
tracking. When Coach's Eye content is present:
- The Classical Master should draw on instructor imagery as a starting point,
  then deepen it with classical reference.
- The Empathetic Coach should note any praise or "good moment" observations
  that the rider may not have fully absorbed.
- The Technical Coach should use horse-state observations (tension, asymmetry,
  suppleness) as biomechanical context.
- The Practical Strategist should use imagery as a source of mental cues for
  between-lesson solo practice.
```

---

## 5. UX Decisions & Rationale

**Transcript panel is collapsed by default.** Riders who type or dictate manually aren't confronted with it. Riders who have a transcript open it. The panel header should make the value proposition clear in one line.

**Process button is disabled until 100+ characters.** Prevents accidental empty-transcript calls and the confusion of seeing blank fields populated with nothing.

**Fields are fully editable after AI population.** The AI output is a starting point. Riders must review, edit, and add before saving. The result notice ("Review each section below, edit as needed...") reinforces this.

**Coach's Eye is optional with no character counter.** It's the most free-form field. Some lessons will yield rich imagery; others won't. No pressure, no counter, no required flag.

**Transcript is not saved in draft.** The draft save function only captures `collectFormData()` fields. The raw transcript textarea is intentionally excluded from the draft object — it doesn't need to be preserved.

**`transcriptProcessed` boolean** allows future analysis: what percentage of riders are using transcript processing vs. manual entry. This informs Path B prioritization decisions.

---

## 6. Future Path B Note (for reference)

When audio upload is added (Path B), the `processLessonTranscript` Firebase Function will be extended to accept an audio file, pass it to Whisper for transcription, then feed the resulting text into the same `buildTranscriptPrompt()` function. The form UI change will be a file input added to the transcript panel alongside the paste textarea — the rest of the pipeline is identical. The `transcriptProcessed` field will be extended with a `transcriptSource` enum: `paste | audio | manual`.

---

## 7. Implementation Checklist

**Claude Code / `lesson-notes.html`:**
- [ ] Add CSS block (Section 1A)
- [ ] Replace Section 2 opening HTML with transcript panel + updated section header (Section 1B)
- [ ] Insert Coach's Eye bucket HTML (Section 1C)
- [ ] Add `rawTranscript` character counter and process button enable/disable (Section 1D.1)
- [ ] Add transcript panel toggle and processing functions (Section 1D.3)
- [ ] Update `callTranscriptAPI()` with correct Firebase Function URL
- [ ] Update `collectFormData()` with `coachesEye` and `transcriptProcessed` (Section 1D.4)
- [ ] Update `populateForm()` for draft loading (Section 1D.5)
- [ ] Fix existing voice input `transcript` ID reference (Section 1D.6)

**Firebase Functions:**
- [ ] Create `functions/api/processLessonTranscript.js` (Section 2)
- [ ] Register route in `functions/index.js`
- [ ] Deploy and verify `/api/processLessonTranscript` returns correct JSON shape
- [ ] Confirm Auth middleware applies to this route

**Firestore:**
- [ ] Confirm `coachesEye` and `transcriptProcessed` fields are accepted (schema is flexible; no migration needed for existing records — both fields default to absent/null)

**Prompt Architecture:**
- [ ] Update `promptBuilder.js` lesson notes context assembly to include `coachesEye` (Section 4A)
- [ ] Append Coach's Eye awareness block to `YDJ_Prompt_Additions_Lesson_Notes.md` (Section 4B)

**Legal:**
- [ ] Add transcript non-retention sentence to ToS draft (Section 3 note)

**QA:**
- [ ] Paste a real unlabeled TurboScribe transcript and verify three buckets populate correctly
- [ ] Verify [PRIORITY] flags appear on repeated cues (test: a cue appearing 3+ times should be flagged)
- [ ] Verify [PRAISE] flags appear on specific positive feedback (not generic "good, good, good")
- [ ] Verify rhythm artifacts ("tap, tap, tap..." strings) do not appear in output
- [ ] Verify transcription service watermarks ("Transcribed by TurboScribe...") do not appear in output
- [ ] Verify dressage terminology is corrected: paste a transcript containing "hunches in" and confirm output reads "haunches-in"
- [ ] Verify fields are fully editable after AI population
- [ ] Verify result notice includes terminology scan reminder
- [ ] Verify form saves with `coachesEye` and `transcriptProcessed: true` in Firestore
- [ ] Verify form saves correctly when transcript panel is never opened (`transcriptProcessed: false`, `coachesEye: ""`)
- [ ] Verify draft save/load does not include raw transcript text
- [ ] Verify voice input works on all four textarea fields (rawTranscript, movementInstructions, cuesCorrections, coachesEye)
- [ ] Verify process button remains disabled below 100 characters and enables above it
