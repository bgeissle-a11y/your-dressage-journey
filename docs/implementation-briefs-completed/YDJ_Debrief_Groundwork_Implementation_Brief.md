# YDJ Debrief — Groundwork Awareness Implementation Brief
## Revision 2 · April 2026

**Reference file:** `post-ride-debrief-with-intentions.html`
**Reference prototype:** `post-ride-debrief-groundwork-prototype.html`
**Supersedes:** Revision 1 of this brief (April 2026)
**Scope:** Additive only, with one explicit rename. Does not modify existing fields, ratings, reflection categories, validation, or save logic.

---

## What changed from Revision 1

Section 4 (AI Prompt Additions) was restructured. The previous revision instructed Claude Code to insert prompt content directly into `BASE_CONTEXT` in `promptBuilder.js` and to "reinforce" an existing groundwork-only guardrail in `YDJ_AI_Coaching_Voice_Prompts_v3.md`. Both instructions were architecturally wrong:

- The established YDJ pattern for prompt additions is a dedicated markdown reference doc loaded at runtime, not inline edits to `BASE_CONTEXT`. See `YDJ_Prompt_Additions_Horse_Profile_v2.md`, `YDJ_Prompt_Additions_Horse_Health.md`, `YDJ_Prompt_Additions_Lesson_Notes.md`, and others as the canonical pattern.
- The horse-profile-level groundwork-only guardrail is specified in `YDJ_Prompt_Additions_Horse_Profile_v2.md` Section 5, not in `YDJ_AI_Coaching_Voice_Prompts_v3.md`. The new modality work is a peer to that file, not a reinforcement.

Revision 2 reflects both corrections. Sections 1–3 (HTML, Firestore) are unchanged from Revision 1. Section 4 is fully rewritten. Section 5 (Implementation Checklist) and Section 6 (Out of Scope) are updated to match.

---

## 1. Context and Constraints

### Recent history of this file

The production debrief file has received multiple updates in the last sixty days. Claude Code must read the **current live version** of `post-ride-debrief-with-intentions.html` before applying any changes — do not assume exact line numbers or surrounding code from any prior brief.

Already applied (do not re-apply, do not modify):

- `YDJ_PostRideDebrief_Form_Changes.md` (March 2026): estimation prompt before confidence rating, ride arc picker, emotional state field updates, confidence-in-execution slider
- `YDJ_PracticeCard_Debrief_v2_Implementation_Brief.md` (April 2026): Section 2.5 redesign — "Process Goals" replaces "Riding Intentions"; `confirmedGoalsSnapshot` and `goalRatings` Firestore fields replace `intentionRatings`; goal data reads from the locked Practice Card

This brief introduces groundwork awareness. It does not touch any of the above.

### Why this change exists

A pilot rider works primarily on the ground (in-hand, lunging, long-lining). The current debrief is structured for ridden work and renders her sessions as second-class. We are adding session modality awareness — keeping a single debrief form that adapts to ridden, ground, or combined sessions — rather than building a parallel form. This preserves the Practice Card → Debrief closed loop, the Firestore schema, and the AI coaching pipeline.

### Hard constraints

**This brief is additive. Claude Code must not:**

- Modify the existing `rideDate`, `horseName`, `sessionType`, `overallQuality`, `confidence`, `rideArc`, `riderEnergy`, `horseEnergy`, or `mentalState` fields
- Modify the Process Goals section (Section 2.5) or its `confirmedGoalsSnapshot` / `goalRatings` schema
- Modify any of the five reflection category text fields (`wins`, `ahaRealization`, `horseNotices`, `challenges`)
- Rename "Ride Basics," "Date of Ride," "Ride arc," or any field-level label other than the page title and header subtitle (Change 1 below)
- Remove, reposition, or alter the existing `workFocus` textarea — the new movement checkboxes go *above* it; `workFocus` remains as it is, repositioned only by virtue of the new content above it
- Alter the validation logic in `saveDebrief()` beyond adding `sessionModality` as required
- Change the existing draft save flow, completion screen, or library rendering structure beyond the additive label specified in Change 4

The only authorized rename is the form name itself: "Post-Ride Debrief" → "Debrief" in the page `<title>` and the header subtitle.

---

## 2. HTML Changes

### Change 1 — Rename the form

**Location:** Two places — the `<title>` tag in `<head>`, and the header subtitle in `<body>`.

**Find:**
```html
    <title>Post-Ride Debrief | Your Dressage Journey</title>
```
**Replace with:**
```html
    <title>Debrief | Your Dressage Journey</title>
```

**Find:**
```html
            <p class="subtitle" style="font-size: 1.3em; font-weight: 500; margin-top: 10px;">Post-Ride Debrief</p>
```
**Replace with:**
```html
            <p class="subtitle" style="font-size: 1.3em; font-weight: 500; margin-top: 10px;">Debrief</p>
```

Do not change the `Capture your insights while they're fresh` subtitle line below it — it stays as-is.

---

### Change 2 — Add Session Modality question to Section 1 (Ride Basics)

**Location:** Section 1 (currently labeled "Ride Basics"). Insert **after** the existing "Type of Session" question, **before** the closing `</div>` of Section 1.

The current Type of Session question ends with a closing `</div>` for the radio group, then a closing `</div>` for the question div. Find the Section 1 closing tag pattern. The section closes when the next `<!-- Section 2: Quick Ratings -->` (or similar) comment begins.

**Find** (the closing of Type of Session and start of Quick Ratings):
```html
                        <div class="radio-option" data-value="other">
                            <input type="radio" name="sessionType" value="other" id="session-other">
                            <label for="session-other" style="margin: 0; cursor: pointer; flex: 1;">Other</label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section 2: Quick Ratings -->
```

