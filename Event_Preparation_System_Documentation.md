# Event Preparation Plan System Documentation

## Overview

The Event Preparation Plan system transforms rider goals and concerns into structured, week-by-week preparation roadmaps. This system consists of three components:

1. **Input Form** (`event-preparation-form.html`) - Collects comprehensive event and rider context
2. **Output Template** (`EventPreparationPlan.jsx`) - Displays structured preparation plans
3. **AI Generation Engine** - Uses Claude API to create personalized weekly guidance

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Rider Input Form                            │
│  • Event details (date, type, location)                         │
│  • Current context (horse, level, challenges)                   │
│  • Goals (up to 3)                                              │
│  • Concerns (up to 3)                                           │
│  • Resources & constraints                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    [Save to Database]
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Claude API Generation                          │
│  • Analyze timeframe and calculate phases                       │
│  • Review rider's YDJ history (debriefs, reflections)           │
│  • Generate personalized weekly structure                       │
│  • Address each goal and concern specifically                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Structured Preparation Plan Output                  │
│  • Executive summary                                            │
│  • Weekly breakdowns (Technical, Mental, Horse Management)      │
│  • Event day strategy                                           │
│  • Goal-specific guidance                                       │
│  • Concern mitigation strategies                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                   [Download as PDF/DOCX]
```

## Form Data Structure

The input form collects and saves data in the following JSON structure:

```json
{
  "timestamp": "2026-02-08T14:00:00Z",
  "eventDetails": {
    "name": "Spring Championship Show",
    "date": "2026-05-17",
    "type": "show",
    "typeOther": null,
    "location": "Oak Ridge Equestrian Center",
    "description": "Two-day show, riding I-1 both days"
  },
  "currentContext": {
    "horse": "Rocket Star",
    "currentLevel": "PSG",
    "targetLevel": "Intermediate 1",
    "experience": "some-experience",
    "challenges": "Inconsistent tempi changes, left half-pass",
    "progress": "Recent breakthrough with pirouettes"
  },
  "goals": [
    "Score 60% or higher in both tests",
    "Recover quickly from mistakes",
    "Have fun and enjoy the partnership"
  ],
  "concerns": [
    "Show nerves preventing peak performance",
    "Horse anxiety in warm-up",
    "Becoming discouraged if things don't go well"
  ],
  "resources": {
    "ridingFrequency": "5-6",
    "coachAccess": "weekly",
    "available": ["mirrors", "video", "ground-person"],
    "constraints": "Travel for work in late April may limit riding for 4 days"
  },
  "additional": {
    "info": "Additional context about mental game, past experiences, etc.",
    "preferredCoach": "emma"
  }
}
```

## Timeframe Calculation Logic

The system automatically calculates preparation phases based on weeks until event:

### 12+ Weeks Available
```
Foundation Phase:  Weeks 1-4   (4 weeks)
Preparation Phase: Weeks 5-8   (4 weeks)
Peak Phase:        Weeks 9-11  (3 weeks)
Taper Phase:       Week 12     (1 week)
```

### 8-11 Weeks Available
```
Foundation Phase:  Weeks 1-3   (3 weeks)
Preparation Phase: Weeks 4-6   (3 weeks)
Peak Phase:        Week 7      (1 week)
Taper Phase:       Week 8      (1 week)
```

### 4-7 Weeks Available
```
Foundation Phase:  Weeks 1-2   (2 weeks)
Preparation Phase: Week 3      (1 week)
Peak Phase:        None        (compressed)
Taper Phase:       Week 4      (1 week)
```

### Less Than 4 Weeks
```
Foundation Phase:  None        (emergency prep)
Preparation Phase: Weeks 1-N   (all but last week)
Peak Phase:        None        (compressed)
Taper Phase:       Final week  (1 week)
```

## Weekly Structure Template

Each week in the plan follows this structure:

### Week Header
```
Week N: [Descriptive, Motivating Title]
Phase: [Foundation/Preparation/Peak/Taper]
Dates: [Specific date range]
```

### Focus Theme
One-sentence theme that captures the week's purpose
- Foundation: Building blocks, establishing baseline
- Preparation: Sharpening skills, building confidence
- Peak: Integration, realistic simulation
- Taper: Mental loading, physical conservation

### Technical Targets (3-5 bullet points)
- Specific, measurable technical goals
- Referenced to their current level and target level
- Progressive difficulty building toward event
- Addresses known challenges from their history
- Includes frequency/volume recommendations

**Example:**
```
TECHNICAL TARGETS:
- Ride full I-1 test pattern in sections (first half Monday, second half Thursday). 
  Don't drill the complete test yet.
