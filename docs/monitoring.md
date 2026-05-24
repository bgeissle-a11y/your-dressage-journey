# Monitoring & Alerting

GCP-side monitoring for Your Dressage Journey. Covers launch remediation items
**B18** (Cloud Function error-rate alerting) and the Firestore + Functions
portion of **B22** (spend alerts). Anthropic and Stripe spend live in their
own provider dashboards and are out of scope here.

Everything below is provisioned by [`scripts/setup-monitoring.sh`](../scripts/setup-monitoring.sh).
The script is idempotent — re-run it any time to update thresholds, add a
function to the watch list, or recover from a deleted resource.

---

## What's monitored

| # | Resource | What it does | Threshold |
|---|---|---|---|
| 1 | Notification channel (email) | Routes every alert below to the founder | — |
| 2 | Log-based metric `ydj_cloud_function_errors` | Counts ERROR-severity logs from the monitored function list | — |
| 3 | Alert: **YDJ Cloud Function Error Rate** | Fires on elevated function errors | > 5 ERROR logs / 15 min |
| 4 | Alert: **YDJ Stripe Webhook Failures** | Fires on any ERROR-severity log from `stripeWebhook` | > 0 ERROR logs / 5 min |
| 5 | Budget: **YDJ Cloud Functions Spend** | Monthly spend cap on Functions | $100/mo, 50/80/100% notifications |
| 6 | Budget: **YDJ Firestore Spend** | Monthly spend cap on Firestore | $50/mo, 50/80/100% notifications |

### Why these specific thresholds

- **5 ERROR logs / 15 min.** The spec asked for "> 5% error rate." A strict
  ratio (errors / invocations) requires PromQL or MQL plumbing that's brittle
  to embed in a shell script. For our pilot traffic volume (~50–200
  invocations / 15 min) a count threshold of 5 is operationally equivalent —
  high enough to ignore the occasional Anthropic timeout, low enough to catch
  a real regression within one alignment window. Tune with
  `ERROR_COUNT_THRESHOLD` if the volume shifts.
- **$100/mo on Functions.** Covers a full pilot cohort plus the projected
  Week-1 paid sign-ups. Going above is either real growth (good — raise the
  budget) or a runaway invocation loop (bad — investigate).
- **$50/mo on Firestore.** Read-heavy aggregation queries are the most
  expensive part of Firestore. A bug that double-reads on every render
  shows up here long before the Functions budget moves.
- **ERROR-log filter (not `status!=ok`) for Stripe webhook failures.**
  An earlier version of the alert counted any non-2xx execution of
  `stripeWebhook`. That filter also tagged the handler's deliberate 405
  to non-POST requests as a failure, which made the alert fire every
  time the sibling UptimeRobot reachability monitor probed the endpoint
  (see the UptimeRobot section below — that monitor explicitly treats
  HTTP/405 as UP, so it polls with a non-POST on purpose). Switching to
  an ERROR-log filter means the alert only fires when the handler itself
  logs an error: signature verification failure, dispatcher crash on a
  real event, or a Firestore failure on the dedup ledger. The 405 path
  is silent and no longer trips the alert.
- **5-minute window for Stripe webhook failures.** Stripe retries on its
  own schedule, but subscription state can drift if our endpoint is
  persistently broken. A short window catches a regression fast; we
  accept a noisy page during real Stripe transient blips because the
  cost of missing a real failure (coupon swap not applied, customer
  charged twice) is much higher.

---

## Running the script

The script itself is bash (heredocs + arrays) — PowerShell cannot execute it
directly. On the founder's Windows laptop, invoke it via Git Bash. The
commands below are single-line on purpose so they paste cleanly into
PowerShell (a backslash-continued bash form errors with `bash: command not
found` on Windows).

### One-time setup

Put `gcloud` on the session PATH and authenticate. The gcloud SDK installer
on Windows places `gcloud.cmd` under `%LOCALAPPDATA%\Google\Cloud SDK\...`
but does not always add it to PATH for new shells:

```
$env:PATH = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin;$env:PATH"
```

Then, once per shell session (skip if already authenticated for this
project):