**Replace with:**
```html
                        <div class="radio-option" data-value="other">
                            <input type="radio" name="sessionType" value="other" id="session-other">
                            <label for="session-other" style="margin: 0; cursor: pointer; flex: 1;">Other</label>
                        </div>
                    </div>
                </div>

                <!-- Session Modality (added April 2026 — groundwork awareness) -->
                <div class="question">
                    <label>How did this session happen? <span class="required">*</span></label>
                    <p class="help-text" style="margin-top:0; margin-bottom:12px;">Tells the platform how to frame your coaching and which work options to show.</p>
                    <div class="modality-grid" id="modalityGrid">
                        <label class="modality-option" data-value="in-saddle">
                            <input type="radio" name="sessionModality" value="in-saddle">
                            <span class="modality-icon">🐴</span>
                            <span class="modality-label">In the saddle</span>
                            <span class="modality-sub">Ridden work</span>
                        </label>
                        <label class="modality-option" data-value="on-ground">
                            <input type="radio" name="sessionModality" value="on-ground">
                            <span class="modality-icon">👣</span>
                            <span class="modality-label">On the ground</span>
                            <span class="modality-sub">In-hand, lunging, long-lining, liberty</span>
                        </label>
                        <label class="modality-option" data-value="combined">
                            <input type="radio" name="sessionModality" value="combined">
                            <span class="modality-icon">🔄</span>
                            <span class="modality-label">Combined</span>
                            <span class="modality-sub">Both in one session</span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Section 2: Quick Ratings -->
```

If the surrounding context differs from the snippet above, locate the end of the Type of Session radio group, confirm the closing `</div>` pattern, and place the Session Modality `<div class="question">` block as the final question inside Section 1's container before that container closes.

---

### Change 3 — Add movement checkbox blocks above the Additional Context textarea

**Location:** Inside the "Additional Context" group near the end of Section 3 ("What Happened"), **above** the existing `workFocus` textarea question.

**Find** (the start of the Additional Context block):
```html
                <!-- Additional Context -->
                <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid var(--color-bg-secondary);">
                    <h3 style="font-family: 'Playfair Display', serif; font-size: 1.2em; color: var(--color-primary); margin-bottom: 20px; font-weight: 600;">Additional Context</h3>
                    
                    <div class="question">
                        <label>What did you specifically work on?</label>
```

