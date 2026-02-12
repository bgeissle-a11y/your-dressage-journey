

**YOUR DRESSAGE JOURNEY**

Platform Outputs Definition & Implementation Guide

v2.0 — Reconciled with Grand Prix Thinking Personalization Spec

February 2026

| *This v2.0 document reconciles the Outputs Definition with the existing Grand Prix Thinking Personalization Spec, corrects the self-assessment model to reflect the actual Rider and Physical Self-Assessment forms, and defines the two-layer Grand Prix Thinking architecture.* |
| :---: |

# **Table of Contents**

1\. Platform Architecture Overview

2\. Input Data Model

3\. Self-Assessment System — What Actually Exists

4\. Output 1: Journey Map

5\. Output 2: AI Analysis — Multi-Voice Coaching

6\. Output 3: Data Visualizations

7\. Output 4: Grand Prix Thinking — Two-Layer Architecture

7A. Layer 1: Mental Performance Paths (Pre-Ride / In-Saddle / Resilience)

7B. Layer 2: Training Trajectory Paths (Steady Builder / Ambitious Competitor / Curious Explorer)

7C. How the Two Layers Work Together

8\. Output 5: Physical Guidance

9\. Output 6: Event Planner

10\. Dressage Test Database Verification

11\. Input Form Changes Required — Delta Analysis

12\. API Call Summary & Architecture

13\. Implementation Priorities

# **1\. Platform Architecture Overview**

Your Dressage Journey transforms rider-submitted data into personalized coaching intelligence through a series of AI-powered analyses. The platform follows a consistent pattern: structured input data is assembled into targeted prompts, sent to the Anthropic Claude API, and the responses are formatted into professional coaching deliverables.

**Core Processing Pattern**

Every YDJ output follows the same fundamental workflow. Rider and horse profile data is combined with time-series input (debriefs, reflections, events) to create a rich context window. This context is sent to Claude with output-specific system prompts that define the coaching voice, analytical framework, and response format. The API response is then parsed, validated, and rendered into the final deliverable.

**API Integration Model**

All API calls use the Anthropic Messages API (claude-sonnet-4-20250514 for standard analyses, claude-opus-4-6 for complex multi-path reasoning). Each output type has a dedicated system prompt template, structured input assembly logic, and output parser. Responses are requested in JSON format where structured data is needed, and in markdown where narrative coaching content is produced.

**Pre-Processing Layer**

A critical architectural element is the server-side pre-processing layer that runs before any API call. As specified in the Grand Prix Thinking Personalization Spec, raw Firebase data is aggregated into computed summaries (per-horse trends, rating averages, recurring challenge extraction, reflection category counts, celebration/challenge ratios) before being sent to Claude. This reduces token costs and dramatically improves output quality by giving the AI structured patterns rather than raw journal entries.

# **2\. Input Data Model**

All outputs draw from a common pool of rider-submitted data. This section maps the actual existing forms and their data structures.

**2.1 Core Data (Required)**

| Data Type | Source Form | Frequency | Key Fields |
| :---- | :---- | :---- | :---- |
| Rider Profile | rider-profile.html | Once \+ updates | Name, experience level, riding frequency, goals, why they ride, what they enjoy, training environment |
| Horse Profile(s) | horse-profile.html | Once per horse \+ updates | Name, breed, age, training level, temperament, strengths, challenges, conditions, quirks |
| Post-Ride Debriefs | post-ride-debrief.html | After each ride | Date, horse, session type, ratings (quality, energy, mental state), intentions scores, narrative (wins, aha, horse notices, validation, challenges, work focus, self notices) |
| Weekly Reflections | dressage-reflection-form.html | Weekly | Category (Personal Milestone, External Validation, Aha Moment, Obstacle, Connection, Feel/Body Awareness), narrative response, significance rating |

**2.2 Specialized Self-Assessments (Required at Program Milestones)**

| CORRECTION FROM v1.0: The v1.0 document described a 6-dimension quantitative self-assessment (Position, Aids, Feel, Knowledge, Mental Game, Horse Management) with 1–10 scales. This form does NOT exist. The actual self-assessments are qualitative and narrative-rich, as described below. |
| :---- |

| Data Type | Source Form | Frequency | Key Fields |
| :---- | :---- | :---- | :---- |
| Rider Self-Assessment | rider-self-assessment.html | Weeks 1, 4, 8 | Awareness states (best/losing/lost: when, feelings, internal dialogue), Journey (role models \+ qualities, biggest challenge \+ resolution, greatest performance \+ factors), Self-Regulation (energizers, relaxers), Strengths (up to 4 attributes), Growth Areas (selected attributes) |
| Physical Self-Assessment | physical-self-assessment.html | Weeks 1, 4, 8 | Physical profile (challenges, strengths, asymmetries), Coaching cues heard often, PT/bodyworker status \+ cues, Kinesthetic awareness (1–10 slider), Tension patterns (daily areas \+ details, riding areas \+ comparison) |

**2.3 Optional Core Data**

| Data Type | Source Form | Frequency | Key Fields |
| :---- | :---- | :---- | :---- |
| Observations | observation-form.html | As needed | Date, observer, horse, what was observed, context, suggestions |
| Journey Events | journey-event-log.html | As they occur | Date, event type, category, description, magnitude, emotional response, lessons learned |
| Event Planner Requests | event-preparation-form.html | As needed | Target event, date, test(s), horse, readiness self-assessment, preparation timeline, areas of concern |

# **3\. Self-Assessment System — What Actually Exists**

