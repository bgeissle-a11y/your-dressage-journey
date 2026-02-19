# Structuring AI Outputs for Chunked Presentation

## Overview
This guide shows how to modify your AI prompts to generate outputs that work seamlessly with collapsible sections and tabbed interfaces, without requiring any changes to the AI analysis itself.

---

## Coaching Analysis - Four Voices

### Current Prompt Structure (KEEP THIS)
Your current prompt generates all four coaching voices in one comprehensive output. **Don't change this.**

### New Output Formatting (ADD THIS)

Add this instruction to the END of your coaching analysis prompt:

```
FORMATTING FOR DISPLAY:
Before generating the four coaching voices, create a "Quick Insights" summary with:

1. TOP 3 PATTERNS (bullet list, one sentence each)
   - Focus on the most significant patterns from this period
   - Make each pattern actionable and specific

2. YOUR PRIORITY THIS WEEK (single paragraph)
   - One clear, achievable focus for the next 7 days
   - Include specific context from their data

3. THIS WEEK'S CELEBRATION (single paragraph)
   - Highlight one genuine breakthrough or success
   - Connect it to their broader progress

Then generate all four coaching voice analyses as normal.
```

**Example Output Structure:**
```
🎯 QUICK INSIGHTS

Top 3 Patterns This Week:
• Your shoulder-in quality improved 65% when you established bend in walk first
• Rushing tempo appears in 80% of rides - specifically on corner approaches
• Napoleon shows 40% better relaxation in morning sessions vs. evening

Your Priority This Week:
Practice 10-meter circles at walk before every trot work session to establish rhythm without tension. This directly addresses the rushing pattern and builds on your successful shoulder-in work.

This Week's Celebration:
You successfully maintained connection through all three downward transitions in Tuesday's ride - a major breakthrough that demonstrates your developing feel and timing.

---

[Then continue with all four coaching voices exactly as you currently generate them]
```

---

## Journey Map

### Current Prompt Structure (KEEP THIS)
Your comprehensive journey analysis covers 60+ days of data. **Don't change the analysis depth.**

### New Output Formatting (ADD THIS)

Add this to your Journey Map prompt:

```
FORMATTING FOR DISPLAY:
Structure your analysis in these discrete sections:

1. AT A GLANCE METRICS (3-4 key numbers)
   - Total rides logged
   - Major breakthroughs count
   - Patterns identified
   - Current focus area (one sentence)

2. RECENT PROGRESS (Last 2 weeks)
   - 3-5 timeline entries with dates
   - Format: Date | Achievement/Challenge | Brief context

3. PATTERN ANALYSIS
   - Recurring patterns (3-5 items, tagged as Success/Challenge/Progress)
   - What's working (3-5 bullet points)

4. BREAKTHROUGHS & CELEBRATIONS
   - 2-4 significant breakthroughs from the period
   - Each with: Week of [date] | Title | 2-3 sentence description

5. CHALLENGES & LEARNING EDGES
   - Current challenges (2-3 items with frequency data)
   - Skills under development (3-5 items)

6. [HORSE NAME]'S PROGRESS
   - Physical development observations
   - Mental/emotional growth
   - Training response patterns

Then provide your full analysis under each section.
```

**Example Output:**
```
📊 AT A GLANCE

Rides Logged: 24
Major Breakthroughs: 3
Patterns Identified: 5
Current Focus: Building consistency in tempo transitions while maintaining connection

---

📅 RECENT PROGRESS (Last 2 Weeks)

February 13, 2026 | Best shoulder-in session yet
Maintained angle for full long side, Napoleon relaxed through entire exercise

February 11, 2026 | Connection breakthrough
Three perfect downward transitions with sustained softness
[etc.]

---

[Continue with other sections...]
```

---

## Grand Prix Thinking

### Current Prompt Structure (MODIFY THIS)

Your Grand Prix Thinking already has two layers (Mental Performance + Training Trajectory). Enhance the prompt to generate 3 specific paths per layer:

```
MENTAL PERFORMANCE PATHS (For immediate optimization - this week/month)

Generate exactly 3 paths addressing the rider's current performance challenges:

Path 1: [Focus on most urgent mental/emotional pattern]
- The Pattern: What's happening now
- The Mental Shift: Reframe needed
- This Week's Practice: 3 specific exercises
- Success Metric: Measurable outcome for this week

Path 2: [Second priority mental performance area]
[Same structure]

Path 3: [Third mental performance opportunity]
[Same structure]

---

TRAINING TRAJECTORY PATHS (For 6-12 month development)

Generate exactly 3 trajectories mapping long-term progression:

Trajectory 1: [Primary training goal - e.g., "Second Level Readiness"]
- Current Position: Where they are now
- Next Milestones (3-6 months): Specific movements/skills
- Building Blocks This Month: How current work connects
- Timeline Projection: Realistic timeline estimate

Trajectory 2: [Secondary development area]
[Same structure]

Trajectory 3: [Third trajectory focus]
[Same structure]
```

---

## Data Visualization Outputs

### No Changes Needed
Charts and graphs already chunk naturally. Just ensure each visualization has:
- Clear title
- Brief context (1-2 sentences)
- Key insight highlighted

---

## Implementation Tips

### 1. Section Headers Are Navigation
Use consistent, descriptive headers that become your navigation labels:
```
✅ Good: "🧘‍♀️ Path 1: Pre-Corner Anxiety Management"
❌ Bad: "Path 1" or "First Thing to Work On"
```

### 2. Front-Load Key Information
Put the most important insight in the first paragraph of each section:
```
✅ Good: "Your rushing pattern appears in 80% of corners - specifically..."
❌ Bad: "Let's talk about tempo. Tempo is important in dressage..."
```

### 3. Use Parallel Structure
If one path has "Current Position → Next Steps → Timeline", ALL paths should follow this structure.

### 4. Include Quantitative Anchors
Numbers help users scan quickly:
```
✅ "65% improvement in shoulder-in quality"
✅ "8 out of 10 rides"
✅ "3-6 month timeline"
```

### 5. Keep Sections Self-Contained
Each collapsed section should make sense on its own - don't require reading other sections first.

---

## Token Optimization Notes

**These formatting changes add minimal tokens:**
- Summary sections: ~100-150 tokens
- Structured headers: ~50 tokens per output
- Section organization: No additional tokens (just formatting existing content)

**Total impact: <300 tokens per output**

This is negligible compared to the value of improved user experience.

---

## Testing Your Formatted Outputs

Use this checklist:

**Coaching Analysis:**
- [ ] Quick Insights summary appears first
- [ ] Each of 4 voices has clear header
- [ ] Voices are similar length (~300-500 words each)

**Journey Map:**
- [ ] At-a-glance metrics are 3-4 numbers
- [ ] Each section has clear header
- [ ] Timeline entries include dates
- [ ] Patterns are tagged (Success/Challenge/Progress)

**Grand Prix Thinking:**
- [ ] Exactly 3 Mental Performance paths
- [ ] Exactly 3 Training Trajectory paths
- [ ] Each path follows same structure
- [ ] Clear differentiation between "this week" and "next 6 months"

---

## Migration Strategy

**Phase 1: Add Summaries**
Start by adding Quick Insights summaries to coaching analysis. Keep everything else the same.

**Phase 2: Structure Existing Sections**
Add clear section headers to Journey Map without changing content.

**Phase 3: Formalize Grand Prix Thinking**
Ensure exactly 3 paths per layer with parallel structure.

**Phase 4: Full Implementation**
Roll out collapsible UI with fully structured content.

---

## Key Principle

**The AI still generates ALL the same analysis** - we're just organizing it better for human consumption.

Users get:
- Quick overview to decide what to read
- Easy navigation to sections that matter today
- Full depth when they want to go deep
- Better mobile experience
- Less overwhelm

Without you:
- Running more API calls
- Generating less content
- Reducing quality
- Losing any analysis depth
