# Chunked Output UX Patterns

Reusable patterns for displaying AI-generated coaching outputs in YDJ. Use these when building new output panels (Event Plan, Physical Guidelines, etc.).

---

## Core Components

### 1. Always-Visible Summary Card

Every AI output should have a compact summary that's **always visible** (never collapsible). This gives riders an at-a-glance view before diving into details.

**Pattern:**
```jsx
<div className="[panel]-at-a-glance">
  <h2>Title at a Glance</h2>
  <div className="[panel]-at-a-glance__stats">
    {/* 3-4 stat boxes in a responsive grid */}
    <div className="[panel]-at-a-glance__stat">
      <span className="[panel]-at-a-glance__stat-value">{value}</span>
      <span className="[panel]-at-a-glance__stat-label">Label</span>
    </div>
  </div>
  {/* Optional: highlighted focus/priority line */}
  <div className="[panel]-at-a-glance__focus">
    <h3>Current Focus</h3>
    <p>{focusText}</p>
  </div>
</div>
```

**Examples in codebase:**
- Journey Map: milestones count, themes count, key events, trajectory + current focus
- Coaching: Quick Insights card (top patterns, priority, celebration)

### 2. Collapsible Sections

Use `CollapsibleSection` for all detail sections. Choose `defaultOpen` based on importance.

```jsx
import CollapsibleSection from './CollapsibleSection';

{/* High-priority sections: default open */}
<CollapsibleSection title="Key Findings" icon="&#x1F50D;" defaultOpen>
  <SectionContent />
</CollapsibleSection>

{/* Lower-priority / long sections: default closed */}
<CollapsibleSection title="Full Analysis" icon="&#x1F4D6;">
  <LongNarrativeContent />
</CollapsibleSection>
```

**Props:** `title`, `icon` (HTML entity), `defaultOpen` (boolean), `className`, `children`

**Guidelines:**
- Most important 1-2 sections: `defaultOpen`
- Longest narrative sections: default closed
- Use semantic icons (HTML entities, not emoji literals)

### 3. Tab Interfaces

Use tabs when showing **multiple perspectives or layers** on the same data.

**Two-level pattern:**
```
[Primary Tabs]  ← Switches between data layers (e.g., Mental | Trajectory)
  [Content]     ← Each tab has its own fetch/cache/loading state
```

**Voice/perspective tabs:**
```
[Tab Bar]       ← One tab per voice/perspective
  [Content]     ← Active tab shows full content inline
```