| *The existing self-assessment forms are the heart of YDJ’s personalization engine. They are qualitative and narrative-rich by design — capturing the rider’s own language, mental patterns, and physical awareness in ways that a simple 1–10 scale cannot.* |
| :---- |

**3.1 Rider Self-Assessment: Sections & Purpose**

| Section | What It Captures | Key Fields | Used By |
| :---- | :---- | :---- | :---- |
| Awareness: At My Best | The rider’s peak state — triggers, feelings, and internal dialogue when things are flowing | bestWhen, bestFeelings, bestDialogue | Grand Prix Thinking (affirmations, replacement self-talk), Empathetic Coach voice |
| Awareness: Losing It | Early warning signals — what starts going wrong and how the rider talks to themselves | losingWhen, losingFeelings, losingDialogue | Grand Prix Thinking (self-talk scripts: triggers \+ old patterns), Resilience path |
| Awareness: Lost It | Full breakdown state — the bottom of the emotional spiral | lostWhen, lostFeelings, lostDialogue | Grand Prix Thinking (recovery language, growth reframes), crisis prevention |
| Journey: Role Models | Who the rider aspires to be like and why | roleModels, roleModelQualities | Grand Prix Thinking (visualization cues), coaching voice calibration |
| Journey: Biggest Challenge | The rider’s self-identified core struggle and how they’ve tried to resolve it | biggestChallenge, challengeResolution | All coaching voices, path recommendation logic |
| Journey: Greatest Performance | Peak performance factors — what conditions created their best moment | greatestPerformance, performanceFactors | Grand Prix Thinking (replicating success conditions), Event Planner (mental prep) |
| Self-Regulation | What energizes and calms the rider | energizers, relaxers | Pre-Ride path (warm-up routines), Physical Guidance, show-day strategies |
| Strengths (up to 4\) | Self-identified riding strengths from attribute checklist | selectedStrengths\[\] | Coaching voices (build on strengths), affirmation content |
| Growth Areas | Self-identified areas for development from attribute checklist | selectedGrowthAreas\[\] | Coaching voices (focus areas), path recommendation weighting |

**3.2 Physical Self-Assessment: Sections & Purpose**

| Section | What It Captures | Key Fields | Used By |
| :---- | :---- | :---- | :---- |
| Physical Profile | Body-based strengths, challenges, and known asymmetries | physicalChallenges, physicalStrengths, asymmetries | Grand Prix Thinking (body scan targets, exercise selection), Physical Guidance |
| Coaching Cues | Most common physical corrections heard from trainer | coachCues | Grand Prix Thinking (visualization cues, pre-mount checklist), Technical Coach voice |
| PT/Bodyworker Status | Whether rider works with physical therapist; their specific cues | ptStatus, ptType, ptCues | Physical Guidance (exercise safety, cross-referencing) |
| Kinesthetic Awareness | Self-rated body awareness on 1–10 scale | kinestheticSlider (1–10) | Calibrates how detailed physical cues should be in all outputs |
| Daily Tension Areas | Where stress manifests in daily life (body part checklist \+ narrative) | dailyTensionAreas\[\], dailyTensionDetails | Grand Prix Thinking (pre-ride body scan), Physical Guidance |
| Riding Tension Areas | Where stress manifests while riding (body part checklist \+ comparison to daily) | ridingTensionAreas\[\], tensionComparison | Grand Prix Thinking (in-saddle awareness cues), Physical Guidance |

**3.3 Self-Assessment as Output**

Self-assessments are both input and output. When a rider completes their Week 4 or Week 8 assessment, the AI compares it against their earlier assessment(s) and their debrief data to generate a self-perception analysis. This is the “meta-coaching” layer: coaching riders on how they see themselves.

| API Call | Purpose | Input Context | Output |
| :---- | :---- | :---- | :---- |
| Call 1: Self-Perception Analysis | Compare self-assessment narrative against evidence from debriefs and reflections | Current \+ previous self-assessments, all debriefs, all reflections | JSON: { awareness\_shift: { best/losing/lost changes noted }, blind\_spots: \[\], unrecognized\_growth: \[\], self\_talk\_evolution: "" } |
| Call 2: Growth Narrative | Generate coaching narrative about the rider’s evolution across assessment periods | All self-assessments (longitudinal) \+ milestone debrief data \+ rider profile | JSON: { growth\_narrative: "", biggest\_shifts: \[\], areas\_deepened: \[\], celebration\_points: \[\] } |
| Call 3: Physical Change Tracking | Compare physical self-assessments over time to identify body awareness growth | All physical self-assessments \+ debrief physical mentions | JSON: { awareness\_growth: "", tension\_changes: {}, cue\_internalization: \[\], kinesthetic\_trajectory: "" } |

**3.4 Decision: Do We Need the 6-Dimension Quantitative Assessment?**

| *The existing qualitative assessments are more powerful for Grand Prix Thinking personalization than a quantitative scale would be. However, a quantitative layer would add value for radar chart visualizations and longitudinal progress tracking. The recommendation is to add it as a SUPPLEMENT, not a replacement.* |
| :---- |

If added, a brief quantitative supplement to the existing Rider Self-Assessment could include six 1–10 scales (Position & Seat, Aids & Communication, Feel & Timing, Knowledge & Understanding, Mental Game, Horse Management) presented after the qualitative sections. This would enable radar chart visualizations and numerical trend tracking while preserving the narrative richness that drives Grand Prix Thinking personalization. This is categorized as a P2 enhancement — nice to have, not blocking.

# **4\. Output 1: Journey Map**

| *The Journey Map is the rider’s visual and narrative timeline — a living document that shows where they’ve been, where they are, and the trajectory of their growth.* |
| :---- |