```
gcloud components install alpha
```

```
gcloud auth login
```

```
gcloud config set project your-dressage-journey
```

### Run it

```
$env:FOUNDER_EMAIL = "bgeissle@gmail.com"; $env:GCP_BILLING_ACCOUNT_ID = "0180A1-DC2C8B-13A0C2"; & "C:\Program Files\Git\bin\bash.exe" scripts/setup-monitoring.sh
```

Substitute a different email / billing account if the destinations ever
change. To find the billing account ID without leaving the shell:

```
gcloud billing projects describe your-dressage-journey --format="value(billingAccountName)"
```

That prints `billingAccounts/<id>` — copy the part after the slash.

The script prints `[create]`, `[update]`, or `[skip]` for each resource and a
summary at the end with links to the relevant console pages. It is safe to
re-run any number of times — existing resources are matched by display name.

PowerShell will surface gcloud's stdout as a `NativeCommandError` because
gcloud writes some status lines to stderr even on success. The actual
`[create]` / `[update]` lines that follow each one are authoritative — if
those appear, the resource updated cleanly.

### Required gcloud components

| Component | Used for | Install |
|---|---|---|
| `alpha` | `gcloud alpha monitoring channels/policies` | `gcloud components install alpha` |
| (none) | `gcloud billing budgets`, `gcloud logging metrics` | already in main |

If your `gcloud` install is older than mid-2023, `gcloud billing budgets`
may live under `gcloud beta` — swap the prefix in `setup-monitoring.sh` and
file a follow-up to upgrade gcloud.

---

## Extending it

### Add a new function to the error-rate alert

Edit the `FUNCTIONS_LIST` array near the top of
[`scripts/setup-monitoring.sh`](../scripts/setup-monitoring.sh) and append the
exported function name (the name in `functions/index.js`, exactly as written).
Then re-run the script. The log-based metric filter regenerates and the
existing alert policy is updated in place.

### Change a threshold

Edit one of these constants in `scripts/setup-monitoring.sh` (or pass as an
env var override) and re-run:

| Constant / env var | Default | Controls |
|---|---|---|
| `ERROR_COUNT_THRESHOLD` | 5 | ERROR logs that trigger the function alert |
| `ERROR_WINDOW_SECONDS` | 900 | Rolling window for the function alert |
| `WEBHOOK_WINDOW_SECONDS` | 300 | Rolling window for the Stripe alert |
| `FUNCTIONS_BUDGET_USD` | 100 | Monthly Cloud Functions budget |
| `FIRESTORE_BUDGET_USD` | 50 | Monthly Firestore budget |

### Add a new alert policy

Follow the pattern at Steps 3 and 4 of the script: write a heredoc YAML
policy to `$TMPDIR_LOCAL`, look up an existing policy by display name, and
call `gcloud alpha monitoring policies create` or `... update` accordingly.
Always attach `$CHANNEL_NAME` to `notificationChannels` so the new alert
routes to the same email destination.

### Switch the notification destination

