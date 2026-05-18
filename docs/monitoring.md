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
| 4 | Alert: **YDJ Stripe Webhook Failures** | Fires on any non-2xx from `stripeWebhook` | > 0 non-ok / 5 min |
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
- **5-minute window for Stripe webhook failures.** Stripe retries on its
  own schedule, but subscription state can drift if our endpoint is
  persistently broken. A short window catches a regression fast; we
  accept a noisy page during real Stripe transient blips because the
  cost of missing a real failure (coupon swap not applied, customer
  charged twice) is much higher.

---

## Running the script

### One-time setup

```bash
gcloud components install alpha    # for: gcloud alpha monitoring ...
gcloud auth login
gcloud config set project your-dressage-journey
```

### Run it

```bash
FOUNDER_EMAIL=barb@example.com \
GCP_BILLING_ACCOUNT_ID=XXXXXX-XXXXXX-XXXXXX \
  ./scripts/setup-monitoring.sh
```

The script prints `[create]`, `[update]`, or `[skip]` for each resource and a
summary at the end with links to the relevant console pages. It is safe to
re-run any number of times — existing resources are matched by display name.

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

1. **Open the Stripe dashboard → Developers → Webhooks** and click the
   endpoint pointed at our deployed `stripeWebhook` URL. The "Recent
   deliveries" tab shows status code and response body for each retry.
2. **Verify the endpoint URL** matches the deployed Cloud Function. If
   we've redeployed under a new function URL, Stripe will be hitting a
   404 forever — re-point it.
3. **Check `stripeWebhook` Cloud Function logs.** A 401 typically means
   signature verification failed (env var rotation? wrong webhook
   secret?). A 500 means our handler crashed — look for the exception.
4. **Don't manually replay events** unless you're certain idempotency
   (B15) is doing its job. The Firestore `stripeWebhookEvents` collection
   should already have a doc for each processed event ID; check before
   replaying.
5. **If signature verification is broken**, rotate the webhook secret in
   Stripe → Webhooks → endpoint → Signing secret, set the new value with
   `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET`, and redeploy.

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

Enable the TTL policy once after first deploy:

```bash
gcloud firestore fields ttls update expiresAt \
  --collection-group=stripeWebhookEvents \
  --enable-ttl \
  --project=your-dressage-journey
```

Subsequent runs are no-ops. Verify with:

```bash
gcloud firestore fields ttls list --project=your-dressage-journey
```

Docs left in `status: "processing"` (a delivery that crashed
mid-handler) have no `expiresAt` and are intentionally retained for
debugging. If they accumulate, they're a signal that webhook handlers
are crashing — investigate before deleting.

---

## Cross-references

- [`LAUNCH_FINAL_REMEDIATION_LIST.md`](../LAUNCH_FINAL_REMEDIATION_LIST.md) — B18, B22 line items
- [`LAUNCH_CHECKLIST_JUNE_1.md`](../LAUNCH_CHECKLIST_JUNE_1.md) — pre-launch verification
- [`functions/index.js`](../functions/index.js) — authoritative list of function exports
- [`scripts/configureBillingPortal.cjs`](../scripts/configureBillingPortal.cjs) — sibling shell-level ops tool (Stripe portal lockdown)