**4.1 Purpose**

The Journey Map synthesizes all rider data into a chronological coaching narrative. It identifies patterns across rides, tracks progress toward stated goals, and highlights milestones and breakthroughs the rider may not have recognized themselves. It serves as both a motivational tool and a coaching reference.

**4.2 Components**

* **Timeline Narrative:** A flowing, week-by-week or phase-by-phase story of the rider’s journey, drawing from debriefs, reflections, and events.

* **Milestone Markers:** Key achievements identified by AI analysis — first successful shoulder-in, breakthrough in canter transitions, confidence recovery after a setback.

* **Pattern Recognition:** Recurring themes across debriefs (e.g., consistent tension in left-lead canter, improving feel for half-halts).

* **Goal Tracking:** Progress mapped against the rider’s stated goals from their profile and weekly reflections.

* **Trajectory Indicators:** Forward momentum, plateaus, and areas needing attention, presented encouragingly.

**4.3 API Implementation**

| API Call | Purpose | Input Context | Output |
| :---- | :---- | :---- | :---- |
| Call 1: Data Synthesis | Analyze all rider data chronologically and extract key themes, milestones, and patterns | Pre-processed rider data (per-horse summaries, mental patterns, reflection summary, event timeline) | JSON: { themes: \[\], milestones: \[\], patterns: \[\], goal\_progress: \[\] } |
| Call 2: Journey Narrative | Generate the coaching narrative for the Journey Map | Call 1 output \+ rider profile (learning style, goals) \+ warm coaching voice system prompt | Markdown narrative organized by time period with embedded milestone callouts |
| Call 3: Visualization Data | Structure the milestone and progress data for visual rendering | Call 1 output \+ rider’s goal list | JSON: { timeline\_events: \[\], progress\_scores: {}, visualization\_config: {} } |

**4.4 Generation Frequency**

Weekly (triggered by reflection submission) \+ on-demand. Each generation incorporates all data submitted to date.

# **5\. Output 2: AI Analysis — Multi-Voice Coaching**

| *The same rider data is analyzed through multiple coaching “voices” — each offering a distinct perspective, lens, and style.* |
| :---- |

**5.1 Coaching Voices**

| Voice | Perspective | Focus Areas | Tone |
| :---- | :---- | :---- | :---- |
| The Technical Coach | Biomechanics & precision | Position, aids, timing, movement execution, test accuracy | Clear, specific, constructive — cause and effect |
| The Empathetic Coach | Rider psychology & partnership | Confidence, fear, mental patterns, rider-horse relationship | Warm, validating, insightful — sees the whole person |
| The Classical Master | Principles & philosophy | Training scale, classical principles, horse welfare, long-term development | Wise, patient, sometimes poetic |
| The Practical Strategist | Goal achievement & planning | Training plans, competition prep, time management, measurable progress | Direct, organized, action-oriented |

**5.2 API Implementation**

Each voice is a separate API call with a distinct system prompt. All four calls receive the same pre-processed input data but produce analyses through their unique lens.

| API Call | Purpose | Input Context | Output |
| :---- | :---- | :---- | :---- |
| Call 1: Technical Coach | Analyze recent rides through biomechanical/technical lens | Pre-processed rider data, recent debriefs (2–4 weeks), physical self-assessment | JSON: { key\_observations: \[\], technical\_priorities: \[\], exercises: \[\], position\_notes: \[\] } |
| Call 2: Empathetic Coach | Analyze rider’s emotional/psychological patterns | Rider self-assessment (awareness states), recent debriefs \+ reflections, self-regulation data | JSON: { emotional\_patterns: \[\], confidence\_trajectory: \[\], partnership\_insights: \[\], mindset\_suggestions: \[\] } |
| Call 3: Classical Master | Evaluate work through classical dressage principles | Rider \+ horse profiles, recent debriefs, training scale context | JSON: { classical\_assessment: \[\], training\_scale\_progress: {}, philosophical\_reflection: "", patience\_points: \[\] } |
| Call 4: Practical Strategist | Create actionable coaching plan from all data | Rider profile (goals), horse profile, recent debriefs \+ reflections, upcoming events if any | JSON: { priorities: \[\], weekly\_plan: {}, measurable\_goals: \[\], timeline: {} } |

**5.3 Generation Trigger**

Weekly coaching report (triggered by reflection submission). Individual voices can also be triggered on-demand.

# **6\. Output 3: Data Visualizations**

| *Visual representations of rider progress, patterns, and trends — making the invisible visible and turning subjective feel into trackable data.* |
| :---- |

**6.1 Visualization Types**

| Visualization | Data Source | What It Shows |
| :---- | :---- | :---- |
| Ride Quality Trend | Debrief overallQuality ratings | Session-by-session trajectory with rolling average and trend line |
| Mental State Distribution | Debrief mentalState field | How often the rider reports focused vs. frustrated vs. tense etc. |
| Quality by Mental State | Debriefs (cross-reference quality \+ mental state) | Which mental states correlate with higher ride quality |
| Theme Frequency Map | AI analysis of debrief narratives | Which topics/challenges appear most often (heat map or word cloud) |
| Goal Progress Dashboard | Reflections \+ debriefs mapped to goals | Visual progress toward each stated goal with milestone markers |
| Training Focus Distribution | Debrief workFocus field | What the rider has been working on most (pie/donut chart) |
| Confidence Trajectory | Debrief mentalState \+ reflection language | Emotional arc over the program (area chart with annotated events) |
| Celebration vs. Challenge Ratio | Debrief wins vs. challenges content length | Whether rider tracks challenges disproportionately to wins |
| Reflection Category Distribution | Reflections by category (6 categories) | Balance of reflection types — reveals if rider is obstacle-heavy or growth-focused |
| Self-Assessment Radar (if quantitative supplement added) | Quantitative self-assessment scores | Multi-dimensional growth across program milestones |