**Replace with:**
```html
                <!-- Additional Context -->
                <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid var(--color-bg-secondary);">
                    <h3 style="font-family: 'Playfair Display', serif; font-size: 1.2em; color: var(--color-primary); margin-bottom: 20px; font-weight: 600;">Additional Context</h3>

                    <!-- Movement checkboxes — modality-aware (added April 2026) -->
                    <div class="question" id="movementsQuestion">
                        <label>What did you work on?</label>
                        <p class="help-text" style="margin-top:0; margin-bottom:14px;">Check the elements that showed up in your session. This feeds your activity charts on the dashboard.</p>

                        <div class="dev-note-empty" id="modalityEmptyState">
                            Select <em>How did this session happen?</em> above to see the work options.
                        </div>

                        <!-- Ridden movements: shown when modality = in-saddle or combined -->
                        <div class="modality-conditional" id="riddenMovements">
                            <div class="movement-block">
                                <div class="movement-block-header">
                                    <span class="movement-block-icon">🐴</span>
                                    <div>
                                        <div class="movement-block-title">Ridden Work</div>
                                        <div class="movement-block-sub">What you worked on in the saddle</div>
                                    </div>
                                </div>

                                <div class="movement-category">
                                    <div class="movement-category-label">Basics &amp; Gaits</div>
                                    <div class="movement-tags">
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="walk-work">Walk Work</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="trot-work">Trot Work</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="canter-work">Canter Work</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="transitions">Transitions</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="halt-salute">Halt / Salute</label>
                                    </div>
                                </div>

                                <div class="movement-category">
                                    <div class="movement-category-label">Figures</div>
                                    <div class="movement-tags">
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="circles">Circles</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="serpentines">Serpentines</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="figure-8">Figure 8</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="diagonals">Diagonals</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="centerline">Centerline</label>
                                    </div>
                                </div>

                                <div class="movement-category">
                                    <div class="movement-category-label">Lateral Work</div>
                                    <div class="movement-tags">
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="leg-yield">Leg Yield</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="shoulder-in">Shoulder-In</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="haunches-in">Haunches-In (Travers)</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="renvers">Renvers</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="half-pass">Half-Pass</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="turn-on-forehand">Turn on Forehand</label>
                                    </div>
                                </div>

                                <div class="movement-category">
                                    <div class="movement-category-label">Advanced Movements</div>
                                    <div class="movement-tags">
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="extensions">Extensions</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="counter-canter">Counter Canter</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="simple-change">Simple Change</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="flying-change">Flying Change</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="turn-on-haunches">Turn on Haunches</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="pirouette">Pirouette</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="piaffe">Piaffe</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="passage">Passage</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="tempi-changes">Tempi Changes</label>
                                    </div>
                                </div>

                                <div class="movement-category">
                                    <div class="movement-category-label">Horse / Training Focus</div>
                                    <div class="movement-tags">
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="rhythm">Rhythm</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="relaxation">Relaxation</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="attentiveness">Attentiveness</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="balance">Balance</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="bend-flexion">Bend &amp; Flexion</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="straightness">Straightness</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="suppleness">Suppleness</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="impulsion">Impulsion</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="engagement">Engagement</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="softness-responsiveness">Softness / Responsiveness</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="collection">Collection</label>
                                    </div>
                                </div>

                                <div class="movement-category">
                                    <div class="movement-category-label">Rider Focus</div>
                                    <div class="movement-tags">
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="contact">Contact / Connection</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="rider-position">Rider Position</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="breathing">Breathing</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="concentration-focus">Concentration / Focus</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="accuracy">Accuracy</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Ground work movements: shown when modality = on-ground or combined -->
                        <div class="modality-conditional" id="groundworkMovements">
                            <div class="movement-block">
                                <div class="movement-block-header">
                                    <span class="movement-block-icon">👣</span>
                                    <div>
                                        <div class="movement-block-title">Ground Work</div>
                                        <div class="movement-block-sub">What you worked on from the ground</div>
                                    </div>
                                </div>

                                <div class="movement-category">
                                    <div class="movement-category-label">Work Type</div>
                                    <div class="movement-tags">
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-lunging">Lunging (single line)</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-in-hand">In-hand work</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-long-lining">Long-lining / Long-reining</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-liberty">Liberty work</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-pole-cavaletti">Pole / Cavaletti work</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-body-work">Body work / Stretching</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-partnership">Partnership Building</label>
                                    </div>
                                </div>

                                <div class="movement-category">
                                    <div class="movement-category-label">Handling &amp; Life Skills</div>
                                    <div class="movement-tags">
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-trailer-loading">Trailer Loading</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-standing-tied">Standing Tied / Patience</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-farrier-vet-prep">Farrier / Vet Prep</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-tacking-exposure">Saddling / Bridling / Mounting Exposure</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-bathing-clipping">Bathing / Clipping / Grooming Desens.</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-new-environment">New Environment Exposure</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-desensitization">Scary Object Desensitization</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-obstacle-work">Obstacle Work (poles, tarps, bridges, water)</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-leading-skills">Leading Skills</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-rehab-hand-walking">Rehab Hand-Walking</label>
                                    </div>
                                </div>

                                <div class="movement-category">
                                    <div class="movement-category-label">Gaits &amp; Transitions</div>
                                    <div class="movement-tags">
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="walk-work">Walk Work</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="trot-work">Trot Work</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="canter-work">Canter Work</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="transitions">Transitions</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-halt-stand">Halt / Stand / Ground-tie</label>
                                    </div>
                                </div>

                                <div class="movement-category">
                                    <div class="movement-category-label">Figures</div>
                                    <div class="movement-tags">
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-circles">Circles (on the lunge or in-hand)</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-changes-direction">Changes of Direction</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-spirals">Spirals (in / out)</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-serpentines">Serpentines</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-figure-8">Figure 8</label>
                                    </div>
                                </div>

                                <div class="movement-category">
                                    <div class="movement-category-label">Lateral &amp; In-Hand Work</div>
                                    <div class="movement-tags">
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-leg-yield">Leg Yield (in-hand)</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-shoulder-in">Shoulder-In (in-hand)</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-haunches-in">Haunches-In (in-hand)</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-half-pass">Half-Pass (in-hand)</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-disengage-hq">Disengage Hindquarters</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-turn-on-forehand">Turn on Forehand</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-leg-sequence">Specific Leg Movement Sequence</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-rein-back">Rein-Back (in-hand)</label>
                                    </div>
                                </div>

                                <div class="movement-category">
                                    <div class="movement-category-label">Advanced / Collected Work</div>
                                    <div class="movement-tags">
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-piaffe">Piaffe (in-hand)</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-passage">Passage (in-hand)</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-spanish-walk">Spanish Walk</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-extensions">Extensions / Lengthenings</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-collection-work">Collection Work</label>
                                    </div>
                                </div>

                                <div class="movement-category">
                                    <div class="movement-category-label">Horse / Training Focus</div>
                                    <div class="movement-tags">
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="rhythm">Rhythm</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="relaxation">Relaxation</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="attentiveness">Attentiveness</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="balance">Balance</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="bend-flexion">Bend &amp; Flexion</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="straightness">Straightness</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="suppleness">Suppleness</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="impulsion">Impulsion</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="engagement">Engagement</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="softness-responsiveness">Softness / Responsiveness</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="collection">Collection</label>
                                    </div>
                                </div>

                                <div class="movement-category">
                                    <div class="movement-category-label">Handler Focus</div>
                                    <div class="movement-tags">
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-body-language">Body Language &amp; Position</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-timing-aids">Timing of Aids</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-line-whip-voice">Line / Whip / Voice Use</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="breathing">Breathing</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="concentration-focus">Concentration / Focus</label>
                                        <label class="movement-tag"><input type="checkbox" name="movements" value="gw-reading-horse">Reading the Horse</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="question">
                        <label>What did you specifically work on?</label>
```

This insertion places the new movement checkbox question above the existing `workFocus` textarea. The textarea remains as-is — same `id`, same placeholder, same voice input button, same Firestore field. The textarea now serves as the free-text supplement to the structured checkbox data.

The existing `<div class="question">` wrapper and label of `workFocus` are NOT removed — the find/replace adds the new movement question and re-opens the next `<div class="question">` for the existing `workFocus` block.

---

### Change 4 — Add dynamic title label in library entries

**Location:** Inside the `renderDebriefs()` function. Find the `sessionLabels` constant and the card-rendering template that follows.

**Find** (the card header rendering — around the `debrief-meta` block):
```javascript
                html += `
                    <div class="debrief-card">
                        <div class="debrief-header">
                            <div class="debrief-meta">
                                <div class="debrief-date">${formattedDate}</div>
                                <div class="debrief-horse">${debrief.horseName} • ${sessionLabels[debrief.sessionType]}</div>
                            </div>
```

**Replace with:**
```javascript
                // Dynamic debrief title based on session modality
                const modalityTitles = {
                    'in-saddle': 'Post-Ride Debrief',
                    'on-ground': 'Post-Groundwork Debrief',
                    'combined': 'Combined Session Debrief'
                };
                const debriefTitle = modalityTitles[debrief.sessionModality] || 'Post-Ride Debrief';

                html += `
                    <div class="debrief-card">
                        <div class="debrief-header">
                            <div class="debrief-meta">
                                <div class="debrief-title" style="font-family: 'Playfair Display', serif; font-size: 0.95em; color: var(--color-primary); font-weight: 500; margin-bottom: 4px; letter-spacing: 0.02em;">${debriefTitle}</div>
                                <div class="debrief-date">${formattedDate}</div>
                                <div class="debrief-horse">${debrief.horseName} • ${sessionLabels[debrief.sessionType]}</div>
                            </div>
```