- Half-pass work: 3 sessions this week focusing on left direction. Use counter-bend 
  prep from your observation notes to control the shoulder.
- Tempi changes: Ride 3s on diagonal twice this week, focusing on straightness. 
  Your Jan 29 debrief showed these are coming easily - maintain that confidence.
- Include 2 sessions of "boring reliability" work - simple exercises done exceptionally 
  well to bank confidence.
- Film yourself once this week to check actual vs. felt quality.
```

### Mental Game (2-3 bullet points)
- Specific mental training exercises
- Directly addresses their stated concerns
- Builds on their reflection themes
- Progressive mental challenge

**Example:**
```
MENTAL GAME:
- Practice your pre-ride ritual 3x this week (even if just visualizing while not riding). 
  This addresses your concern about show nerves - making the routine automatic reduces 
  decision fatigue.
- Deliberate tension practice: In one ride this week, intentionally create pressure 
  (have someone watch and score, or imagine you're being judged). Notice your physical 
  response and practice softening through it.
- Journal after each ride: One thing that worked well, one piece of information for 
  next time. This trains the recovery-from-mistakes skill you want for the show.
```

### Horse Management (2-3 bullet points)
- Specific to the individual horse
- Addresses known soundness/behavioral issues
- Conditioning appropriate to phase
- Event-specific preparation

**Example:**
```
HORSE MANAGEMENT:
- Monitor Rocket's vitamin E supplementation - confirm levels are stable before 
  increasing workload.
- Vary warm-up routines this week (different order, different location in arena). 
  This prepares him for the unpredictability of show warm-up and addresses your 
  concern about his anxiety.
- Include one hack/light day mid-week to keep him mentally fresh. Your data shows 
  he responds well when not drilled.
```

### Success Markers (2-3 bullet points)
- How they'll know the week was productive
- What "good enough" looks like
- Not perfection-based metrics

**Example:**
```
SUCCESS MARKERS:
- You can ride through the I-1 test movements in any order without losing quality. 
  The sequence doesn't matter yet.
- You caught yourself "doing" too much at least 2x this week and successfully 
  softened/allowed instead.
- Rocket maintained consistent energy and attitude across all rides - no major 
  meltdowns or shut-downs.
```

## Claude API Prompt Template

The following prompt template is used to generate each plan:

```
SYSTEM CONTEXT:
You are an expert dressage coach creating a personalized event preparation plan. 
You have access to the rider's complete YDJ history including post-ride debriefs, 
weekly reflections, rider and horse profiles, and observations. Your job is to 
create a structured, actionable, week-by-week plan that:

1. Builds systematically toward their event
2. Addresses each stated goal with specific strategies
3. Mitigates each stated concern proactively
4. Draws on patterns from their actual riding data
5. Balances realism with encouragement
6. Uses the selected coaching voice appropriately

COACHING VOICES:
- Herr Klaus von Steinberg: Stern, direct, European classical tradition. No coddling, 
  high standards, but fair. "You must..." "This requires..." "Unacceptable work."
- Dr. Jordan Hayes: Analytical, neutral, data-focused. Clinical observations, 
  pattern recognition. "The data suggests..." "Statistically..." "Objectively..."
- Coach Emma: Encouraging, supportive, growth-focused. Warm but honest. "I see 
  progress in..." "Let's build on..." "You've got this..."

RIDER DATA:
{comprehensive JSON of all YDJ data}

EVENT DATA:
{form submission JSON}

TIMEFRAME:
- Today's date: {current_date}
- Event date: {event_date}
- Days until event: {days_count}
- Weeks until event: {weeks_count}
- Calculated phases: {phase_breakdown}

GENERATION INSTRUCTIONS:

1. EXECUTIVE SUMMARY (2-3 paragraphs, ~300 words)
   
   Open by acknowledging their specific situation - reference actual data points 
   from their history that show readiness. Don't be generic.
   
   Example opening: "Looking at your last six rides with Rocket, you've averaged 
   8.7/10 quality with consistent comments about him being 'through' and responsive. 
   Your January 26th debrief noted 'amazing pirouettes' and the ability to 'let go 
   and he maintains balance.' This isn't a partnership scrambling to get ready - 
   this is a partnership that's ready to showcase 14 weeks of solid work."
   
   Identify the ONE key insight they need to internalize between now and the event. 
   This should directly address their primary concern or build on their biggest 
   strength.
   
   End with a clear statement of the plan structure and what success looks like.

2. WEEKLY BREAKDOWN
   
   For each week until the event, generate:
   
   **Week N: [Title]**
   - Title should be action-oriented and motivating
   - Examples: "Building the Foundation", "Sharpening the Edges", "Dress Rehearsal", 
     "Mental Loading Week"
   
   **Phase:** [Foundation/Preparation/Peak/Taper]
   
   **Dates:** [Specific date range for this week]
   
   **FOCUS THEME:**
   One sentence capturing the week's purpose.
   
   **TECHNICAL TARGETS:**
   - 3-5 specific, measurable technical goals
   - Must reference their current challenges and recent progress
   - Progressive difficulty appropriate to phase
   - Include frequency/volume recommendations (e.g., "3 sessions this week")
   - Consider their riding frequency and coach access
   
   **MENTAL GAME:**
   - 2-3 specific mental training exercises
   - Must address at least one stated concern each week
   - Build on their reflection themes (draw from actual reflection data)
   - Progressive challenge building mental resilience
   
   **HORSE MANAGEMENT:**
   - 2-3 specific points for this horse
   - Address known soundness/health issues from horse profile
   - Conditioning appropriate to phase and event type
   - Event-specific preparation (e.g., trailer practice, new environments)
   
   **SUCCESS MARKERS:**
   - 2-3 concrete indicators of productive week
   - Not perfection-based - what is "good enough"
   - Observable, measurable where possible

3. EVENT DAY STRATEGY
   
   Create hour-by-hour timeline from wake-up to post-event, including:
   
   **Pre-Event (night before and morning)**
   - Sleep, nutrition, logistics prep
   - Mental preparation routine
   - Horse care timeline
   
   **Arrival at Venue**
   - Timing recommendations based on their stated concerns
   - What to do while waiting (avoid spiraling)
   
   **Warm-Up Strategy**
   - Specific to this horse's needs and rider's concerns
   - Time recommendations
   - What to do if horse is tense/fresh/flat
   - How to handle warm-up ring chaos
   
   **In the Arena**
   - Pre-test minute strategy (what to think about entering arena)
   - During test: specific cue words or physical reminders for their concerns
   - Recovery strategy if mistakes happen (addresses their recovery goal)
   
   **Between Tests** (if multi-day or multi-class)
   - How to process first test
   - Avoid discouragement cycle
   - Physical and mental reset
   
   **Post-Event**
   - Immediate processing (regardless of outcome)
   - Horse care
   - How to handle results (good or disappointing)

4. GOAL-SPECIFIC GUIDANCE
   
   For each stated goal, provide:
   
   **Goal: [Their stated goal]**
   
   **How the Plan Builds Toward This:**
   - Specific weeks/elements that address this goal
   - Progressive checkpoints
   
   **Success Metrics:**
   - What achieving this goal looks like
   - What "good enough" looks like (realistic expectation setting)
   
   **If It Doesn't Happen:**
   - How to handle not achieving this specific goal
   - What it means (and doesn't mean) about their riding
   - Next steps

5. CONCERN-SPECIFIC MITIGATION
   
   For each stated concern, provide:
   
   **Concern: [Their stated concern]**
   
   **Prevention Strategy:**
   - Specific weeks/practices that reduce likelihood of this concern
   - Early warning signs to watch for
   
   **In-the-Moment Response:**
   - Exactly what to do if this concern manifests at the event
   - Specific cue words, physical actions, or mental reframes
   
   **Recovery Plan:**
   - If this concern does impact their event, how to process and move forward

FORMATTING:
- Use clear markdown headers (##, ###)
- Use bullet points for lists
- Bold important terms or cue phrases
- Keep language conversational and specific to chosen coaching voice
- Reference actual data points from their history frequently
- No generic advice - everything should feel personalized

LENGTH:
- Executive Summary: 250-350 words
- Each Week: 400-600 words
- Event Day Strategy: 600-800 words
- Each Goal/Concern section: 150-250 words
- Total plan: 5,000-8,000 words

TONE:
- Match the selected coaching voice throughout
- Balance honesty with encouragement
- Acknowledge challenges while maintaining belief in capability
- Be specific and actionable, not vague or generic
- Show you've actually read their data, not just generating templates

Generate the complete {weeks_count}-week preparation plan now.
```

## Implementation Notes

### Database Requirements

Store in Firebase (or similar):
```javascript
collections:
  - event_preparations
      - preparation_id
          - event_data (from form)
          - rider_id (link to rider profile)
          - generated_plan (Claude API response)
          - created_at
          - updated_at
          - status (draft/active/completed)
```

### API Integration Points

1. **Form Submission → Database**
   ```javascript
   const saveEventPreparation = async (formData) => {
     const docRef = await db.collection('event_preparations').add({
       ...formData,
       rider_id: currentUser.uid,
       created_at: new Date(),
       status: 'draft'
     });
     return docRef.id;
   };
   ```

2. **Generate Plan → Claude API**
   ```javascript
   const generatePreparationPlan = async (eventData, riderHistory) => {
     const prompt = buildPlanPrompt(eventData, riderHistory);
     
     const response = await fetch('https://api.anthropic.com/v1/messages', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         model: 'claude-sonnet-4-20250514',
         max_tokens: 8000, // Enough for full plan
         messages: [{ role: 'user', content: prompt }]
       })
     });
     
     const data = await response.json();
     return data.content.find(item => item.type === 'text')?.text;
   };
   ```

3. **Save Generated Plan**
   ```javascript
   const savePlanToDatabase = async (prepId, planContent) => {
     await db.collection('event_preparations').doc(prepId).update({
       generated_plan: planContent,
       status: 'active',
       updated_at: new Date()
     });
   };
   ```

### PDF/DOCX Export

Use existing docx skill for Word export:
```javascript
const exportPlanToDocx = async (plan) => {
  const { Document, Packer, Paragraph, Heading, TextRun } = require('docx');
  
  // Build document structure
  const doc = new Document({
    sections: [{
      children: [
        new Heading({ text: plan.eventData.eventDetails.name, heading: 1 }),
        new Paragraph({ text: `Event Date: ${plan.eventData.eventDetails.date}` }),
        // ... build full document
      ]
    }]
  });
  
  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'event-preparation-plan.docx');
};
```

Use jsPDF for PDF export with proper formatting.

## User Flow

1. **Rider creates event preparation request**
   - Fills out comprehensive form
   - System calculates weeks until event
   - Can save as draft and return later

2. **System generates plan**
   - Pulls rider's complete YDJ history
   - Calls Claude API with comprehensive prompt
   - Parses response into structured format
   - Saves to database

3. **Rider reviews plan**
   - Can expand/collapse individual weeks
   - Download as PDF or Word document
   - Mark weeks as complete as they progress
   - Add notes or adjustments

4. **Plan tracking** (future enhancement)
   - Weekly check-in prompts
   - Compare planned vs actual rides
   - Adjust remaining weeks based on progress
   - Post-event reflection form to close loop

## Quality Assurance Checklist

Before deploying a generated plan, verify:

- [ ] All stated goals are addressed with specific strategies
- [ ] All stated concerns have mitigation plans
- [ ] References actual data from rider's history (not generic)
- [ ] Weekly technical targets are appropriate to their level
- [ ] Timeframe calculation is correct
- [ ] Phases make sense for available time
- [ ] Event day strategy is specific to event type
- [ ] Coaching voice is consistent throughout
- [ ] No contradictory advice across weeks
- [ ] Success markers are realistic and observable
- [ ] Plan acknowledges their constraints (work travel, coach access, etc.)

## Future Enhancements

1. **Dynamic Plan Adjustment**
   - Allow rider to mark weeks complete with notes
   - Regenerate remaining weeks based on progress
   - AI learns from actual vs planned performance

2. **Post-Event Analysis**
   - Structured reflection form after event
   - Compare goals vs outcomes
   - Feed learnings into future plans

3. **Pattern Recognition**
   - Analyze multiple events over time
   - Identify what preparation strategies work best for this rider
   - Customize future plans based on historical success

4. **Collaborative Features**
   - Share plan with coach for feedback
   - Coach can add notes or adjustments
   - Integration with coach-rider communication

5. **Video Integration**
   - Link weekly targets to specific reference videos
   - Upload ride videos for AI analysis
   - Compare plan targets to actual execution

---

## Example Generated Week

Here's what a complete week looks like in the generated plan:

---

**Week 3: Confirming the Foundation**

**Phase:** Foundation  
**Dates:** February 24 - March 2, 2026

**FOCUS THEME:**  
This week is about making I-1 movements feel unremarkable - they're just part of your vocabulary now, not special tricks you have to nail.

**TECHNICAL TARGETS:**

- **Half-pass work across the diagonal** (3 sessions this week). Focus on the left half-pass since you noted this as a current challenge. Use that counter-bend prep you observed with Kate's student - get the bend in Rocket's ribcage before you even start the half-pass. Aim for steady rhythm over maximum sideways movement.

- **Simple changes through walk** (2-3 transitions each ride). These need to be boringly reliable for I-1. Your January data shows Rocket is responsive to seat aids, so practice the downward transition from your seat before hand. Count to 3 in walk, then canter from seat. No drama.

- **Collected canter work** without attempting pirouettes yet. We're building the foundation. Ride 10-meter circles in counter-canter both directions, transitions within the gait, and spiral in/out. Your goal is to feel him sit and elevate without you having to hold everything together (your "allowing" theme from reflections).

- **Film yourself** once this week riding the I-1 movements you're most confident about. Sometimes we need visual confirmation that yes, this actually looks as good as it feels. This banks confidence.

- **One boring reliability session** this week - Training Level test or simple movements done exceptionally well. This is psychological insurance. When you get nervous before the show, you can remember this ride where everything just flowed.

**MENTAL GAME:**

- **Pre-ride ritual practice:** Before 4 rides this week, do your 3-minute pre-mount routine. Stand next to Rocket, visualize the feeling of him coming through his back (that "alive" connection you described in your Jan 25 reflection), take 5 slow breaths, state one intention for the ride. By May, this needs to be automatic. You're installing it now so show nerves can't derail it.

- **"Catching and releasing" practice:** Your reflections show you know you need to get out of "work mode" and into "allow mode." Set a phone timer for random intervals during one ride this week. When it beeps, pause and scan: where are you gripping? Your jaw? Seat? Hands? Notice it, soften it, move on. No judgment - just data collection.

- **Reframe comparison thoughts:** You wrote about the challenge of being in a barn with exceptional riders and high standards. This week, when you notice comparison creeping in, practice the reframe: "Their excellence shows me what's possible" rather than "I'm not as good as them." Literally say it out loud if needed. Your brain will resist, but keep practicing.

**HORSE MANAGEMENT:**

- **Vitamin E check:** Make sure Rocket's supplementation is dialed in before you start asking for more collected work. His history shows deficiency issues - confirm with vet that levels are stable now. Increased collection requires more neuromuscular efficiency.

- **Vary warm-up patterns:** Don't let him (or you) lock into "we always start with 10 minutes walk, then left trot, then..." Mix it up. Sometimes start with right. Sometimes skip walk and go straight to trot. This prepares both of you for the chaos of a show warm-up ring and directly addresses your concern about his anxiety. Unpredictability in safe context builds resilience.

- **Mid-week hack day:** If weather and schedule allow, take him for an easy walk/trot hack outside the arena Wednesday or Thursday. Your debrief data shows he responds well when not drilled. Keep his brain fresh and positive about work.

**SUCCESS MARKERS:**

- You rode at least 3 sessions this week where you consciously practiced "allowing" instead of "doing" - and it worked. He didn't fall apart when you softened.

- The left half-pass improved noticeably from Monday to Friday. Doesn't have to be perfect, just measurably better rhythm or steadier bend.

- You felt genuinely confident in at least 5 of the I-1 movements. They're starting to feel like "your" movements, not borrowed tricks.

- Rocket maintained good energy and attitude across all rides - no major anxiety spikes or shut-downs even when you varied the warm-up.

---

This example shows the level of detail and personalization expected in every week of the plan.