**6.2 API Implementation**

| API Call | Purpose | Input Context | Output |
| :---- | :---- | :---- | :---- |
| Call 1: Pattern Extraction | Analyze all debriefs to extract themes, sentiment, and focus area categorization | All debriefs chronologically, horse profiles | JSON: { ride\_scores: \[\], themes: {}, focus\_areas: {}, sentiment\_trend: \[\], celebration\_challenge\_ratio: {} } |
| Call 2: Goal Mapping | Map debrief and reflection content against rider’s stated goals | Rider goals, all debriefs, all reflections | JSON: { goals: \[{ goal, progress\_pct, evidence: \[\], milestones: \[\] }\] } |
| Call 3: Insight Narrative | Generate coaching narrative to accompany each visualization | Calls 1–2 output, rider profile | JSON: { chart\_insights: { chart\_name: "narrative text" } } |

**6.3 Rendering**

Visualizations are rendered client-side using Recharts (React) or Chart.js (HTML reports). Many visualizations can be computed directly from structured debrief data without an API call — the API is needed primarily for theme extraction from narrative text and for generating the insight narratives that accompany each chart.

# **7\. Output 4: Grand Prix Thinking — Two-Layer Architecture**

| KEY ARCHITECTURAL INSIGHT Grand Prix Thinking serves two distinct but complementary purposes. The v1.0 outputs document described one. The Personalization Spec describes the other. Both are essential. Together, they answer the rider’s two biggest questions: Layer 1 (Mental Performance Paths): “How do I perform my best TODAY?” Layer 2 (Training Trajectory Paths): “Where am I GOING over the next 1–5 years?” |
| :---- |

**7A. Layer 1: Mental Performance Paths**

***Source:** Grand Prix Thinking Personalization Spec \+ existing grand-prix-thinking.jsx component*

This is the existing, built, tested system. The three Mental Performance Paths (Pre-Ride, In-Saddle, Resilience) are the heart of Grand Prix Thinking as experienced by pilot users. Each path contains a 4-week progressive implementation plan with deeply personalized practices, self-talk scripts, horse-specific sequences, and body awareness cues — all generated from the rider’s own data and language.

| Path | Focus | What It Contains | Primary Data Sources |
| :---- | :---- | :---- | :---- |
| Pre-Ride | Build automatic preparation routines that prime mind and body | Daily non-negotiables, pre-mount body scan, horse-specific activation sequences, visualization cues | Physical Self-Assessment (asymmetries, tension, coach cues), Debriefs (first-10-minutes quality), Rider Self-Assessment (energizers) |
| In-Saddle | Master real-time refocusing and productive self-talk during rides | 3-Breath Reset, Arena Letter Anchors, productive self-talk scripts with trigger → old pattern → replacement, horse-specific mantras | Rider Self-Assessment (best/losing/lost dialogue), Debriefs (challenge patterns, mental state), Reflections (aha moments) |
| Resilience | Transform setbacks into stepping stones through growth mindset | Evidence-based affirmations, comparison trigger reframes, Progress Proof Journal, growth mindset reframes (old belief → new belief → evidence anchor) | Rider Self-Assessment (all awareness states, role models, greatest performance), Debriefs (wins vs. challenges ratio), Reflections (category distribution) |

**Personalization Depth:** Every element in Layer 1 is personalized using the rider’s own language. Affirmations are pulled from their reflection aha moments. Self-talk scripts use their actual losing/lost dialogue. Physical cues target their documented asymmetries. Horse-specific sequences reference each horse’s strengths and the rider’s per-horse patterns from debriefs. The Personalization Spec (Section 2\) maps every dashboard element to its exact data source — this mapping is the contract between data collection and generation quality.

**Path Selection Logic:** All three paths are always generated, but the AI marks one as “recommended” based on data signals. Strong lost-state patterns with harsh self-talk → Resilience first. Inconsistent first-10-minutes quality → Pre-Ride first. Mid-ride frustration spikes → In-Saddle first. Balanced data → all three equally.

**Data Tier System:** Layer 1 uses the three-tier data requirement system from the Personalization Spec. Tier 1 (Starter, minimum viable): Rider Profile \+ Self-Assessment \+ 1 Horse \+ 3 Debriefs. Tier 2 (Informed): adds Physical Self-Assessment \+ 5 Debriefs \+ 3 Reflections \+ 1 Event. Tier 3 (Full): 15+ Debriefs across multiple horses \+ 10+ Reflections \+ Observations \+ Multiple Events. The AI explicitly acknowledges data gaps at lower tiers.

**API Implementation:** Layer 1 follows the generation pipeline defined in the Personalization Spec (Section 5): Firebase data fetch → server-side pre-processing (compute per-horse summaries, mental patterns, reflection themes, physical summary, event timeline) → single Claude API call with comprehensive system prompt → JSON validation → Firebase storage → React component render.