The fallback to `'Post-Ride Debrief'` covers all existing entries that pre-date this change (no `sessionModality` field in their stored object).

**Optional companion change in the text export** (around the `textContent += \`Type: ...` line). If this change is desired, find:
```javascript
                textContent += `Type: ${sessionLabels[debrief.sessionType]}\n`;
```
and add immediately above it:
```javascript
                const exportModalityLabels = { 'in-saddle': 'In the saddle', 'on-ground': 'On the ground', 'combined': 'Combined (in-saddle + on-ground)' };
                if (debrief.sessionModality) {
                    textContent += `Modality: ${exportModalityLabels[debrief.sessionModality]}\n`;
                }
```

If the second `sessionLabels` constant (around line 1731 in the current file) is in the export function, leave it untouched — it already maps session type correctly.

---

### Change 5 — Add CSS for the new components

**Location:** Inside the existing `<style>` block, append before `</style>`. Place after the existing `.completion-screen` rules so it sits with other component-level styles.

**Add:**
```css
        /* ----- Session Modality (added April 2026) ----- */
        .modality-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }

        .modality-option {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 22px 14px;
            border: 2px solid var(--color-border);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            background: white;
            text-align: center;
            gap: 8px;
        }

        .modality-option:hover {
            border-color: var(--color-secondary);
            background: rgba(212, 165, 116, 0.05);
        }

        .modality-option.selected {
            border-color: var(--color-primary);
            background: rgba(139, 115, 85, 0.08);
            box-shadow: var(--shadow-soft);
        }

        .modality-option input[type="radio"] { display: none; }

        .modality-icon { font-size: 1.8em; line-height: 1; }
        .modality-label { font-weight: 500; font-size: 0.98em; color: var(--color-text); }
        .modality-sub { font-size: 0.78em; color: var(--color-text-light); font-style: italic; line-height: 1.3; }

        @media (max-width: 560px) {
            .modality-grid { grid-template-columns: 1fr; }
        }

        /* ----- Movement checkboxes ----- */
        .modality-conditional { display: none; }
        .modality-conditional.visible { display: block; }

        .dev-note-empty {
            background: var(--color-bg-secondary);
            border-left: 3px solid var(--color-secondary);
            padding: 14px 18px;
            font-size: 0.92em;
            color: var(--color-text-light);
            font-style: italic;
            border-radius: 0 8px 8px 0;
            margin-bottom: 10px;
        }

        .movement-block {
            background: var(--color-bg);
            border: 1.5px solid var(--color-border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
        }

        .movement-block-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 18px;
            padding-bottom: 12px;
            border-bottom: 2px solid var(--color-border);
        }

        .movement-block-icon { font-size: 1.5em; line-height: 1; }
        .movement-block-title { font-family: 'Playfair Display', serif; font-size: 1.15em; color: var(--color-primary); font-weight: 600; letter-spacing: 0.02em; }
        .movement-block-sub { font-size: 0.82em; color: var(--color-text-light); font-style: italic; }

        .movement-category { margin-bottom: 18px; }
        .movement-category:last-child { margin-bottom: 0; }

        .movement-category-label {
            font-size: 0.78em;
            font-weight: 600;
            color: var(--color-primary);
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 10px;
        }

        .movement-tags { display: flex; flex-wrap: wrap; gap: 8px; }

        .movement-tag {
            display: inline-flex;
            align-items: center;
            padding: 8px 14px;
            border: 1.5px solid var(--color-border);
            border-radius: 50px;
            cursor: pointer;
            font-size: 0.88em;
            background: white;
            transition: all 0.2s ease;
            user-select: none;
        }

        .movement-tag input[type="checkbox"] {
            width: 14px;
            height: 14px;
            margin-right: 8px;
            pointer-events: none;
        }

        .movement-tag:hover {
            border-color: var(--color-secondary);
            background: rgba(212, 165, 116, 0.05);
        }

        .movement-tag.selected {
            border-color: var(--color-primary);
            background: rgba(139, 115, 85, 0.10);
            color: var(--color-primary);
            font-weight: 500;
        }
```

---

### Change 6 — Add JavaScript wiring for modality and movement tags

**Location:** Inside the main `<script>` block. Place near other UI binding code (alongside the existing `radio-option` click handler bindings, before `saveDebrief()`).

**Add:**
```javascript
        // ----- Session Modality wiring (added April 2026) -----
        const modalityGrid = document.getElementById('modalityGrid');
        if (modalityGrid) {
            const modalityOptions = modalityGrid.querySelectorAll('.modality-option');
            const ridden = document.getElementById('riddenMovements');
            const groundwork = document.getElementById('groundworkMovements');
            const emptyState = document.getElementById('modalityEmptyState');

            modalityOptions.forEach(opt => {
                opt.addEventListener('click', () => {
                    const value = opt.dataset.value;

                    modalityOptions.forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    const radio = opt.querySelector('input[type="radio"]');
                    if (radio) radio.checked = true;

                    if (emptyState) emptyState.style.display = 'none';
                    ridden.classList.toggle('visible', value === 'in-saddle' || value === 'combined');
                    groundwork.classList.toggle('visible', value === 'on-ground' || value === 'combined');
                });
            });
        }

        // ----- Movement tag wiring -----
        document.querySelectorAll('.movement-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                if (e.target.tagName === 'INPUT') return;
                e.preventDefault();
                const checkbox = tag.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                tag.classList.toggle('selected', checkbox.checked);
            });
        });
```

---

### Change 7 — Add `sessionModality` and `movements` to the `saveDebrief` payload and validation

**Location:** Inside the `saveDebrief(isDraft = false)` function.

**Find** the `requiredFields` block:
```javascript
            const requiredFields = {
                rideDate: document.getElementById('rideDate'),
                horseName: document.getElementById('horseName'),
                sessionType: document.querySelector('input[name="sessionType"]:checked'),
                overallQuality: document.getElementById('overallQuality'),
                riderEnergy: document.querySelector('input[name="riderEnergy"]:checked'),
                horseEnergy: document.querySelector('input[name="horseEnergy"]:checked'),
                mentalState: document.querySelector('input[name="mentalState"]:checked')
            };
```

