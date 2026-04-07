# YDJ Debrief — Quick Ratings Improvements
## Implementation Brief
### April 2026

**Target file:** `src/components/Debrief/DebriefForm.jsx`  
**Scope:** Quick Ratings section only — no prompt changes, no Firestore schema changes, no other files.

---

## Summary of Changes

| # | Field | Change |
|---|-------|--------|
| 1 | Overall Ride Quality | Make required; add 5-point range labels |
| 2 | Confidence Level | Null-initialize (touched pattern); add 5-point range labels |
| 3 | Rider Effort / Horse Effort sliders | Null-initialize (touched pattern); no label changes |

---

## Change 1 — Overall Ride Quality: Required + Range Labels

### 1a. Add validation

In `validateForm()`, after the existing `rideArc` check, add:

```js
if (!overallQualityTouched) newErrors.overallQuality = 'Please rate your overall ride quality.';
```

### 1b. Wire error to FormField

**Find:**
```jsx
<FormField label={`Overall Ride Quality: ${formData.overallQuality}/10`} optional>
```

**Replace with:**
```jsx
<FormField label={overallQualityTouched ? `Overall Ride Quality: ${formData.overallQuality}/10` : 'Overall Ride Quality'} error={errors.overallQuality}>
```

Note: `optional` prop removed (field is now required). The numeric display only appears once the rider has touched the slider — consistent with the existing `overallQualityTouched` pattern.

### 1c. Replace end-anchors with 5-point range labels

**Find:**
```jsx
<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#7A7A7A' }}>
  <span>Challenging/Frustrating</span><span>Excellent/Breakthrough</span>
</div>
```
_(This is the anchor row immediately below the overallQuality range input.)_

**Replace with:**
```jsx
<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#7A7A7A', marginTop: '0.4rem', lineHeight: '1.3' }}>
  <span style={{ width: '18%', textAlign: 'left' }}>1–2<br/>Survival mode</span>
  <span style={{ width: '18%', textAlign: 'center' }}>3–4<br/>Below where I want to be</span>
  <span style={{ width: '18%', textAlign: 'center' }}>5–6<br/>Solid working session</span>
  <span style={{ width: '18%', textAlign: 'center' }}>7–8<br/>Better than typical</span>
  <span style={{ width: '18%', textAlign: 'right' }}>9–10<br/>Breakthrough quality</span>
</div>
```

---

## Change 2 — Confidence Level: Null-Initialize + Range Labels

### 2a. Add touched state

In the component body, alongside `overallQualityTouched`, add:

```js
const [confidenceTouched, setConfidenceTouched] = useState(false);
```

### 2b. Update initial form state

**Find:**
```js
confidenceLevel: 5,
```

**Replace with:**
```js
confidenceLevel: null,
```

### 2c. Update `loadExisting` to set touched state when a saved value exists

**Find** (in `loadExisting`, inside `if (result.success)`):
```js
if (d.overallQuality != null) setOverallQualityTouched(true);
```

**Replace with:**
```js
if (d.overallQuality != null) setOverallQualityTouched(true);
if (d.confidenceLevel != null) setConfidenceTouched(true);
```

Also update the `confidenceLevel` line in the `setFormData` call within `loadExisting`:

**Find:**
```js
confidenceLevel: d.confidenceLevel || 5,
```

**Replace with:**
```js
confidenceLevel: d.confidenceLevel ?? null,
```

### 2d. Update save data

**Find** (in `handleSubmit`, inside the `data` object):
```js
confidenceLevel: formData.confidenceLevel,
```

**Replace with:**
```js
confidenceLevel: confidenceTouched ? formData.confidenceLevel : null,
```

### 2e. Update FormField label and anchor row

**Find:**
```jsx
<FormField label={`Confidence in Your Ability to Execute: ${formData.confidenceLevel}/10`} optional helpText="Your in-session sense of whether you could perform the technical work you were attempting — distinct from how good the ride felt overall.">
```

**Replace with:**
```jsx
<FormField label={confidenceTouched ? `Confidence in Your Ability to Execute: ${formData.confidenceLevel}/10` : 'Confidence in Your Ability to Execute'} optional helpText="Your in-session sense of whether you could perform the technical work you were attempting — distinct from how good the ride felt overall.">
```

### 2f. Update the range input to handle null state

**Find:**
```jsx
<input
  type="range"
  name="confidenceLevel"
  min="1"
  max="10"
  value={formData.confidenceLevel}
  onChange={e => setFormData(prev => ({ ...prev, confidenceLevel: parseInt(e.target.value, 10) }))}
  disabled={loading}
  style={{ width: '100%', accentColor: '#8B7355' }}
/>
```

**Replace with:**
```jsx
<input
  type="range"
  name="confidenceLevel"
  min="1"
  max="10"
  value={formData.confidenceLevel ?? 5}
  onChange={e => {
    setConfidenceTouched(true);
    setFormData(prev => ({ ...prev, confidenceLevel: parseInt(e.target.value, 10) }));
  }}
  disabled={loading}
  style={{ width: '100%', accentColor: '#8B7355' }}
/>
```

### 2g. Replace end-anchors with 5-point range labels

**Find:**
```jsx
<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#7A7A7A' }}>
  <span>Hesitant / unsure</span><span>Clear and committed</span>
</div>
```
_(This is the anchor row immediately below the confidenceLevel range input.)_

**Replace with:**
```jsx
<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#7A7A7A', marginTop: '0.4rem', lineHeight: '1.3' }}>
  <span style={{ width: '18%', textAlign: 'left' }}>1–2<br/>Guessing / uncertain</span>
  <span style={{ width: '18%', textAlign: 'center' }}>3–4<br/>Doubting</span>
  <span style={{ width: '18%', textAlign: 'center' }}>5–6<br/>Reasonably clear</span>
  <span style={{ width: '18%', textAlign: 'center' }}>7–8<br/>Mostly clear</span>
  <span style={{ width: '18%', textAlign: 'right' }}>9–10<br/>Committed and present</span>
</div>
```