| API Call | Purpose | Input Context | Output |
| :---- | :---- | :---- | :---- |
| Pre-Processing (Server) | Compute aggregated summaries from raw Firebase data before API call | All rider data from Firebase collections | Structured JSON: { tier, profile, physicalSummary, selfAssessment, horseSummaries\[\], mentalPatterns, reflectionSummary, eventTimeline, overallStats } |
| Call 1: Dashboard Generation (Sonnet or Opus) | Generate the complete personalized 3-path dashboard with all 4 weeks per path | Full pre-processed data payload \+ system prompt with schema \+ tier-specific instructions | JSON matching exact dashboard schema: { paths: \[{ id, title, subtitle, description, why, weeks: \[{ daily, practices, check\_in, success }\] }\] } |
| Post-Processing (Server) | Validate output JSON against source data (no hallucinated horse names, no invented metrics) | API output \+ source data for cross-reference | Validated dashboard JSON stored in analysis/grandPrixThinking/{generationId} |

**Staleness & Regeneration:** The dashboard regenerates when: 5+ new debriefs added since last generation, new horse profile added, self-assessment or physical assessment updated, user manual request, or 30 days elapsed. A dataSnapshot hash is stored with each generation so the frontend can compare and prompt: “Your dashboard was built from 8 debriefs. You now have 15\. Would you like to regenerate?”

**7B. Layer 2: Training Trajectory Paths**

***Source:** v1.0 Outputs Definition \+ Dressage Test Database*

This layer addresses the macro question: “Where am I going in my dressage development, and how do I get there?” While Layer 1 focuses on today’s ride, Layer 2 zooms out to the 1–5 year horizon. It reframes the rider’s current work in the context of the full dressage progression — showing that Intro-level work is the foundation of the same skills required at Grand Prix — and presents three legitimate development paths.

| Path | Philosophy | Pace | Best For |
| :---- | :---- | :---- | :---- |
| The Steady Builder | Thorough mastery at each level before advancing. Classical foundation. Nothing is rushed. | Slower, deeper | Riders who value correctness, horse welfare, and solid basics. Those with patience and long-term vision. |
| The Ambitious Competitor | Strategic advancement with show ring experience driving development. Learning by doing. | Moderate to brisk | Riders with competitive goals, who learn well under pressure, and who thrive on tangible milestones. |
| The Curious Explorer | Following the horse’s interests and strengths. Cross-training. Dressage as part of a broader education. | Variable, horse-led | Riders who prioritize the horse’s enjoyment, who may do multiple disciplines, or who value versatility. |

**Layer 2 Components**

* **Current Level Assessment:** Where the rider is now based on debrief data, self-assessment, and the movements they’re working on.

* **Movement Progression Maps:** For each movement the rider currently works on, the full progression to its Grand Prix form (e.g., 20m circle → 15m → 10m → volte → pirouette).

* **Year-by-Year Roadmap per Path:** What Years 1, 2, and 3–5 look like for each of the three trajectories, personalized to this rider and horse.

* **Tests to Target:** Specific dressage tests appropriate for each path’s pace, drawn from the verified test database.

* **Risk/Strength Analysis per Path:** What this rider brings to each path and where they’d need to stretch.

| API Call | Purpose | Input Context | Output |
| :---- | :---- | :---- | :---- |
| Call 1: Current State Analysis (Opus) | Deep analysis of rider’s current level, strengths, gaps, and trajectory from all data | Full pre-processed rider data \+ horse profiles \+ dressage test database context for current level | JSON: { current\_level: {}, strengths: \[\], gaps: \[\], trajectory: "", horse\_factors: {} } |
| Call 2: Three Trajectories (Opus) | Generate detailed development roadmap for each path, personalized to rider and horse | Call 1 output \+ rider goals \+ horse profile \+ dressage test progression data | JSON: { paths: \[{ name, philosophy, year1, year2, year3\_5, movements\_progression, tests\_to\_target, risks, strengths\_leveraged }\] } |
| Call 3: Movement Connection Mapping (Sonnet) | Map current exercises to their Grand Prix forms | Current exercises from debriefs \+ dressage test database progressions | JSON: { movement\_maps: \[{ current, gp\_form, progression\_steps, current\_relevance }\] } |
| Call 4: Path Narratives (Sonnet) | Write engaging coaching narrative for each trajectory | Calls 1–3 output \+ rider profile (learning style, goals, fears) | JSON: { path\_narratives: \[{ path\_name, narrative, your\_strengths\_here, watch\_out\_for }\] } |

**7C. How the Two Layers Work Together**

| Dimension | Layer 1: Mental Performance | Layer 2: Training Trajectory |
| :---- | :---- | :---- |
| Core Question | "How do I perform my best today?" | "Where am I going over the next 1–5 years?" |
| Time Horizon | This week, this ride, this moment | Months to years |
| Paths | Pre-Ride / In-Saddle / Resilience | Steady Builder / Ambitious Competitor / Curious Explorer |
| Content Type | 4-week implementation plans with daily practices, self-talk scripts, body cues | Year-by-year roadmaps with movement progressions and test targets |
| Primary Data | Rider Self-Assessment, Physical Self-Assessment, Debriefs, Reflections | Dressage Test Database, Horse Profiles, Debriefs (movements worked on), Goals |
| Personalization Source | Rider’s own language, dialogue, physical patterns | Rider’s current level, horse’s abilities, competitive/training goals |
| Model Required | Sonnet (single comprehensive call) | Opus (Calls 1–2) \+ Sonnet (Calls 3–4) |
| Update Frequency | On data threshold (5+ debriefs) or 30 days | At milestones: onboarding, Week 4, Week 8, major events |
| UI Component | Existing grand-prix-thinking.jsx (path cards → 4-week drilldown) | New component or tab within GPT dashboard |

**Unified Dashboard Experience**