**Key implementation details:**
- Each tab manages its own `data`, `loading`, `error` state
- Secondary tabs lazy-load on first click (don't fetch all layers on mount)
- Tab state: `const [activeTab, setActiveTab] = useState('default')`

**Examples:**
- Grand Prix: `activeLayer` switches between mental/trajectory
- Coaching: `activeVoice` switches between 4 coaching perspectives

### 4. Priority / Action Box

A highlighted single-action callout, always visible within its parent section.

```jsx
<div className="[panel]__priority">
  <h3>Your Priority This Week</h3>
  <p>{actionText}</p>
</div>
```

**CSS pattern:** warm background (`#FFF8F0`), left border accent (`#D4A574`), slightly larger font.

### 5. Lazy Loading

For secondary tabs/layers that most users won't view immediately:

```jsx
const [secondaryData, setSecondaryData] = useState(null);
const [secondaryLoading, setSecondaryLoading] = useState(false);

useEffect(() => {
  if (activeTab === 'secondary' && !secondaryData && !secondaryLoading) {
    fetchSecondary();
  }
}, [activeTab, secondaryData, secondaryLoading]);
```

### 6. Staleness Banner

When showing cached data that may be outdated:

```jsx
{data?.fromCache && (
  <div className="[panel]-staleness-banner">
    Your dashboard reflects your data as of {formattedDate}.
    {' '}Click "Regenerate" to update with your latest rides and reflections.
  </div>
)}
```

---

## Cloud Function Output Schema Template

Every new AI output should follow this 3-layer structure:

```
Layer 1: Summary (short, always shown)
Layer 2: Detail sections (collapsible, loaded with main call)
Layer 3: Optional secondary layer (lazy-loaded on tab switch)
```

### Cache Strategy
- Each layer gets its own cache key: `{outputType}` and `{outputType}_{layer}`
- Cache includes `dataSnapshotHash` for staleness detection
- `maxAgeDays: 30` default, invalidated when hash changes
- `forceRefresh` parameter bypasses cache

### Response Shape
```json
{
  "success": true,
  "summary": { /* always-visible quick stats */ },
  "sections": [ /* collapsible detail sections */ ],
  "fromCache": false,
  "generatedAt": "ISO string",
  "tier": { "label": "Developing", "level": 2 },
  "dataTier": 2,
  "dataSnapshot": { "hash": "md5...", "counts": {} }
}
```

---

## Example Schemas for Future Outputs

### Event Preparation Plan

**Cloud Function:** `getEventPlan`
**Cache key:** `eventPlan_{eventId}`

```json
{
  "success": true,
  "summary": {
    "event_name": "Spring Schooling Show",
    "event_date": "2026-03-15",
    "readiness_score": 7,
    "top_priority": "Focus on centerline straightness in Training Level Test 2",
    "days_until": 28
  },
  "sections": [
    {
      "id": "preparation_timeline",
      "title": "Preparation Timeline",
      "icon": "&#x1F4C5;",
      "defaultOpen": true,
      "content": {
        "weeks": [
          {
            "week": 1,
            "focus": "...",
            "rides": ["..."],
            "mental_prep": "..."
          }
        ]
      }
    },
    {
      "id": "test_strategy",
      "title": "Test Strategy",
      "icon": "&#x1F3AF;",
      "defaultOpen": true,
      "content": {
        "movements": [
          { "movement": "Free walk", "strategy": "...", "common_issue": "..." }
        ]
      }
    },
    {
      "id": "horse_management",
      "title": "Horse Management Plan",
      "icon": "&#x1F434;",
      "defaultOpen": false,
      "content": { "travel_plan": "...", "warmup_routine": "...", "cooling_plan": "..." }
    },
    {
      "id": "mental_game",
      "title": "Mental Game Plan",
      "icon": "&#x1F9E0;",
      "defaultOpen": false,
      "content": { "visualization": "...", "coping_strategies": ["..."], "focus_cues": ["..."] }
    },
    {
      "id": "logistics",
      "title": "Logistics Checklist",
      "icon": "&#x2705;",
      "defaultOpen": false,
      "content": { "packing_list": ["..."], "day_of_schedule": "..." }
    },
    {
      "id": "coach_perspectives",
      "title": "Coach Perspectives",
      "icon": "&#x1F4AC;",
      "defaultOpen": false,
      "content": [
        { "voice": "Classical Master", "note": "..." },
        { "voice": "Practical Strategist", "note": "..." }
      ]
    }
  ]
}
```

**Panel structure:**
- Summary card: event name, date, days until, readiness score, top priority
- 6 collapsible sections (first 2 default open)
- No secondary layer needed

### Physical Guidelines

**Cloud Function:** `getPhysicalGuidelines`
**Cache key:** `physicalGuidelines`

```json
{
  "success": true,
  "summary": {
    "primary_focus_area": "Core stability and hip mobility",
    "sessions_per_week": 3,
    "estimated_duration": "20-30 min each",
    "key_insight": "Your tension patterns suggest focusing on releasing hip flexors before rides"
  },
  "sections": [
    {
      "id": "body_awareness",
      "title": "Body Awareness Assessment",
      "icon": "&#x1F9D8;",
      "defaultOpen": true,
      "content": {
        "tension_areas": ["left hip", "right shoulder"],
        "mobility_notes": "...",
        "strength_baseline": "..."
      }
    },
    {
      "id": "pre_ride_routine",
      "title": "Pre-Ride Routine",
      "icon": "&#x1F3CB;",
      "defaultOpen": true,
      "content": {
        "duration": "10 minutes",
        "exercises": [
          { "name": "Hip circles", "reps": "10 each direction", "purpose": "...", "cue": "..." }
        ]
      }
    },
    {
      "id": "post_ride_routine",
      "title": "Post-Ride Recovery",
      "icon": "&#x1F6C1;",
      "defaultOpen": false,
      "content": {
        "duration": "10 minutes",
        "exercises": [
          { "name": "Quad stretch", "hold": "30 seconds each side", "purpose": "..." }
        ]
      }
    },
    {
      "id": "weekly_program",
      "title": "Off-Horse Weekly Program",
      "icon": "&#x1F4AA;",
      "defaultOpen": false,
      "content": {
        "schedule": [
          { "day": "Monday", "focus": "Core + balance", "exercises": ["..."] }
        ]
      }
    },
    {
      "id": "progression",
      "title": "Progression Plan",
      "icon": "&#x1F4C8;",
      "defaultOpen": false,
      "content": {
        "month_1": "...",
        "month_2": "...",
        "month_3": "..."
      }
    }
  ]
}
```

**Panel structure:**
- Summary card: focus area, sessions/week, duration, key insight
- 5 collapsible sections (first 2 default open)
- Could add secondary "Advanced" layer via tabs if needed later

---

## CSS Naming Conventions

Follow BEM-like naming scoped to each panel:

```
.[panel-name]                     → panel container
.[panel-name]__header             → title + actions row
.[panel-name]-at-a-glance         → summary card
.[panel-name]-at-a-glance__stat   → individual stat box
.[panel-name]-at-a-glance__focus  → highlighted focus line
```

Shared classes (already in `Insights.css`):
- `.collapsible-section`, `.collapsible-header`, `.collapsible-content`
- `.panel-loading-spinner`, `.spinner`
- `.panel-error`, `.btn-retry`
- `.panel-insufficient`, `.panel-insufficient__checklist`
- `.btn-refresh`, `.panel-timestamp`
- `.gpt-coach-perspective` (reusable for any voice callout)