**Replace with** (adds `sessionModality` to required fields):
```javascript
            const requiredFields = {
                rideDate: document.getElementById('rideDate'),
                horseName: document.getElementById('horseName'),
                sessionType: document.querySelector('input[name="sessionType"]:checked'),
                sessionModality: document.querySelector('input[name="sessionModality"]:checked'),
                overallQuality: document.getElementById('overallQuality'),
                riderEnergy: document.querySelector('input[name="riderEnergy"]:checked'),
                horseEnergy: document.querySelector('input[name="horseEnergy"]:checked'),
                mentalState: document.querySelector('input[name="mentalState"]:checked')
            };
```

If a `confidence` field has been added to required fields by a prior brief, leave it where it is — only the `sessionModality` line is being inserted. Insert it after `sessionType` and before whatever was the next line in the current production file.

**Find** the `debrief = { ... }` object construction:
```javascript
            const debrief = {
                rideDate: document.getElementById('rideDate').value,
                horseName: document.getElementById('horseName').value,
                sessionType: document.querySelector('input[name="sessionType"]:checked')?.value || '',
```

**Replace with** (adds `sessionModality` and `movements` immediately after `sessionType`):
```javascript
            const debrief = {
                rideDate: document.getElementById('rideDate').value,
                horseName: document.getElementById('horseName').value,
                sessionType: document.querySelector('input[name="sessionType"]:checked')?.value || '',
                sessionModality: document.querySelector('input[name="sessionModality"]:checked')?.value || '',
                movements: Array.from(document.querySelectorAll('input[name="movements"]:checked')).map(cb => cb.value),
```

The `movements` array is gathered from all checked checkboxes named `movements` across whichever movement block(s) are currently visible. When modality is `combined`, both blocks are visible and both contribute. When modality is `in-saddle` or `on-ground`, only one block contributes. Tags shared across both blocks (like `rhythm`, `walk-work`) cannot be double-counted because only the visible block's checkboxes can be checked.

Do not modify any other field in the `debrief` object. Do not modify the `localStorage.setItem` call or the Firestore write that follows (if Firestore persistence has been added in a separate brief, the new fields flow through automatically because they are properties on the same `debrief` object).

---

## 3. Firestore Schema Update

The debrief document at `/riders/{riderId}/debriefs/{debriefId}/` gains two new fields:

```javascript
{
  // ... existing fields unchanged ...

  sessionModality: "in-saddle" | "on-ground" | "combined",   // required, added April 2026
  movements:       string[]                                   // optional; tag values
}
```

### Tag-naming convention (canonical reference)

The `movements` array contains tag values drawn from a fixed vocabulary. Two prefix conventions:

- **Shared tags** (no prefix) — used across both modalities for concepts that are the same regardless of where the work happened: `rhythm`, `relaxation`, `attentiveness`, `balance`, `bend-flexion`, `straightness`, `suppleness`, `impulsion`, `engagement`, `softness-responsiveness`, `collection`, `breathing`, `concentration-focus`, `walk-work`, `trot-work`, `canter-work`, `transitions`
- **Ground-work-specific tags** (`gw-` prefix) — used only when the activity is fundamentally a ground-work activity: `gw-lunging`, `gw-in-hand`, `gw-long-lining`, `gw-liberty`, `gw-pole-cavaletti`, `gw-body-work`, `gw-partnership`, `gw-trailer-loading`, `gw-standing-tied`, `gw-farrier-vet-prep`, `gw-tacking-exposure`, `gw-bathing-clipping`, `gw-new-environment`, `gw-desensitization`, `gw-obstacle-work`, `gw-leading-skills`, `gw-rehab-hand-walking`, `gw-halt-stand`, `gw-circles`, `gw-changes-direction`, `gw-spirals`, `gw-serpentines`, `gw-figure-8`, `gw-leg-yield`, `gw-shoulder-in`, `gw-haunches-in`, `gw-half-pass`, `gw-disengage-hq`, `gw-turn-on-forehand`, `gw-leg-sequence`, `gw-rein-back`, `gw-piaffe`, `gw-passage`, `gw-spanish-walk`, `gw-extensions`, `gw-collection-work`, `gw-body-language`, `gw-timing-aids`, `gw-line-whip-voice`, `gw-reading-horse`

This convention is enforced at the form layer. Aggregations on the dashboard or in Insights theme map should treat shared tags as one concept across modalities and `gw-`-prefixed tags as ground-work-specific.

### Backwards compatibility

Existing debrief documents written before this brief have neither `sessionModality` nor `movements`. Read paths must:

- Treat missing `sessionModality` as `'in-saddle'` (default for legacy entries) — Change 4 already handles this in the library renderer
- Treat missing `movements` as `[]`
- Treat missing both as a legacy ridden debrief — no migration script is required

---

## 4. AI Prompt Additions

The established YDJ pattern for prompt additions tied to a new feature is a dedicated markdown reference doc loaded at runtime, mirroring `YDJ_Prompt_Additions_Horse_Profile_v2.md`, `YDJ_Prompt_Additions_Horse_Health.md`, `YDJ_Prompt_Additions_Lesson_Notes.md`, and others. Section 4 follows that pattern.

### 4.1 — Author a new markdown reference doc

**File to create:** `YDJ_Prompt_Additions_Groundwork_Modality.md`
**Location:** Project root (alongside other `YDJ_Prompt_Additions_*.md` files)
**Pattern reference:** Match the structure, tone, and section format of `YDJ_Prompt_Additions_Horse_Profile_v2.md` exactly. That file is the canonical pattern.

The new file's complete contents follow. Claude Code should write this file as-is; no field-level interpretation is required.

````markdown
# YDJ Prompt Additions: Groundwork Modality
## Exact Insertions for Existing Prompts — April 2026

