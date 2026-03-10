**Your Dressage Journey**

**Post-Ride Debrief: Implementation Instructions**

**Covers:** Ride arc picker (new) · Overall quality slider (optional) · Confidence slider (updated copy) · Prompt changes

**Date:** March 2026    **File:** post-ride-debrief-with-intentions.html

# **Change Summary**

| Change | File | Field / Element | Required? |
| :---- | :---- | :---- | :---- |
| Add ride arc picker | post-ride-debrief-with-intentions.html | rideArc (string), rideArcNote (string) | **Yes — required field** |
| Overall quality slider → optional | post-ride-debrief-with-intentions.html | overallQuality (remove required) | **Optional** |
| Update confidence slider label & scale | post-ride-debrief-with-intentions.html | Label, help text, scale labels | **Yes — copy change** |
| Update Shared Base Context | YDJ\_AI\_Coaching\_Voice\_Prompts\_v3.md | Debrief fields list | **Yes — prompt change** |
| Update Voice 1 confidence framing | YDJ\_AI\_Coaching\_Voice\_Prompts\_v3.md | Voice 1 analytical instructions | **Yes — prompt change** |

# **Change 1 — Add Ride Arc Picker (Required)**

## **Overview**

A new required question to be inserted immediately after the Overall Ride Quality slider. Riders tap one of six sparkline icons to describe how their ride unfolded over time. Replaces the single overall rating as the primary required signal; the overall rating becomes optional (see Change 2).

## **Insert Position**

In post-ride-debrief-with-intentions.html, locate the existing Overall Ride Quality question block (id: overallQuality). Insert the arc picker immediately after it, before the next .question div.

## **HTML Structure**

The full mockup HTML is available in ride-consistency-picker.html. The section to lift into the debrief is the .question block with id arcQuestion. Copy the full block including:

* The label, .prompt-box, and .arc-grid

* All six .arc-option label elements with their inline SVGs

* The .shift-explain-wrapper div (conditional textarea)

* The .arc-check div inside each option

*Do not copy the demo banner, dev note box, preview summary, or page-level CSS from the mockup — these are for review purposes only.*

## **CSS to Add**

Add the following CSS blocks from the mockup into the debrief form's \<style\> section:

* .arc-grid, .arc-option, .arc-card, .arc-svg, .arc-label, .arc-check

* .shift-explain-wrapper, .shift-explain-wrapper.visible, .shift-explain-inner

* .new-badge (optional — can be removed after launch)

## **JavaScript**

In the form's script section, add the arc picker logic from the mockup:

* arcMeta object (arc values and coaching preview text — the preview summary block is optional; omit if not wanted)

* Event listener on all input\[name='rideArc'\] radios to show/hide .shift-explain-wrapper

* On form reset, clear the selected arc radio and collapse the shift explain wrapper

## **Required Field Validation**

The arc picker must be required. In the form's existing validation logic, add:

| // Arc picker validation |
| :---- |
| const rideArc \= document.querySelector('input\[name="rideArc"\]:checked'); |
| if (\!rideArc) { |
|   errors.push('Please select how your ride unfolded.'); |
| } |

## **Firebase — Data Fields**

Add to the debrief document object before saving:

| rideArc: document.querySelector('input\[name="rideArc"\]:checked')?.value || null, |
| :---- |
| rideArcNote: document.getElementById('shiftExplain')?.value.trim() || null, |

Both fields should be reset when the form is cleared. rideArc is required; rideArcNote is optional.

## **Arc Enum Values**

The six permitted values for the rideArc field:

| Value | Label shown to rider | AI coaching signal |
| :---- | :---- | :---- |
| consistent | Consistent throughout | Stable baseline session; good for benchmarking. |
| built | Rough start, finished strong | Identify what turned the ride around — reinforce the pattern. |
| faded | Strong start, faded | Investigate the cause: fatigue, focus lapse, or a specific moment. |
| peak | Strong in the middle | Explore what created the quality window; how to extend it. |
| valley | Rough patch, then recovered | Flag the recovery as a resilience signal worth tracking. |
| variable | All over the place | Flag for pattern analysis across multiple sessions. |

