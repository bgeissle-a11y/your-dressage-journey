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

## UptimeRobot monitors
- YDJ — Frontend                  (HTTP/200)
- YDJ — Functions health          (Keyword "ok")
- YDJ — Stripe webhook reachable  (HTTP/405 treated as UP)
Alert contact: bgeissle@gmail.com
Public status page: https://stats.uptimerobot.com/KQ3YWozmK4
Last verified: 2026-05-18

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