**Companion to:** `post-ride-debrief-with-intentions.html` (updated form with session modality field and modality-aware movement checkboxes)

---

## Overview

This document specifies the exact text to add to existing YDJ prompts to ensure all new session modality data is actively used in AI coaching outputs. It follows the same format as all other YDJ Prompt Additions documents.

The Debrief update introduced two new data elements requiring prompt support:
1. **Session modality** — every debrief now records whether the session was "in-saddle," "on-ground," or "combined"
2. **Structured movement tags** — every debrief now records a list of movement and focus tags drawn from a controlled vocabulary, with `gw-` prefix denoting ground-work-specific activities

Each section below identifies:
- **Which prompt** to modify
- **Where** in the prompt to insert the new text
- **The exact addition** (ready to copy-paste)

This document is a peer to `YDJ_Prompt_Additions_Horse_Profile_v2.md` Section 5 (Groundwork-Only Guardrail). The horse-profile guardrail applies whenever a horse is flagged as ground-work-only at the profile level. The session-modality guidance below applies at the per-session level — a rider with a ridden horse may still log a specific session as ground work, and the AI must respond to what the rider actually did.

---

## 1. Shared Base Context — Update Debrief Data Description

**File:** `YDJ_AI_Coaching_Voice_Prompts_v3.md` — Shared Base Context block
**Locate:** The data types list at the top of the base context, where Debrief / Post-Ride Debrief data is described
**Action:** Update the Debrief data bullet to mention session modality and movement tags

If the existing bullet describes Debrief data, append the modality and movement tag detail. If no Debrief bullet currently exists in the data types list, add one:

```
- Debrief(s): Session-level reflections including overall quality, ride arc,
  rider/horse energy, mental state, process goal ratings, five reflection
  categories (Personal Milestone, External Validation, Aha Moment, Connection,
  Obstacle), session modality (in-saddle / on-ground / combined), and a
  structured list of movement and focus tags drawn from a controlled
  vocabulary. Tags prefixed with "gw-" denote ground-work-specific activities.
```

---

## 2. Shared Base Context — Session Modality Awareness

**File:** `YDJ_AI_Coaching_Voice_Prompts_v3.md` — Shared Base Context block
**Insert after:** The GROUNDWORK-ONLY / NOT UNDER SADDLE GUARDRAIL block (from `YDJ_Prompt_Additions_Horse_Profile_v2.md` Section 5)

### Addition:

```
SESSION MODALITY AWARENESS:
Every Debrief records the modality of the session it describes. This is a
per-session signal, distinct from the horse-profile-level groundwork-only
status. A horse may be ridden generally and have a specific session logged as
ground work — the AI must respond to what the rider actually did in that
session.

The three values:

- "in-saddle" — Ridden work. No behavioral change from the standard ridden
  coaching framing. Reference rein aids, leg aids, seat, rider position,
  and the felt experience under saddle as appropriate to the voice.

- "on-ground" — Handler-from-the-ground work (in-hand, lunging, long-lining,
  liberty, body work, pole/cavaletti from the ground). Frame all coaching
  for this session in ground-work terms. Do not reference rein aids, leg
  aids, seat, or rider position. Reference instead body language, line/whip/
  voice cues, the handler's position relative to the horse, and timing of
  release. When the rider checks movement tags like "shoulder-in" or
  "half-pass" within an on-ground session, these are in-hand executions of
  those movements (the prefixed tags `gw-shoulder-in` and `gw-half-pass`
  make this explicit).

- "combined" — The rider warmed up in-hand and then rode, or rode and then
  concluded with body work, or otherwise integrated both modalities in one
  session. Acknowledge both phases where the data supports it. The Debrief
  movement tags will include both ground-work and ridden tags; reference
  each in its appropriate framing.

INTERACTION WITH HORSE-PROFILE-LEVEL GROUNDWORK STATUS:
Two independent signals can trigger ground-work framing:
1. The horse profile flag — applies to all sessions for that horse regardless
   of how any individual session was logged.
2. The session modality field — applies to a specific session even when the
   horse is ridden generally.

If EITHER signal indicates ground work, that session's coaching must use
ground-work framing. The two signals reinforce one another but do not depend
on one another. A rider whose horse is flagged ground-work-only and who logs
a session as in-saddle has likely made an entry error or is logging a session
on a different horse — surface this respectfully if the contradiction is
material to the coaching response.
```

---

## 3. Shared Base Context — Movement Tag Vocabulary

**File:** `YDJ_AI_Coaching_Voice_Prompts_v3.md` — Shared Base Context block
**Insert after:** The SESSION MODALITY AWARENESS block

### Addition:

```
MOVEMENT TAG VOCABULARY:
Every Debrief includes a structured `movements` array containing tag values
drawn from a controlled vocabulary. Use this list to identify what the rider
has actually been working on. Do not reference movements not present in the
recent tag history when discussing recent work — this is consistent with the
Data Integrity Guardrail.

TAG NAMING CONVENTION:

- Shared tags (no prefix) describe concepts that apply across modalities:
  rhythm, relaxation, attentiveness, balance, bend-flexion, straightness,
  suppleness, impulsion, engagement, softness-responsiveness, collection,
  breathing, concentration-focus, walk-work, trot-work, canter-work,
  transitions. When you see one of these tags in the rider's recent
  history, it may have been worked on under saddle, on the ground, or
  both — cross-reference with the session modality of the debrief that
  contained the tag.

- Ground-work-specific tags carry a `gw-` prefix: gw-lunging, gw-in-hand,
  gw-long-lining, gw-liberty, gw-pole-cavaletti, gw-body-work,
  gw-partnership, gw-trailer-loading, gw-standing-tied, gw-farrier-vet-prep,
  gw-tacking-exposure, gw-bathing-clipping, gw-new-environment,
  gw-desensitization, gw-obstacle-work, gw-leading-skills,
  gw-rehab-hand-walking, gw-halt-stand, gw-circles, gw-changes-direction,
  gw-spirals, gw-serpentines, gw-figure-8, gw-leg-yield, gw-shoulder-in,
  gw-haunches-in, gw-half-pass, gw-disengage-hq, gw-turn-on-forehand,
  gw-leg-sequence, gw-rein-back, gw-piaffe, gw-passage, gw-spanish-walk,
  gw-extensions, gw-collection-work, gw-body-language, gw-timing-aids,
  gw-line-whip-voice, gw-reading-horse. These tags always describe ground
  work even when the same concept name (e.g., shoulder-in, piaffe) also
  exists in the ridden vocabulary.

INTERPRETATION GUIDANCE:

- A rider whose recent tag history is dominated by `gw-` prefixed tags is
  doing primarily ground-based work, regardless of horse-profile status.
  Frame coaching accordingly.

- A rider whose recent tag history mixes shared tags and `gw-` prefixed
  tags is integrating ground and ridden work. Pattern recognition across
  the two contexts (e.g., "you've been working on rhythm both on the
  lunge and under saddle this week") is exactly the kind of cross-modality
  insight worth surfacing.

- The `gw-partnership`, `gw-trailer-loading`, and other Handling & Life
  Skills tags represent foundational relationship work that doesn't appear
  in traditional dressage scoring but materially shapes whether the
  partnership functions on a difficult day. The Empathetic Coach in
  particular should honor this work when it appears.
```

---

## 4. Implementation Checklist

When implementing these additions:

- [ ] Update the Debrief data bullet in the Shared Base Context data list (Section 1)
- [ ] Insert SESSION MODALITY AWARENESS block into Shared Base Context (Section 2)
- [ ] Insert MOVEMENT TAG VOCABULARY block into Shared Base Context (Section 3)
- [ ] Confirm that the runtime prompt assembly loads this markdown file alongside other `YDJ_Prompt_Additions_*.md` files
- [ ] Confirm that the `sessionModality` field and `movements` array from the most recent debrief(s) are passed through to the rider context object that the prompt assembler reads — in the same code path where existing recent-debrief fields like `riderEnergy` and `mentalState` are passed

---

## 5. Test Scenarios to Validate

1. **Rider with ridden horse logs an on-ground session** → AI should frame coaching for that session in ground-work terms (no rein/leg references) while acknowledging the horse's general ridden status.
2. **Rider with ridden horse logs a combined session** → AI should reference both phases; ridden movement tags receive ridden framing, `gw-` tags receive ground-work framing.
3. **Rider with groundwork-only horse logs an in-saddle session** → AI should respectfully surface the apparent contradiction; horse-profile guardrail still applies.
4. **Rider's recent tag history is dominated by `gw-partnership` and `gw-obstacle-work`** → AI should recognize this as foundational relationship work; Empathetic Coach honors the investment.
5. **Rider's recent tag history mixes `walk-work` (ridden) and `walk-work` (ground)** → AI should recognize the shared concept as a cross-modality theme worth naming.
6. **Tag not present in any recent debrief** → AI should not reference that movement in coaching; consistent with Data Integrity Guardrail.

---

*Document version: 1.0 — April 2026*
*Companion form: post-ride-debrief-with-intentions.html (April 2026 groundwork awareness update)*
*Peer document: YDJ_Prompt_Additions_Horse_Profile_v2.md Section 5 (horse-profile-level groundwork-only guardrail)*
*Follows format established in: YDJ_Prompt_Additions_Horse_Profile_v2.md, YDJ_Prompt_Additions_Horse_Health.md, YDJ_Prompt_Additions_Lesson_Notes.md*
````

---

### 4.2 — Wire `sessionModality` and `movements` into the rider context

**File:** `promptBuilder.js` (or whichever module is responsible for assembling per-session debrief fields into the rider context object passed to coaching prompts)

This is a small, locatable wiring change. The new markdown reference doc above is the *content*; this step ensures the *data* is available for the prompt assembler to use.

**What to find:** The code path where existing recent-debrief fields are read from Firestore and added to the rider context object. The signal field to grep for: `riderEnergy`, `horseEnergy`, or `mentalState` — at least one of these is being pulled from recent debrief documents and passed forward into the prompt context. Per the v2 Practice Card brief, `goalRatings` and `confirmedGoalsSnapshot` should also be in this code path.

**What to add:** Two new field reads alongside the existing ones:

- `sessionModality` — string value (`"in-saddle"`, `"on-ground"`, `"combined"`, or null for legacy entries)
- `movements` — array of strings (tag values; empty array for legacy entries)

If aggregation across multiple recent debriefs is being performed (e.g., compiling a list of recent tags), the `movements` arrays should be concatenated and deduplicated before being made available to the prompt assembler.

**Backwards compatibility:** If `sessionModality` is null or undefined on a legacy debrief, treat it as `"in-saddle"` (the same fallback used in Change 4 of Section 2). If `movements` is null or undefined, treat it as an empty array.

**What NOT to change:** Do not modify `BASE_CONTEXT` text, do not edit existing field reads, do not refactor the surrounding code. The change is two added field references in the existing data path.

If Claude Code finds that the current `promptBuilder.js` does not yet read recent-debrief fields at all (e.g., the v2 Practice Card brief is implemented but not the field-passing infrastructure), this brief is not the right place to build that infrastructure — escalate and discuss before proceeding. The expected state is that the path exists and we are appending two fields to it.

### 4.3 — Append canonical tag vocabulary to the prompt reference doc

**File:** `YDJ_Complete_AI_Prompt_Reference.md`
**Action:** Append a new section at the end of the file titled "Movement Tag Vocabulary (April 2026)." Content: copy the full tag list from Section 3 of this brief (the "Tag-naming convention (canonical reference)" subsection). This serves as the single source of truth for the tag vocabulary, separate from the prompt insertion language in `YDJ_Prompt_Additions_Groundwork_Modality.md`.