---

## Change 3 — Rider Effort / Horse Effort Sliders: Null-Initialize

The "Energy/Effort Level" combined field contains two 1–10 sliders (`riderEffort`, `horseEffort`). These default to 5 and always write a value to Firestore even when the rider doesn't engage with them. Apply the same touched pattern.

### 3a. Add touched state

```js
const [riderEffortTouched, setRiderEffortTouched] = useState(false);
const [horseEffortTouched, setHorseEffortTouched] = useState(false);
```

### 3b. Update initial form state

**Find:**
```js
riderEffort: 5,
horseEffort: 5,
```

**Replace with:**
```js
riderEffort: null,
horseEffort: null,
```

### 3c. Update `loadExisting`

In the `setFormData` call within `loadExisting`:

**Find:**
```js
confidenceLevel: d.confidenceLevel ?? null,
riderEffort: d.riderEffort || 5,
horseEffort: d.horseEffort || 5,
```

**Replace with:**
```js
confidenceLevel: d.confidenceLevel ?? null,
riderEffort: d.riderEffort ?? null,
horseEffort: d.horseEffort ?? null,
```

After the `setFormData` call (alongside the other touched-state setters):

```js
if (d.riderEffort != null) setRiderEffortTouched(true);
if (d.horseEffort != null) setHorseEffortTouched(true);
```

### 3d. Update save data

**Find:**
```js
riderEffort: formData.riderEffort,
horseEffort: formData.horseEffort,
```

**Replace with:**
```js
riderEffort: riderEffortTouched ? formData.riderEffort : null,
horseEffort: horseEffortTouched ? formData.horseEffort : null,
```

### 3e. Update Rider Effort slider label and input

**Find:**
```jsx
<label style={{ fontSize: '0.92rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
  Rider Effort: {formData.riderEffort}/10
</label>
<input
  type="range"
  name="riderEffort"
  min="1"
  max="10"
  value={formData.riderEffort}
  onChange={e => setFormData(prev => ({ ...prev, riderEffort: parseInt(e.target.value, 10) }))}
  disabled={loading}
  style={{ width: '100%', accentColor: '#8B7355' }}
/>
```

**Replace with:**
```jsx
<label style={{ fontSize: '0.92rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
  {riderEffortTouched ? `Rider Effort: ${formData.riderEffort}/10` : 'Rider Effort'}
</label>
<input
  type="range"
  name="riderEffort"
  min="1"
  max="10"
  value={formData.riderEffort ?? 5}
  onChange={e => {
    setRiderEffortTouched(true);
    setFormData(prev => ({ ...prev, riderEffort: parseInt(e.target.value, 10) }));
  }}
  disabled={loading}
  style={{ width: '100%', accentColor: '#8B7355' }}
/>
```

### 3f. Update Horse Effort slider label and input

**Find:**
```jsx
<label style={{ fontSize: '0.92rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
  Horse Effort: {formData.horseEffort}/10
</label>
<input
  type="range"
  name="horseEffort"
  min="1"
  max="10"
  value={formData.horseEffort}
  onChange={e => setFormData(prev => ({ ...prev, horseEffort: parseInt(e.target.value, 10) }))}
  disabled={loading}
  style={{ width: '100%', accentColor: '#8B7355' }}
/>
```

**Replace with:**
```jsx
<label style={{ fontSize: '0.92rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
  {horseEffortTouched ? `Horse Effort: ${formData.horseEffort}/10` : 'Horse Effort'}
</label>
<input
  type="range"
  name="horseEffort"
  min="1"
  max="10"
  value={formData.horseEffort ?? 5}
  onChange={e => {
    setHorseEffortTouched(true);
    setFormData(prev => ({ ...prev, horseEffort: parseInt(e.target.value, 10) }));
  }}
  disabled={loading}
  style={{ width: '100%', accentColor: '#8B7355' }}
/>
```

---

## Promptbuilder Note

No `promptBuilder.js` changes are required. The AI already receives null values for optional fields gracefully via the Data Integrity Guardrail block. Verify that the `confidenceLevel`, `riderEffort`, and `horseEffort` fields in the prompt assembly branch correctly on null (treat as "not reported") rather than treating null as a meaningful score. If any of these fields currently have a fallback like `|| 5` in the prompt assembly, remove it.

---

## Checklist

- [ ] `overallQualityTouched` path: error shown if not touched on submit
- [ ] Overall Ride Quality `optional` prop removed; `error={errors.overallQuality}` added
- [ ] Overall Ride Quality 5-point range labels render correctly across slider width
- [ ] `confidenceTouched` state added and wired
- [ ] Confidence slider saves `null` when untouched; loads touched state from existing debriefs
- [ ] Confidence 5-point range labels render correctly
- [ ] `riderEffortTouched` / `horseEffortTouched` state added and wired
- [ ] Effort sliders save `null` when untouched; loads touched state from existing debriefs
- [ ] Numeric label on all three sliders hidden until touched
- [ ] All sliders render visually at midpoint (value `?? 5`) regardless of null state
- [ ] No regressions on load/edit path for existing debriefs with saved values
- [ ] No regressions on Save as Draft (draft can save null values for optional fields)

## Out of Scope

- Radio button energy fields (`riderEnergy`, `horseEnergy`) — already null-initialized (empty string), no change needed
- Mental/emotional state — no change
- Narrative fields — no change
- Prompt changes — no change
- Firestore schema — null is already a valid field value; no index changes needed
