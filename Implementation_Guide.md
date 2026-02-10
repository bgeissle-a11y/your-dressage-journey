# Event Preparation Planner - Implementation Guide

## What I've Built for You

I've created a complete system for generating personalized event preparation plans for YDJ participants. This transforms your manual pilot process (where you generated the 12-week plan for me) into an automated, scalable feature.

## The Three Components

### 1. Input Form (`event-preparation-form.html`)
A comprehensive web form that collects everything needed to generate a personalized plan:

**What it collects:**
- Event details (date, type, location, description)
- Current context (which horse, current vs target level, experience level)
- Specific technical challenges and recent progress
- Up to 3 goals (what they want to achieve)
- Up to 3 concerns (what worries them)
- Resources (riding frequency, coach access, available tools)
- Constraints (travel, soundness issues, etc.)
- Additional context and preferred coaching voice

**Key features:**
- Mobile-responsive design matching YDJ aesthetic
- Auto-save to localStorage (no lost data)
- Draft saving capability
- Character counting for longer fields
- Smart form logic (conditional fields)
- Data validation

**Where this fits in YDJ:**
This would be a new feature available to subscribers, probably after they've completed minimum baseline data (5 debriefs, 5 reflections). It creates a structured way for riders to request preparation plans for upcoming events.

### 2. Output Template (`EventPreparationPlan.jsx`)
A React component that displays the generated plan in an interactive, user-friendly format:

**What it displays:**
- Event countdown and timeline
- Executive summary (personalized opening)
- Week-by-week breakdown (collapsible sections)
- Event day strategy
- Goal-specific guidance
- Concern mitigation strategies

**Key features:**
- Expandable/collapsible weeks (mobile-friendly)
- Download to PDF or DOCX
- Progress tracking (future: mark weeks complete)
- Beautiful formatting matching YDJ design system
- Responsive layout

**Where this fits in YDJ:**
This becomes a new page/view in your app. After a user submits the preparation form, they're taken to this view showing their personalized plan. They can return to it anytime, download it, and (in future versions) track progress week by week.

### 3. System Documentation (`Event_Preparation_System_Documentation.md`)
Comprehensive documentation explaining:

**Contents:**
- Complete system architecture
- Data structures and database schema
- Timeframe calculation logic (how weeks are divided into phases)
- Detailed weekly structure template
- Complete Claude API prompt template
- Implementation notes for your developer
- Quality assurance checklist
- Future enhancement ideas

**Most important section: The Claude API Prompt Template**

This is the detailed prompt your system will send to Claude to generate each plan. It includes:
- Exactly how to structure the output
- What data to reference from rider history
- How to address goals and concerns
- Word count targets for each section
- Coaching voice guidelines
- Example generated content

**Where this fits:**
This is your developer's guide. It shows them exactly how to:
1. Integrate the form with your database
2. Call Claude API to generate plans
3. Parse and display the results
4. Handle PDF/DOCX exports

## How It Works (User Flow)

```
1. Rider logs into YDJ
   └─> Sees "Prepare for Event" feature
       (if they have minimum data)

2. Rider clicks "Plan an Event"
   └─> Taken to event-preparation-form.html
       ├─> Fills out comprehensive form
       ├─> Can save as draft and return
       └─> Submits when ready

3. System processes submission
   ├─> Saves form data to database
   ├─> Calculates weeks until event
   ├─> Pulls rider's complete YDJ history
   │   (debriefs, reflections, profiles, observations)
   ├─> Constructs prompt for Claude API
   └─> Calls Claude API to generate plan

4. Claude generates personalized plan
   └─> Returns structured markdown content
       ├─> Executive summary
       ├─> Weekly breakdowns
       ├─> Event day strategy
       └─> Goal/concern sections

5. System displays plan
   └─> EventPreparationPlan.jsx component
       ├─> Rider can expand/collapse weeks
       ├─> Download as PDF or DOCX
       └─> Bookmark for later reference

6. Rider follows plan (future enhancement)
   └─> Weekly check-ins
       ├─> Mark weeks complete
       ├─> Add notes on progress
       └─> System adjusts remaining weeks
```

## Integration Requirements

### Technical Stack Needed