This is documentation, not a runtime prompt change — it ensures future contributors and any future tag-aware features (dashboard chip aggregation, Insights theme map cross-modality recognition) can reference the canonical list in one place.

### 4.4 — No voice-specific content additions

The session-level modality is a framing concern that applies uniformly across all four coaching voices. This is intentionally different from the horse-profile-level work in `YDJ_Prompt_Additions_Horse_Profile_v2.md`, which added voice-specific content to the Empathetic Coach (ground work as invisible investment) and other voices. Those additions remain in effect and are not modified by this brief.

---

## 5. Implementation Checklist

### HTML / Form
- [ ] Read the current production `post-ride-debrief-with-intentions.html` before making any edits
- [ ] Change 1: Update `<title>` and header subtitle to "Debrief"
- [ ] Change 2: Add Session Modality question to Section 1, after Type of Session
- [ ] Change 3: Add movement checkbox blocks above the existing `workFocus` textarea inside Additional Context
- [ ] Change 4: Add dynamic title label in `renderDebriefs()` library renderer
- [ ] Change 5: Append new CSS to existing `<style>` block
- [ ] Change 6: Add modality and movement tag JavaScript wiring
- [ ] Change 7: Add `sessionModality` to `requiredFields` validation; add `sessionModality` and `movements` to `debrief` payload object

### Firestore
- [ ] Verify new debriefs save with `sessionModality` and `movements` fields populated
- [ ] Verify legacy debriefs (no `sessionModality`) still render correctly in the library with the `'Post-Ride Debrief'` fallback title

### AI Prompts
- [ ] Author new file: `YDJ_Prompt_Additions_Groundwork_Modality.md` (Section 4.1 — content provided in this brief; copy verbatim)
- [ ] Wire `sessionModality` and `movements` from recent debriefs into the rider context object in `promptBuilder.js` (Section 4.2 — small additive change to existing field-reading path)
- [ ] Append "Movement Tag Vocabulary (April 2026)" section to `YDJ_Complete_AI_Prompt_Reference.md` (Section 4.3 — documentation)
- [ ] Confirm runtime prompt assembly loads the new markdown file alongside other `YDJ_Prompt_Additions_*.md` files
- [ ] No changes to coaching voice character profiles in `YDJ_AI_Coaching_Voice_Prompts_v3.md` (Section 4.4)

### Tests / verification
- [ ] Form: Selecting "In the saddle" reveals only the Ridden Work block
- [ ] Form: Selecting "On the ground" reveals only the Ground Work block
- [ ] Form: Selecting "Combined" reveals both blocks stacked
- [ ] Form: Submitting without selecting a modality fails validation with the existing alert
- [ ] Form: All existing fields (date, horse, session type, ratings, ride arc, process goals, reflection categories) continue to function unchanged
- [ ] Library: New debrief logged as on-ground displays "Post-Groundwork Debrief" title
- [ ] Library: New debrief logged as combined displays "Combined Session Debrief" title
- [ ] Library: Legacy debrief (no `sessionModality`) displays "Post-Ride Debrief" title
- [ ] Coaching: Generate Multi-Voice Coaching for a rider with a recent on-ground debrief; verify no rein/leg/saddle references appear in the output
- [ ] Coaching: Generate Multi-Voice Coaching for a rider with a recent combined debrief; verify both ridden and ground-work framing appear where appropriate
- [ ] Coaching: Generate Multi-Voice Coaching for a rider with a horse flagged groundwork-only at the profile level AND a recent on-ground debrief; verify both signals reinforce ground-work framing without contradiction

---

## 6. Out of Scope (explicitly NOT changed in this brief)

The following are deliberately untouched:

- Section 1 header label "Ride Basics" — not renamed
- "Date of Ride" field label — not renamed
- "Ride arc" picker label and behavior — not renamed; six sparkline shapes apply cleanly to all modalities without label change
- Help text under the Horse field ("Which horse did you ride?") — not modified
- Quick Ratings section labels and rating fields (overall quality, confidence-in-execution, rider energy, horse energy, mental state) — not modified
- Process Goals section (Section 2.5) — not modified; `confirmedGoalsSnapshot` and `goalRatings` continue to operate per the v2 brief
- The five reflection category text fields and their labels — not modified
- The existing `workFocus` textarea — not modified; remains in place below the new movement checkboxes
- Voice input buttons on existing textareas — not modified
- Save Draft and Complete Debrief button behavior — not modified
- Completion screen text — not modified ("Your post-ride insights have been recorded" copy is left as-is even though it specifies "post-ride"; this is acceptable because the completion screen appears briefly and the dynamic library label is the durable representation)
- `BASE_CONTEXT` in `promptBuilder.js` — not modified; the new prompt content lives in a new markdown reference doc per the established pattern
- Coaching voice character definitions and signature phrases in `YDJ_AI_Coaching_Voice_Prompts_v3.md` — not modified
- The horse-profile-level groundwork-only guardrail in `YDJ_Prompt_Additions_Horse_Profile_v2.md` Section 5 — not modified; the new modality work is a peer to it
- The Empathetic Coach "ground work as invisible investment" content from `YDJ_Prompt_Additions_Horse_Profile_v2.md` Section 6.3 — not modified; remains the primary place where ground-work emotional framing lives
- Dashboard "What You've Been Working On" chart — not in scope here; treat as a separate follow-up brief once tag aggregation patterns surface from real pilot data
- Insights theme map — not in scope; it consumes the new tags automatically through existing aggregation paths

---

*April 2026 · Revision 2. Reference prototype: `post-ride-debrief-groundwork-prototype.html`. Builds on `YDJ_PracticeCard_Debrief_v2_Implementation_Brief.md` and `YDJ_PostRideDebrief_Form_Changes.md`. Pattern reference for new markdown prompt additions doc: `YDJ_Prompt_Additions_Horse_Profile_v2.md`. Pilot motivation: a rider working primarily on the ground needs first-class platform support without forcing all riders into a parallel form.*