# **Change 2 — Overall Quality Slider: Make Optional**

## **Rationale**

The arc picker now provides richer, more nuanced ride quality data as a required field. The 1–10 overall quality number is useful for trend tracking but the pilot feedback showed riders found it reductive when ride quality varied throughout the session. Demoting it to optional reduces friction while preserving data for riders who find it useful.

## **HTML Change**

Locate the Overall Ride Quality label and remove the required asterisk and attribute:

| \<\!-- BEFORE \--\> |
| :---- |
| \<label\>Overall ride quality \<span class="required"\>\*\</span\>\</label\> |
| \<input type="range" id="overallQuality" min="1" max="10" value="5" required\> |
|  |
| \<\!-- AFTER \--\> |
| \<label\>Overall ride quality \<span class="optional-tag"\>(optional)\</span\>\</label\> |
| \<input type="range" id="overallQuality" min="1" max="10" value="5"\> |

## **Optional Tag Style**

Add to CSS if not already present:

| .optional-tag { |
| :---- |
|   font-size: 0.8em; |
|   color: var(--color-text-light); |
|   font-weight: 400; |
|   font-style: italic; |
| } |

## **Validation Change**

Remove overallQuality from required field validation. It should still be saved to Firebase when present; no change needed to the data collection logic — a slider always has a value. Consider saving null instead of the default 5 if the rider has not touched the slider, to distinguish 'not rated' from 'rated 5'.

Optional implementation:

| // Track whether the rider has interacted with the slider |
| :---- |
| let overallQualityTouched \= false; |
| document.getElementById('overallQuality').addEventListener('input', () \=\> { |
|   overallQualityTouched \= true; |
| }); |
|  |
| // In save logic: |
| overallQuality: overallQualityTouched |
|   ? document.getElementById('overallQuality').value |
|   : null, |

# **Change 3 — Confidence Slider: Updated Copy**

## **Background**

A pilot participant was interpreting the confidence slider as a measure of fear versus bravery rather than execution quality. The updated copy reframes the question to focus on the rider's ability to follow through on their intentions — which is a meaningful coaching signal and inclusive of fear as one possible source of hesitation without reducing the question to fear alone.

## **Copy Changes**

Make these three copy substitutions:

### **Label**

| \<\!-- BEFORE \--\> |
| :---- |
| Your confidence level this ride |
|  |
| \<\!-- AFTER \--\> |
| Confidence in your ability to execute |

### **Help Text**

| \<\!-- BEFORE \--\> |
| :---- |
| How confident did you feel in yourself as a rider during this session? |
|  |
| \<\!-- AFTER \--\> |
| Did your body follow through on what you asked? Rate how decisively |
| you rode as intended — hesitation can come from many places. |

### **Scale End Labels**

| \<\!-- BEFORE \--\> |
| :---- |
| Very uncertain  |  Fully confident |
|  |
| \<\!-- AFTER \--\> |
| Hesitant / unsure  |  Clear and committed |

## **HTML Diff**

Locate the confidence question block (id: confidenceLevel) and apply:

| \<label\>Confidence in your ability to execute\</label\> |
| :---- |
| \<div class="scale-container"\> |
|   \<div class="scale-wrapper"\> |
|     \<input type="range" id="confidenceLevel" min="1" max="10" value="5"\> |
|     \<span class="scale-value" id="confidenceValue"\>5\</span\> |
|   \</div\> |
|   \<div class="scale-labels"\> |
|     \<span class="scale-label"\>Hesitant / unsure\</span\> |
|     \<span class="scale-label"\>Clear and committed\</span\> |
|   \</div\> |
| \</div\> |
| \<p class="help-text"\>Did your body follow through on what you asked? |
| Rate how decisively you rode as intended — hesitation can |
| come from many places.\</p\> |

| Note: No changes required to the confidenceLevel field name, Firebase save logic, or data visualizations. This is a copy-only change. |
| :---- |

# **Change 4 — Prompt Changes Required**