The rider sees a single Grand Prix Thinking dashboard with two tabs or views. The default view is Layer 1 (Mental Performance) because it’s immediately actionable — “here’s what to do this week.” Layer 2 (Training Trajectory) is accessed via a “Your Long-Term Path” tab or section below the implementation plans. This architecture lets the rider toggle between “what do I practice today” and “where is all this taking me” without either perspective getting lost.

**Cross-Layer References**

The two layers naturally reinforce each other. Layer 1’s Pre-Ride path might include body scan targets that address asymmetries hindering progress toward Layer 2’s recommended test at the next level. Layer 2’s movement progression maps provide context for why the Layer 1 In-Saddle practices matter (“Your 3-Breath Reset is training the self-regulation you’ll need for canter pirouettes”). The AI system prompts for both layers should reference the other layer’s output to create these connections.

**Combined API Budget**

| Layer | API Calls | Model | When | Est. Cost per Generation |
| :---- | :---- | :---- | :---- | :---- |
| Layer 1: Mental Performance | 1 call (+ pre-processing) | Sonnet | On data threshold or 30 days | $0.03–$0.08 |
| Layer 2: Training Trajectory | 4 calls | Opus (2) \+ Sonnet (2) | At milestones (onboarding, Week 4, Week 8\) | $0.15–$0.30 |
| Total per rider per month | \~2–5 calls | Mixed | 1–2 Layer 1 \+ 0–1 Layer 2 | $0.06–$0.46 |

# **8\. Output 5: Physical Guidance**

| *Dressage is an athletic pursuit. Physical Guidance addresses the rider’s body as their primary tool — offering off-horse exercises, stretches, and body awareness practices tailored to their documented challenges.* |
| :---- |

**8.1 Data Sources (Existing Forms)**

Physical Guidance draws primarily from the Physical Self-Assessment form, which captures: physical challenges, strengths, and asymmetries; the most common coaching cues the rider hears; PT/bodyworker status and their specific cues; kinesthetic awareness level (1–10 slider); and tension patterns both in daily life and while riding. Secondary data comes from debrief narratives where riders describe physical experiences during rides (selfNotices field) and from the Rider Self-Assessment’s self-regulation section (energizers, relaxers).

**8.2 Components**

* **Position Pattern Analysis:** AI identifies recurring position-related themes by cross-referencing physical self-assessment with debrief narratives.

* **Off-Horse Exercises:** Targeted exercises addressing documented asymmetries and tension patterns, with explicit riding connection explanations.

* **Pre-Ride Preparation:** Warm-up routines calibrated to the rider’s kinesthetic awareness level (simpler cues for lower awareness, nuanced proprioceptive work for higher).

* **Body Awareness Prompts:** In-ride mindfulness cues targeting the rider’s specific tension areas (from riding tension checklist).

**8.3 API Implementation**

| API Call | Purpose | Input Context | Output |
| :---- | :---- | :---- | :---- |
| Call 1: Physical Pattern Analysis | Identify recurring physical themes from self-assessment \+ debrief data | Physical Self-Assessment (full), all debriefs (selfNotices, challenges fields), rider profile | JSON: { physical\_patterns: \[\], asymmetries: \[\], riding\_tension\_vs\_daily: {}, coach\_cue\_frequency: {}, positive\_physical\_habits: \[\] } |
| Call 2: Exercise Prescription | Generate personalized exercise recommendations linked to riding goals | Call 1 output \+ kinesthetic awareness level \+ PT status/cues \+ rider’s available time | JSON: { exercises: \[{ name, description, riding\_connection, frequency, difficulty }\], warm\_up\_routine: \[\], body\_awareness\_cues: \[\] } |

**8.4 Overlap with Grand Prix Thinking Layer 1**

The Pre-Ride path in Layer 1 includes physical preparation elements (body scans, non-negotiable exercises). Physical Guidance should complement, not duplicate, this content. The distinction: Layer 1’s physical elements are embedded within a mental performance framework (the body scan serves the goal of “allowing vs. forcing”). Physical Guidance stands alone as a dedicated fitness and body awareness output. The system prompts for both should reference each other to ensure complementarity.

**8.5 Disclaimer**

Standard disclaimer that these are general fitness suggestions for riders, not medical advice. Exercises are conservative and gentle. Riders with injuries or conditions are encouraged to consult their healthcare provider.

# **9\. Output 6: Event Planner**

| *The Event Planner is a comprehensive preparation system for shows, clinics, and other significant events — combining test knowledge, rider history, and strategic planning into a personalized preparation roadmap.* |
| :---- |

**9.1 Components**

* **Test Analysis:** Movement-by-movement breakdown from verified dressage test database including directives, coefficients, geometry, and common trouble spots.

* **Readiness Assessment:** AI evaluation of current readiness based on debriefs mapped to test requirements.

* **Preparation Timeline:** Week-by-week or day-by-day plan from now until the event.

* **Mental Preparation:** Confidence strategies drawn from Rider Self-Assessment (awareness states, self-regulation, greatest performance factors).

* **Show-Day Strategy:** Timeline, warm-up plan, between-test strategy, recovery routines (connects to Layer 1’s practices).

* **Post-Event Debrief Framework:** Structured questions feeding back into the YDJ data system.

**9.2 API Implementation**