**Frontend:**
- React (you're already using this)
- Form handling library (Formik or similar)
- Markdown parser (react-markdown)
- PDF generation (jsPDF)
- DOCX generation (docx library)

**Backend:**
- Firebase or similar (you're planning this)
- Claude API integration (you're planning this)
- Storage for generated plans

**Estimated Development Time:**
- Form integration: 4-8 hours
- Claude API integration: 8-12 hours
- Output component: 8-12 hours
- PDF/DOCX export: 4-6 hours
- Testing and refinement: 8-10 hours

**Total: 32-48 hours of development work**

### Cost Considerations

**Claude API Costs:**
Each plan generation will use approximately 8,000-10,000 tokens (input + output).

At Sonnet 4 pricing:
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens

**Per plan cost:** Approximately $0.15-0.25

If you generate 100 plans per month: $15-25/month in API costs.

This is extremely affordable compared to the value provided to users.

### Database Schema

```javascript
// Firebase collection structure
event_preparations: {
  [preparation_id]: {
    rider_id: string,
    created_at: timestamp,
    updated_at: timestamp,
    status: 'draft' | 'active' | 'completed',
    
    event_data: {
      // All form fields from input
      name: string,
      date: date,
      type: string,
      // ... etc
    },
    
    generated_plan: {
      summary: string,
      weeks: [{
        week_number: number,
        title: string,
        phase: string,
        content: string,
        completed: boolean, // for future tracking
        notes: string // for rider notes
      }],
      event_day: string,
      goal_guidance: string,
      concern_mitigation: string
    },
    
    timeframe: {
      days_until: number,
      weeks_until: number,
      phases: object
    }
  }
}
```

## What Makes This Powerful

### 1. It's Not Generic
Unlike template-based approaches, each plan:
- References actual data from rider's history
- Addresses their specific goals and concerns
- Builds on their documented progress
- Acknowledges their real constraints
- Uses patterns from their reflections

### 2. It Scales Your Expertise
You manually created a brilliant 12-week plan for me. This system lets you provide that same quality to every YDJ participant without manual effort.

### 3. It Completes the Loop
YDJ currently helps riders capture and analyze data. This gives them actionable guidance based on that data - closing the loop from insight to action.

### 4. It Creates Sticky Engagement
A user who creates an event preparation plan:
- Has 12 weeks of structured guidance
- Returns weekly to check progress
- Continues logging debriefs/reflections
- Is invested in the platform

This dramatically increases retention.

## Pricing Strategy Recommendation

**Add as Premium Feature:**
- Include in $29.99/month tier
- Or offer as add-on: $9.99 per event plan
- Or bundle: 3 event plans/year included in higher tier

**Value Proposition:**
Compare to hiring a coach for a single consultation call ($75-150). This provides 12 weeks of personalized guidance for a fraction of the cost.

## Next Steps for Implementation

### Phase 1: MVP (Deploy with Pilot)
1. Deploy form as standalone page
2. Manual plan generation (you review form and generate via Claude)
3. Email plan to rider as PDF
4. Gather feedback on usefulness

### Phase 2: Semi-Automated (Q2 2026)
1. Form saves to database
2. Your developer runs script to generate plan
3. Plan displayed in React component
4. Download functionality works

### Phase 3: Fully Automated (Q3 2026)
1. Submit form → auto-generates plan
2. No manual intervention needed
3. Weekly progress tracking enabled
4. Post-event reflection loop closed

## Questions to Consider

1. **Access Control:** Who gets this feature?
   - All subscribers?
   - Only after X debriefs/reflections?
   - Premium tier only?

2. **Plan Limits:** How many plans can a rider create?
   - Unlimited?
   - 3 per year?
   - 1 active plan at a time?

3. **Coaching Voice:** How to handle selection?
   - Let riders choose?
   - Assign based on their preferences?
   - Offer all three for comparison?

4. **Updates:** Can riders update a plan mid-preparation?
   - Regenerate remaining weeks?
   - Manual edits only?
   - Coach collaboration?

5. **Post-Event:** What happens after the event?
   - Automatic reflection prompt?
   - Compare goals vs outcomes?
   - Archive the plan?

## Files Delivered

1. **event-preparation-form.html** - Ready to deploy standalone or integrate
2. **EventPreparationPlan.jsx** - React component for displaying plans
3. **Event_Preparation_System_Documentation.md** - Complete technical guide

All files follow YDJ design system and are production-ready pending database integration.

---

## Example Use Case

**Sarah is showing at Training Level for the first time:**

1. She fills out the form:
   - Event: Spring Schooling Show, April 15, 2026
   - Goals: Score 60%+, Stay calm in warm-up, Remember test
   - Concerns: Forgetting test, Horse spooking, First show nerves
   - Current challenges: Inconsistent free walk, Tense in canter

2. System generates 10-week plan:
   - Weeks 1-3: Foundation (build free walk, establish test patterns)
   - Weeks 4-7: Preparation (add pressure, practice test sections)
   - Week 8-9: Peak (full run-throughs, mental rehearsal)
   - Week 10: Taper (light work, mental loading)

3. Each week has specific targets:
   - Technical: "Practice free walk-medium walk-free walk transitions 3x this week"
   - Mental: "Visualization practice: ride the test in your mind 2x this week"
   - Horse: "Vary warm-up routine to reduce anticipation"

4. Plan addresses each goal and concern directly with strategies

5. Event day section gives hour-by-hour timeline and coping strategies

6. Sarah downloads plan, prints it, follows week by week

7. After show, she completes reflection that feeds into YDJ analytics

This creates a complete circle from data → insights → action → results → learning.

---

**You now have everything needed to offer personalized event preparation plans to YDJ users. This transforms YDJ from a data collection tool into a complete training partnership platform.**