Change `FOUNDER_EMAIL` and re-run. The script will detect that the
channel already exists by display name; if you also need to change the
underlying email address, delete the channel manually in the console first
or rename `CHANNEL_DISPLAY_NAME`. (We deliberately match by display name so
re-runs don't pile up duplicate channels.)

---

## What to do when an alert fires

### "YDJ Cloud Function Error Rate"

1. **Open Cloud Function logs** in the console, filtered by
   `severity=ERROR` over the last hour. Group by `function_name` to spot
   which function is spiking. Direct link:
   `https://console.cloud.google.com/logs/query?project=your-dressage-journey`
2. **Check Anthropic status** at https://status.anthropic.com — most pilot-era
   error spikes have been upstream API issues, not our code.
3. **Check recent deploys.** `git log --since="2 hours ago"` against
   `functions/` plus `firebase functions:log --only <fn>` for the named
   function. A deploy in the last hour is the prime suspect.
4. **If it's a real regression**, roll back with
   `firebase deploy --only functions:<name>` from the prior commit
   (matches `feedback_firebase_function_export_names.md`: the export name
   must be exact).
5. **If it's an Anthropic outage**, the affected outputs already write
   stale-cache fallbacks (B4 + Multi-Voice partial-failure handling). No
   immediate user action required — wait it out and consider posting a
   status note if it stretches past 30 min.

### "YDJ Stripe Webhook Failures"

1. **List failed events from the Firestore ledger** — this is the
   fastest way to enumerate which deliveries actually failed:
   ```
   node scripts/inspectFailedWebhookEvents.cjs
   ```
   Defaults to the last 24h; pass `--hours 72` to widen the window.
   Anything reported under `status=processing` is a delivery the handler
   picked up but crashed mid-dispatch.
2. **If step 1 reports zero failed docs**, the failure is in the
   pre-ledger code path — most likely signature verification (400) or a
   dedup-ledger read error. Open the Stripe dashboard → Developers →
   Webhooks → the deployed endpoint → "Recent deliveries". The response
   body our handler returns is `Webhook Error: <message>` on 400 and
   `{"error":"Webhook handler failed"}` on 500.
3. **Verify the endpoint URL** matches the deployed Cloud Function. If
   we've redeployed under a new function URL, Stripe will be hitting a
   404 forever — re-point it.
4. **Check `stripeWebhook` Cloud Function logs.** A 400 typically means
   signature verification failed (env var rotation? wrong webhook
   secret?). A 500 means our handler crashed — look for the exception.
5. **Don't manually replay events** unless you're certain idempotency
   (B15) is doing its job. The Firestore `stripeWebhookEvents` collection
   should already have a doc for each processed event ID; check before
   replaying.
6. **If signature verification is broken**, rotate the webhook secret in
   Stripe → Webhooks → endpoint → Signing secret, set the new value with
   `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`, and redeploy.

#### Note on the metric switch (2026-05-18)

This alert used to fire on `execution_count` with `status!="ok"`, which
also tripped on the handler's deliberate 405 to non-POST requests —
i.e. it would page every time the sibling UptimeRobot reachability
monitor probed the endpoint. It's been switched to an ERROR-log filter
scoped to `stripeWebhook` so only real handler failures fire it. If you
revert the change in [`scripts/setup-monitoring.sh`](../scripts/setup-monitoring.sh),
the UptimeRobot false-positives come back.

### Budget alert at 50%

Informational. Log the date and current spend trajectory. No action.

### Budget alert at 80%

1. **Pull the per-user usage breakdown.** Check `usageLogs` for any single
   user accounting for a disproportionate share — a stuck retry loop or
   a runaway scheduled job will show up as one user generating 10x the
   median call volume.
2. **Decide: real growth or runaway?**
   - Real growth → raise the budget cap by re-running the script with
     a higher `FUNCTIONS_BUDGET_USD` / `FIRESTORE_BUDGET_USD`. Note in
     `LAUNCH_CHECKLIST_JUNE_1.md` that traffic exceeded the launch
     projection.
   - Runaway loop → identify the offending function (most likely
     `weeklyFocusRefresh` or `showPlannerBiweeklyContent` per the
     known fan-out risk), kill the scheduled trigger temporarily with
     `gcloud scheduler jobs pause`, fix, redeploy.

### Budget alert at 100%

Same as 80% but escalated: GCP will *not* auto-shut-off services at
100% (this is a notification only, not a hard cap), so a real overrun
keeps incurring charges. The 100% threshold pages the founder email
directly. Address the same day.

---

## Stripe webhook idempotency markers

The `stripeWebhookEvents` collection accumulates one doc per webhook
delivery (see B15 in [`LAUNCH_FINAL_REMEDIATION_LIST.md`](../LAUNCH_FINAL_REMEDIATION_LIST.md)).
Successful deliveries write an `expiresAt` Firestore Timestamp 90 days
out — well past Stripe's max retry window — so the collection can be
aged out by a Firestore TTL policy rather than growing forever.

Enable the TTL policy once after first deploy. Single line on purpose
— PowerShell uses backtick (`` ` ``) for line continuation, not `\`, so
a multi-line bash form will break on the founder's Windows shell.

```
gcloud firestore fields ttls update expiresAt --collection-group=stripeWebhookEvents --enable-ttl --project=your-dressage-journey
```

Subsequent runs are no-ops. Verify with:

```
gcloud firestore fields ttls list --project=your-dressage-journey
```

Docs left in `status: "processing"` (a delivery that crashed
mid-handler) have no `expiresAt` and are intentionally retained for
debugging. If they accumulate, they're a signal that webhook handlers
are crashing — investigate before deleting.

---

## Stripe past-due lapse job

Closes the loop on `invoice.payment_failed`. When the webhook handler
flips a user to `subscriptionStatus = "past_due"`, it stamps
`pastDueSince`. The scheduled job downgrades anyone who's been past_due
longer than `PAST_DUE_GRACE_DAYS` (default 14) — without this, a user
with a failed card sits in `past_due` forever with full paid access.

| Detail | Value |
|---|---|
| Function export | `stripeLapseJob` |
| Schedule | Daily at 04:00 America/New_York |
| Source | [`functions/api/stripeLapseJob.js`](../functions/api/stripeLapseJob.js) |
| Wired in | [`functions/index.js`](../functions/index.js) |
| Env knob | `PAST_DUE_GRACE_DAYS` (default 14) |
| Stripe side effects | None — Firestore writes only. Stripe's own retry exhaustion handles real cancellation. |

### Fields written

For a user that crosses the grace window:

- `subscriptionStatus` → `"none"`
- `subscriptionTier` → `"none"`
- `pastDueSince` → deleted (`FieldValue.delete()`)
- `lapsedAt` → ISO timestamp
- `lapseReason` → `"past_due_expiry"`

If the user is an active IC member (`isInitialCenterline === true && icStatus === "active"`):
- `icStatus` → `"lapsed"`
- `icLapseReason` → `"past_due_expiry"`
- `icLapsedAt` → ISO timestamp

If the user has `pilotDiscountActive === true`:
- `pilotDiscountActive` → `false`
- `pilotDiscountLapsedAt` → ISO timestamp
- `pilotDiscountLapseReason` → `"past_due_expiry"`

Users with `subscriptionStatus = "past_due"` but no `pastDueSince` get
backfilled to "now" on the next fire (one-time recovery for any
pre-existing past_due users from before this job shipped).

### Tuning the grace window

The 14-day default matches the Stripe smart-retry window. To change it
without a redeploy, set a Secret Manager value:

```
printf "21" | firebase functions:secrets:set PAST_DUE_GRACE_DAYS --data-file=-
```

Use `printf` not `echo` to avoid the trailing newline (see
[`feedback_secret_manager_no_newline`](#) in the founder's memory).

### Manually trigger for a stuck user

Two options:

1. **One-shot the whole job** via Cloud Scheduler:

   ```
   gcloud scheduler jobs run firebase-schedule-stripeLapseJob-us-central1 --location=us-central1 --project=your-dressage-journey
   ```

   That processes every past_due user — fine when the lapse window has
   already passed and you just want it to converge.

2. **Force a single user through it locally** via the Functions Emulator:

   ```
   $env:PAST_DUE_GRACE_DAYS = "0"; cd functions; firebase emulators:start --only functions
   ```

   Then invoke `stripeLapseJob` from the Emulator UI. Grace 0 makes
   every past_due user immediately eligible. Reset the env after.

### What to check when it runs

Logs include a one-line summary:

```
[stripeLapseJob] done — scanned=12 lapsed=2 backfilled=0
  skipped_within_grace=10 ic_lapsed=1 pilot_lapsed=0 failed=0 elapsed_ms=412
```

A non-zero `failed` count means individual user updates threw. The
job swallows per-user failures so one bad doc doesn't abort the run;
look up the offending UID in the log lines above the summary. A
sustained non-zero `failed` is the signal — add it to the Cloud
Function error alert's watch list if it becomes a pattern.

---

## Show Planner bi-weekly cron

Fires at 06:00 ET on the 1st and 15th of each month (~14-day cadence). For
every active show plan with `showDateStart` in the next 90 days, runs one
Sonnet call grounded in the rider's cached Multi-Voice précis and appends a
check-in to the plan's `biweeklyContent` array.

| Detail | Value |
|---|---|
| Scheduled export | `showPlannerBiweeklyContent` |
| Manual callable | `runShowPlannerBiweekly` (admin-only) |
| Schedule | `0 6 1,15 * *` America/New_York |
| Source | [`functions/api/showPlannerBiweeklyContent.js`](../functions/api/showPlannerBiweeklyContent.js) |
| Wired in | [`functions/index.js`](../functions/index.js) |
| Feature flag | `SHOW_PLANNER_BIWEEKLY_ENABLED` (Secret Manager) — default `false` |
| Spend caps | `BIWEEKLY_MAX_PLANS_PER_FIRE` (500), `BIWEEKLY_MAX_USD_PER_FIRE` (50) |
| Per-plan cost estimate | `BIWEEKLY_ESTIMATED_USD_PER_PLAN` (0.05) |

### Dedup (B10)

`processPlan` strips `generatedAt` from each existing `biweeklyContent`
entry to its UTC date and skips the plan if any entry matches today's UTC
date — so a same-day admin re-trigger doesn't double-write. The
`_utcDateOnly` helper accepts ISO strings, Firestore Timestamp objects
(`{_seconds, _nanoseconds}`), and `.toDate()`-shaped wrappers; new writes
always use ISO, but legacy data is tolerated. Log signal:

```
[biweekly] <uid> plan <planId> already has a biweeklyContent entry for <YYYY-MM-DD> — skipping duplicate
```

### Spend cap (B11)

Both caps are checked at the top of each plan iteration inside `_runFire`.
When either cap fires, remaining plans are skipped, `tally.aborted` is set
to `"plan_count_cap"` or `"usd_cost_cap"`, and a Sentry warning event
fires. Log signals:

```
[biweekly] Aborting fire: plan-count cap reached (500/500). N plans unprocessed.
[biweekly] Aborting fire: estimated cost cap reached ($50.00/$50). N plans unprocessed.
[biweekly] done — generated=X skipped=Y error=Z aborted=plan_count_cap
```

The plan-count cap binds first under defaults (500 × $0.05 = $25, well
under the $50 USD ceiling). If real per-plan cost drifts above ~$0.10,
update `BIWEEKLY_ESTIMATED_USD_PER_PLAN` so the USD math stays calibrated:

```
printf "0.07" | firebase functions:secrets:set BIWEEKLY_ESTIMATED_USD_PER_PLAN --data-file=-
```

### Reading run outcomes

Scheduled fires only log the summary line. Admin-triggered fires return
the full tally to the caller (including `planIds: [{id, outcome}, ...]`),
which is the fastest way to spot which plans got `"skipped:no-precis"`
vs `"skipped:duplicate"` vs `"generated"`. Outcome strings: `generated`,
`skipped:no-precis`, `skipped:no-access`, `skipped:duplicate`, `error`.

### What to check when Sentry pages on `aborted`

1. **Confirm the abort kind** in the Sentry event — `plan_count_cap` is
   usually growth (more active plans than expected); `usd_cost_cap`
   suggests per-plan cost has crept up.
2. **Pull the prior-fire summary** from Cloud Function logs to see the
   trend (number of active plans, generated count, skipped count).
3. **For a `usd_cost_cap` abort**, cross-check `usageLogs` for the
   `context=show-planner-biweekly` rows over the last 30 days — if the
   median cost has actually drifted, bump `BIWEEKLY_ESTIMATED_USD_PER_PLAN`
   first, then consider raising `BIWEEKLY_MAX_USD_PER_FIRE`.
4. **For a `plan_count_cap` abort**, the unprocessed plans roll into the
   next fire — no data loss, just a 14-day delay for the tail. Raise the
   cap if growth is real (e.g., 500 → 1000) and re-deploy.

---

## Multi-Voice Coaching diagnostics

Two signals that the partial-failure handling in `getMultiVoiceCoaching` is
behaving — both surface in Cloud Function logs, neither pages on its own.

### Stale-voice fallback (B4)

When a single voice in the 4-call fan-out rejects but the rider has a stale
cache row (≤90 days old) for that voice, the handler now surfaces the stale
content instead of an error card. The diagnostic signal is the pairing of:

- `[coaching] Voice N failed: <reason>` — voice N's generation threw.
- Followed by a successful return that carries `_meta.stale: true` and
  `_meta.failedThisRun: true` on the affected voice. `failedThisRun` is
  telemetry-only (the frontend doesn't render it) — its purpose is to let
  log searches distinguish "stale because of B4 fallback" from "stale
  because of normal SWR refresh in progress."

A burst of `Voice N failed` lines without matching stale-serve evidence
means we are pumping out error placeholders to riders; investigate the
underlying generation error (usually Anthropic upstream).

### Précis lock contention (B5)

The bulk-path précis generation now acquires the `coaching_precis` lock
before spending Claude tokens, matching the trailing single-voice path.
When the lock is already held:

- `[coaching] Précis lock held — skipping bulk-path précis generation (another path will handle it)`

Frequent appearances are expected — the frontend fires single-voice
fan-outs in parallel and the last to finish runs the précis, so a
near-simultaneous bulk refresh would naturally see the lock held.

Investigation threshold: **back-to-back appearances for the same uid in
<5s.** That pattern points to either a stuck precis lock (lock TTL is
10 min; check `generationLocks/{uid}_coaching_precis` in Firestore if
suspicious) or a client-side double-fire. Single hits per uid per refresh
are normal.

---

## Per-user daily Claude call cap (H4)

Per-user daily Claude call cap is tier-aware
([functions/lib/tierBudgets.js](../functions/lib/tierBudgets.js) →
`getDailyCallLimit`):

| Tier | Daily limit | Notes |
|---|---|---|
| Working | 30 | ≈1 full Insights refresh |
| Medium | 60 | ≈3 full Insights refreshes |
| Extended | 100 | Power users + show-planner step-through |
| pilot / pilot-grace | 100 | Maps to Extended during pilot window |
| none / null / unknown | 30 | Backstop |

Overridable per-tier via env (`TIER_WORKING_DAILY_CALL_LIMIT`,
`TIER_MEDIUM_DAILY_CALL_LIMIT`, `TIER_EXTENDED_DAILY_CALL_LIMIT`,
`DEFAULT_DAILY_CALL_LIMIT`) without a code change. Counter is stored
on `usageBudgets/{uid}` with a YYYY-MM-DD date key and resets at UTC
midnight.

When exceeded, `claudeCall.js` throws an error with
`code: "rate-limit-exceeded"` and `capExceeded: { kind: "daily", limit, tier }`.
Log signature: `[<context>] ⛔ Daily API limit (<N>) exceeded for user <uid> (tier=<tier>)`.
Investigation threshold: **>5 distinct uids hitting the cap in a single day**
suggests either a runaway client retry loop or an underestimated tier cap —
inspect Cloud Functions logs for the pattern, then either raise the env
override or chase the misbehaving client.

---

## UptimeRobot monitors
- YDJ — Frontend                  (HTTP/200)
- YDJ — Functions health          (Keyword "ok")
- YDJ — Stripe webhook reachable  (HTTP/405 treated as UP)
Alert contact: bgeissle@gmail.com
Public status page: https://stats.uptimerobot.com/KQ3YWozmK4
Last verified: 2026-05-18

---

## Show Planner quota enforcement (B7)

Medium tier is capped at 10 show plans per rolling 12-month window per [YDJ_Pricing_Tiers_Stripe_Reference.md](../YDJ_Pricing_Tiers_Stripe_Reference.md). Extended and Pilot are unlimited. Working can't generate plans at all (capability gate rejects earlier).

### Where the counter lives

Two fields on each `users/{uid}` document:

- `showPlansCreatedThisYear` — integer, incremented on first AI generation of each plan
- `showPlanYearWindowStart` — ISO timestamp, when the current 12-month window opened

Both are seeded by `functions/api/stripe.js:816-817` on every subscription create/update. The actual enforcement and increment live in [`functions/lib/showPlanQuota.js`](../functions/lib/showPlanQuota.js).

### Idempotency marker on plan docs

Each `showPreparations/{planId}` doc gets `aiGenerationStartedAt: <ISO>` written by `markPlanGenerationStarted` the first time EP-1 successfully completes. The marker doubles as the regeneration bypass — if a plan already has the field set, `enforceShowPlanQuota` returns silently regardless of cap status, so a user at 10/10 can still regenerate work they've already paid for.

### Quirk: tier change resets the counter

`functions/api/stripe.js` unconditionally seeds `showPlansCreatedThisYear: 0` and `showPlanYearWindowStart: now` on every subscription webhook update — so a Medium → Medium plan-switch (e.g. monthly→annual) resets the quota. This is **pre-existing behavior** not introduced by B7, but it is exploitable. If you see a user generating >10 plans in a year, check `stripeWebhookEvents` for a recent subscription update event. Fixing this requires making the seed conditional (only on initial sub creation) — out of scope for launch.

### Spot-check a user's usage

```
gcloud firestore documents read "projects/your-dressage-journey/databases/(default)/documents/users/<uid>" \
  --format=json | jq '{used: .fields.showPlansCreatedThisYear, windowStart: .fields.showPlanYearWindowStart}'
```

Or via the Firebase Console: `users/<uid>` → look at `showPlansCreatedThisYear` and `showPlanYearWindowStart`.

### Adjust the cap without a redeploy

Set the `SHOW_PLAN_ANNUAL_CAP_MEDIUM` env var (integer or `"unlimited"`) on the `getEventPlanner` function. Default is 10. Extended and Pilot ignore the override.

```
firebase functions:secrets:set SHOW_PLAN_ANNUAL_CAP_MEDIUM
# then redeploy the single function
firebase deploy --only functions:getEventPlanner
```

### Rejection telemetry

When a user is over cap, `enforceShowPlanQuota` throws `HttpsError("resource-exhausted", ...)` with `details.code === "show_plan_quota_exceeded"`. The frontend (`ShowPlanner.jsx`) catches the code, surfaces the message, and shows an Upgrade-to-Extended link. The error is logged via the normal Cloud Function error path — if you see B18's error-rate alert fire and the breakdown is heavy on `getEventPlanner`, check for legitimate quota rejections first before assuming a bug.

---

## Event Planner movement validation (B30)

EP-3 (Preparation Plan) post-generation validation catches the LLM-fabrication failure mode where a card text references `"Movement 10"` at PSG when the actual test data lists only movements 1–9. Implementation in [`functions/api/eventPlanner.js`](../functions/api/eventPlanner.js): `extractReferencedMovementNumbers` + `validateEP3Movements`, with a one-retry loop inside the EP-3 step.

### Log lines you'll see

- `[eventPlanner] EP-3 movement validation failed (attempt 1): referenced invalid movement numbers [10]; valid set is [1, 2, 3, 4, 5, 6, 7]` — first attempt hallucinated; retry kicked off with the valid set injected into the system prompt. **Expected occasionally**; no action needed.
- `[eventPlanner] EP-3 validation exhausted retries for <uid> <planId>. Serving plan with invalid movement numbers [...].` — both attempts failed; rider receives the plan anyway (movement numbers are cosmetic, not safety-critical). **Investigate only if rate climbs above ~5% of EP-3 calls** — that would suggest the level-specific test data in `comprehensive_dressage_test_database.json` is missing movement numbers EP-1 expected to find.

### Why we don't validate EP-2

EP-2 (Readiness Analysis) freely cites movement *types* ("your collected canter," "the half-pass") without numbers, so a number-extraction validator produces too many false positives. The hallucination pattern that triggered the audit was concentrated in EP-3 prep-card text, which is what riders see on the page.

---

## readInflightLock client-side silencing (H14)

The frontend's `readInflightLock` in [`src/services/weeklyFocusService.js`](../src/services/weeklyFocusService.js) reads `generationLocks/{uid}_{outputType}` to detect that a regeneration started in another tab/session is still in flight. The Firestore rule at `firestore.rules:258-262` grants the owner read access (`lockId.split('_')[0] == request.auth.uid`).

As of 2026-05-24, the client-side error handler silently swallows `permission-denied` errors. This is the expected race condition during logout/auth-state transitions (client still has a stale uid in scope but the token is revoked); the function returns `null` and the calling panel renders normally. Other errors log at `warn` (not `error`) so real Firestore outages stay visible without tripping B18's error-rate alert.

### When to investigate

If `Missing or insufficient permissions` reappears in Cloud Function logs or browser consoles for `readInflightLock`, it almost certainly means the `generationLocks/{lockId}` rule was rolled back. Verify the live ruleset matches `firestore.rules:258-262`, then redeploy with:

```
firebase deploy --only firestore:rules
```

If the rule is correct and the error persists, look for a client bug constructing a malformed `lockId` (the format is `{uid}_{outputType}` — Firebase Auth UIDs have no underscores).

### When to *not* investigate

A `[weeklyFocusService] readInflightLock(<output>) error:` line at `warn` severity is the new normal for any non-permission-denied failure. It will NOT trigger B18's alert. Investigate only if the same uid appears multiple times in a short window — that suggests a Firestore-side issue, not a client race.

---

## Cycle extension graceful degradation (H7)

`physicalGuidance.js` and `grandPrixThinking.js` both have a cycle-extension branch that runs when a non-top-tier rider triggers `forceRefresh:true` on an expired cycle with fewer than 5 new debriefs. The branch calls `shouldExtendCycle` (which queries the debriefs collection) then `getStaleCache` and `getCycleState` to assemble the cached response.

As of 2026-05-24, that branch is wrapped in `try/catch` ([`physicalGuidance.js:165-195`](../functions/api/physicalGuidance.js#L165-L195), [`grandPrixThinking.js:300-335`](../functions/api/grandPrixThinking.js#L300-L335)). On failure the handler logs a warning and falls through to fresh generation, so the rider never sees a hard failure from a sub-feature that's only a cost optimization.

### Log lines you'll see

- `[physical] Cycle-extension flow failed for <uid>: <msg> — falling through to fresh generation`
- `[gpt-l1] Cycle-extension flow failed for <uid>: <msg> — falling through to fresh generation`

### When to investigate

One-off appearances are operationally acceptable — the fresh-generation path that follows has its own lock, cache, and error handling, and the cost overhead is ≤$0.10/case. **Investigate only if the same uid appears >3 times in 7 days.** That pattern suggests a corrupted `analysis/grandPrixThinkingCycle/{uid}` or `analysis/physicalGuidanceCycle/{uid}` doc — inspect the doc in Firestore and either repair the `cycleStartDate` field manually or delete the doc to force a fresh first-generation cycle.

---

## Anthropic API key rotation log

| Date | Action | Key (first / last 4) | Notes |
|---|---|---|---|
| 2026-05-18 | Created `ydj-production-2026-06-01` | (current production key — see Anthropic console) | Pre-launch rotation per B20. |
| 2026-05-18 | **Disabled** prior key | (record first/last 4 from password manager) | **TODO: delete on or after 2026-06-08** once a week of clean launch operation confirms nothing was relying on it. Disabled (not deleted) so it can be re-enabled if a forgotten consumer surfaces. |

**Next scheduled rotation:** ~2026-11-18 (6-month cadence). Add a calendar reminder.

---

## Cross-references

- [`LAUNCH_FINAL_REMEDIATION_LIST.md`](../LAUNCH_FINAL_REMEDIATION_LIST.md) — B18, B22 line items
- [`LAUNCH_CHECKLIST_JUNE_1.md`](../LAUNCH_CHECKLIST_JUNE_1.md) — pre-launch verification
- [`functions/index.js`](../functions/index.js) — authoritative list of function exports
- [`scripts/configureBillingPortal.cjs`](../scripts/configureBillingPortal.cjs) — sibling shell-level ops tool (Stripe portal lockdown)