| API Call | Purpose | Input Context | Output |
| :---- | :---- | :---- | :---- |
| Call 1: Test Requirements Assembly | Retrieve and structure complete test requirements from verified database | Target test ID(s), dressage test database | JSON: { test\_name, level, movements: \[{ movement, location, directive, coefficient, common\_errors }\], geometry: \[\], collective\_marks: \[\] } |
| Call 2: Readiness Analysis | Evaluate rider’s readiness against specific test requirements | Call 1 \+ rider profile \+ horse profile \+ recent debriefs (4–6 weeks) \+ self-assessments | JSON: { readiness\_score, strengths\_for\_test: \[\], gaps\_for\_test: \[\], horse\_readiness: {}, risk\_areas: \[\] } |
| Call 3: Preparation Plan Generation | Create personalized preparation plan | Calls 1–2 \+ event date \+ rider schedule \+ learning style \+ stress response patterns from self-assessment | JSON: { timeline: \[{ week, focus, exercises, goals }\], mental\_prep: {}, logistics: {}, warm\_up\_plan: {} } |
| Call 4: Show-Day Guidance | Generate show-day timeline and strategy | Calls 1–3 \+ event details \+ rider’s Grand Prix Thinking Layer 1 practices (for continuity) | JSON: { day\_timeline: \[\], warm\_up\_strategy: {}, between\_rides: {}, recovery\_routine: {}, post\_event\_debrief\_questions: \[\] } |

# **10\. Dressage Test Database Verification**

| *The dressage test database is the factual backbone of Layer 2 and the Event Planner. Its accuracy is non-negotiable.* |
| :---- |

**10.1 Verification Protocol**

| Step | Method | What Is Checked | Action on Failure |
| :---- | :---- | :---- | :---- |
| 1: Structural Validation | Automated schema check | All required fields populated: name, level, year, movements\[\], coefficients, collective marks | Flag; exclude from rider-facing outputs |
| 2: Internal Consistency | Claude API call | Movement sequences logical for level; coefficients sum correctly; arena markers valid; gaits match level | Flag with specifics; queue for manual review |
| 3: Cross-Level Progression | Claude API call | Movements at each level are appropriate progressions from prior level | Flag progression breaks |
| 4: Version Currency | Web search \+ manual verify | Tests match current USEF/USDF published versions | Flag outdated; mark last verified date |
| 5: Spot-Check | Compare against official test sheets | Random sample of 3–5 tests fully compared movement-by-movement | Any discrepancy triggers full level re-verification |

**10.2 Confidence Levels**

| Level | Meaning | Usage |
| :---- | :---- | :---- |
| Verified | Passed all 5 steps; matched against official sheet | Full use in Event Planner and Layer 2 |
| Validated | Passed Steps 1–3 but not spot-checked | General reference; Event Planner shows advisory note |
| Unverified | Imported but not validated | Excluded from rider-facing outputs |
| Flagged | Failed one or more steps | Excluded; queued for correction |

**10.3 Verification API Calls**

| API Call | Purpose | Input Context | Output |
| :---- | :---- | :---- | :---- |
| Verification Call 1 | Internal consistency check per test | Full test record for each test at a given level | JSON: { test\_name, issues: \[\], status, coefficient\_sum\_check, marker\_validity } |
| Verification Call 2 | Cross-level progression audit | All tests organized by level, movement taxonomy | JSON: { progression\_map: {}, anomalies: \[\], missing\_progressions: \[\] } |
| Verification Call 3 | Currency check via web search | Database version info \+ web search results | JSON: { current\_year\_tests, is\_current, changes\_needed: \[\] } |

# **11\. Input Form Changes Required — Delta Analysis**

| This section compares what the existing forms currently capture against what each output needs, identifying only the genuine gaps — not re-specifying fields that already exist. |
| :---- |

**11.1 Post-Ride Debrief Form — Additions Needed**

| New Field | Type | Priority | Why Needed |
| :---- | :---- | :---- | :---- |
| Exercises/movements worked on | Multi-select from level-appropriate list \+ free text | P0 | Required for Layer 2 movement progression maps, Data Viz focus distribution, Event Planner readiness assessment. Currently only captured in narrative workFocus field — needs structured data. |
| Confidence level this ride | Scale 1–10 | P1 | Enables Confidence Trajectory visualization and feeds Empathetic Coach voice with quantitative trend data. Currently only mental state (categorical). |
| Energy/effort level (rider \+ horse) | Two scales 1–10 | P2 | Enables training load tracking and pattern analysis (e.g., low-energy rides correlate with X). Nice-to-have. |

**11.2 Weekly Reflection Form — Additions Needed**

| New Field | Type | Priority | Why Needed |
| :---- | :---- | :---- | :---- |
| Confidence trend this week | Dropdown: lower / same / higher | P1 | Quick signal for Empathetic Coach and confidence visualizations without requiring detailed narrative |
| Questions for your AI coaches | Free text | P1 | Allows rider to directly guide coaching output — addressed in the weekly multi-voice analysis |

**11.3 Rider Profile Form — Additions Needed**

| New Field | Type | Priority | Why Needed |
| :---- | :---- | :---- | :---- |
| Competition history | Structured: levels shown, recent scores | P1 | Feeds Event Planner (experience calibration) and Layer 2 (current level evidence) |
| Available training time per week | Dropdown (hours) | P1 | Practical Strategist voice and Event Planner timeline pacing |
| Learning style preference | Multi-select (visual, verbal, kinesthetic, reading) | P2 | Shapes all narrative outputs — how coaching is delivered, not what is delivered |
| Long-term dressage goals (explicit) | Free text | P1 | Currently implicit in profile. Making it explicit improves Layer 2 path personalization and goal tracking. |

**11.4 Forms That Already Have What’s Needed**

| *The following fields were listed as “needed” in v1.0 but ALREADY EXIST in the current forms. No changes required.* |
| :---- |