## **Overview**

Two prompt changes are required. Both are document-edit-only — no code changes needed. Update YDJ\_AI\_Coaching\_Voice\_Prompts\_v3.md and regenerate the prompt context assembly.

## **4a. Shared Base Context — Add rideArc to Debrief Data Description**

The Shared Base Context lists what data types the AI may receive. The Post-Ride Debriefs line should be updated to mention ride arc as a field so all four voices know to interpret it.

| // CURRENT (line \~16 in Shared Base Context block): |
| :---- |
| \- Post-Ride Debriefs: Daily training session notes with wins, challenges, insights |
|  |
| // REPLACE WITH: |
| \- Post-Ride Debriefs: Daily training session notes with wins, challenges, |
|   insights, overall quality rating (optional), ride arc (how the session |
|   unfolded over time: consistent / built / faded / peak / valley / variable), |
|   and an optional rider note on what caused any shift. |

The ride arc field gives all four voices an additional dimension for pattern analysis — for example, a rider whose rides consistently 'fade' may need different coaching than one who 'builds'. Voice 2 (Technical Coach) and Voice 3 (Practical Strategist) will find this particularly useful for session structure analysis.

## **4b. Voice 1 (Empathetic Coach) — Refine Confidence Interpretation**

Voice 1 currently tracks 'confidence trends' and references Jane Savoie's mental skills framework. The slider reframe means the confidence score now reflects execution decisiveness rather than a fear/bravery axis. Add one clarifying instruction to Voice 1's analytical approach so it interprets the field correctly.

Locate the ANALYTICAL APPROACH section of Voice 1\. After the existing instruction about tracking confidence trends, add:

| // ADD after 'Track confidence trends across time' bullet: |
| :---- |
| \- The confidence field measures execution decisiveness — how clearly |
|   the rider's body followed through on their intentions. A low score |
|   may reflect fear, self-doubt, confusion, or physical interference. |
|   Do not assume low confidence \= fear. Look to the rider's own language |
|   in the debrief and reflection categories for what is actually present. |

| Why this matters: The old label ('How confident did you feel in yourself?') invited a fear-vs-brave read. The new label invites an execution read. Voice 1's existing language about building confidence through 'specific mental skills, not just positive thinking' is still correct and needs no change — only the interpretation of the data field needs to be grounded. |
| :---- |

## **What Does NOT Need Prompt Changes**

The following are not affected and require no updates:

* Voices 0, 2, and 3 — no confidence-specific analytical instructions to update

* Grand Prix Thinking prompts — do not reference confidence or overall quality as named fields

* Journey Map, Data Viz, Physical Guidance, Event Planner, Self-Assessment Analysis — same

* Level Progression Guardrails, Freestyle Guardrails, Event Preparation Guardrails — unaffected

* YDJ\_Core\_Dressage\_Principles.md — no field references

# **Implementation Checklist**

1. Copy arc picker HTML block from ride-consistency-picker.html into debrief form

2. Add arc picker CSS to debrief form style section

3. Add arc picker JavaScript (validation, show/hide, reset)

4. Add rideArc and rideArcNote to Firebase save object

5. Remove required asterisk and attribute from overallQuality

6. (Optional) Implement overallQuality null-when-untouched logic

7. Update confidence slider: label, help text, scale end labels

8. Update Shared Base Context in YDJ\_AI\_Coaching\_Voice\_Prompts\_v3.md (Post-Ride Debriefs line)

9. Update Voice 1 ANALYTICAL APPROACH in YDJ\_AI\_Coaching\_Voice\_Prompts\_v3.md (confidence interpretation)

10. Smoke-test: submit a test debrief, verify rideArc and rideArcNote appear in Firestore

11. Smoke-test: verify form cannot be submitted without arc selection

12. Smoke-test: verify shift explain textarea appears/hides correctly on arc selection

| Prompt architecture reminder: Prompt changes (Steps 8–9) require document editing only — no code changes. The context assembly in the Firebase Cloud Function picks up the updated prompt text automatically once the .md file is updated in the repository. |
| :---- |