| Field from v1.0 | Already Exists In | Current Field Name(s) |
| :---- | :---- | :---- |
| Physical considerations | Physical Self-Assessment | physicalChallenges, physicalStrengths, asymmetries |
| Fitness level / activity | Physical Self-Assessment | physicalStrengths (partial — captures athletic background) |
| Fear/confidence factors | Rider Self-Assessment | losingWhen, losingFeelings, lostWhen, lostFeelings (captures the full spectrum) |
| Self-assessment dimensions (Position, Aids, Feel, Knowledge, Mental Game, Horse Management) | NOT a direct match — see note | The existing qualitative assessments capture this information narratively, not as 1–10 scales. See Section 3.4 for the recommendation. |

**11.5 New Forms Required**

| Form | Status | Priority | Notes |
| :---- | :---- | :---- | :---- |
| Event Planner Request | event-preparation-form.html exists | Verify completeness | Review against Section 9 requirements; ensure searchable test dropdown links to verified database |
| Rider Self-Assessment | rider-self-assessment.html exists | No new form needed | Current form is comprehensive. Consider P2 addition of 6-dimension quantitative supplement (Section 3.4). |
| Physical Self-Assessment | physical-self-assessment.html exists | No new form needed | Current form covers all Physical Guidance and Grand Prix Thinking needs. |

**11.6 Updated Priority Summary**

| Priority | Changes | Rationale |
| :---- | :---- | :---- |
| P0 | Structured exercises/movements field on Debrief form | Gates Layer 2 movement mapping and Event Planner readiness — the only true blocker |
| P1 | Confidence scale on Debrief; Competition history \+ Training time \+ Goals on Profile; Confidence trend \+ Questions for coaches on Reflection | Improve output quality materially but outputs can function without them |
| P2 | Energy/effort scales on Debrief; Learning style on Profile; 6-dimension quantitative supplement on Self-Assessment | Nice-to-have enhancements that improve visualizations and coaching calibration |

# **12\. API Call Summary & Architecture**

**12.1 Total API Calls Per Output**

| Output | API Calls | Model | Trigger |
| :---- | :---- | :---- | :---- |
| Journey Map | 3 | Sonnet | Weekly (reflection) \+ on-demand |
| Multi-Voice Coaching | 4 | Sonnet | Weekly (reflection) \+ on-demand per voice |
| Data Visualizations | 3 | Sonnet | Weekly (with coaching report) |
| Grand Prix Thinking Layer 1 | 1 (+ pre-processing) | Sonnet | Data threshold (5+ debriefs) or 30 days |
| Grand Prix Thinking Layer 2 | 4 | Opus (2) \+ Sonnet (2) | Milestones: onboarding, Week 4, Week 8 |
| Physical Guidance | 2 | Sonnet | Bi-weekly \+ on self-assessment submission |
| Event Planner | 4 | Sonnet | On-demand (event form submission) |
| Self-Assessment Analysis | 3 | Sonnet | On self-assessment submission |
| Test DB Verification | 3 | Sonnet \+ web search | Initial, annual, on-demand |

**12.2 Weekly Recurring API Budget**

The weekly coaching report (Journey Map \+ Multi-Voice \+ Data Visualizations) totals 10 API calls per rider per week. Grand Prix Thinking Layer 1, Physical Guidance, and Self-Assessment Analysis are triggered by data thresholds and milestones, not weekly. Layer 2 is generated only at major milestones (approximately 3 times per program). Event Planner is on-demand.

**12.3 Cost Management**

* **Pre-processing:** All raw data is aggregated server-side before any API call. This is the single most impactful cost reduction — sending computed summaries instead of raw journal entries cuts input tokens by 60–80%.

* **Caching:** Grand Prix Thinking dashboards and Layer 2 roadmaps are cached in Firebase and only regenerated on data thresholds.

* **Model Selection:** Only Grand Prix Thinking Layer 2 (Calls 1–2) uses Opus. Everything else uses Sonnet.

* **Batch Processing:** Weekly reports for all riders are generated in batch during a scheduled window.

# **13\. Implementation Priorities**

**Phase 1: Core Outputs (Weeks 1–2)**

* Debrief form: add structured exercises/movements field (P0)

* Dressage test database: full verification (Steps 1–5)

* Pre-processing layer: implement prepareGrandPrixData() and equivalent functions for other outputs

* Grand Prix Thinking Layer 1: implement per Personalization Spec pipeline

* Journey Map: all 3 API calls

* Multi-Voice Coaching: all 4 voices

**Phase 2: Full Output Suite (Weeks 3–4)**

* Data Visualizations: API calls \+ client-side rendering

* Grand Prix Thinking Layer 2: all 4 API calls with Opus \+ test database integration

* Unified GPT dashboard UI (Layer 1 default \+ Layer 2 tab)

* Event Planner: all 4 API calls with test database integration

* Physical Guidance: both API calls

**Phase 3: Polish & Automation (Weeks 5–6)**

* Weekly report generation automation (batch processing)

* Self-Assessment Analysis with longitudinal comparison

* Error handling, retry logic, partial output delivery

* P1 form field additions (Profile, Reflection)

* Staleness detection \+ regeneration prompts

* Report delivery format (PDF/email/web dashboard)

| YDJ Platform Summary Total Outputs: 7 (with Grand Prix Thinking as a 2-layer system) Total Unique API Call Patterns: 27 \+ pre-processing Weekly Per-Rider API Calls (recurring): \~10 Existing Forms Verified: 5 (Rider Profile, Horse Profile, Debrief, Reflections, Self-Assessments) P0 Form Changes: 1 (structured exercises field on Debrief) New Forms Required: 0 (all forms already exist) |
| :---: |

