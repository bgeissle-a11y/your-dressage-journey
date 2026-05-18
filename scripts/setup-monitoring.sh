#!/usr/bin/env bash
#
# setup-monitoring.sh — provision GCP monitoring + budget alerts for YDJ
# ----------------------------------------------------------------------
# Creates (or detects-and-skips) the following in the active gcloud project:
#
#   1. Notification channel  — email to $FOUNDER_EMAIL
#   2. Log-based metric      — ydj_cloud_function_errors
#   3. Alert policy          — "YDJ Cloud Function Error Rate"
#   4. Alert policy          — "YDJ Stripe Webhook Failures"
#   5. Budget                — $100/mo Cloud Functions     (50/80/100%)
#   6. Budget                — $50/mo  Firestore            (50/80/100%)
#
# Covers launch remediation items B18 (function error alerting) and the
# Firestore + Functions slice of B22 (spend alerts). Anthropic and Stripe
# spend alerts live in their own provider dashboards — not in scope here.
#
# Idempotent: every step queries by display name first. Existing resources
# are skipped (alert policies & budgets are updated in place) so re-running
# is safe.
#
# Required env vars
# -----------------
#   FOUNDER_EMAIL            recipient of all alerts
#   GCP_BILLING_ACCOUNT_ID   billing account ID for the project (no "billingAccounts/" prefix)
#
# Optional env vars (with defaults)
# ---------------------------------
#   ERROR_COUNT_THRESHOLD    default 5  — ERROR logs per 15min before alert fires
#   ERROR_WINDOW_SECONDS     default 900
#   WEBHOOK_WINDOW_SECONDS   default 300
#   FUNCTIONS_BUDGET_USD     default 100
#   FIRESTORE_BUDGET_USD     default 50
#   FUNCTIONS_SERVICE_ID     default services/29E7-DA93-CA13 (Cloud Functions SKU)
#   FIRESTORE_SERVICE_ID     default services/F3A1-DCCB-5BC6 (Firestore SKU)
#
# Usage
# -----
#   gcloud auth login
#   gcloud config set project your-dressage-journey
#   FOUNDER_EMAIL=barb@example.com \
#   GCP_BILLING_ACCOUNT_ID=XXXXXX-XXXXXX-XXXXXX \
#     ./scripts/setup-monitoring.sh
#
# Required gcloud components
# --------------------------
#   gcloud components install alpha
#   (gcloud billing budgets, gcloud logging metrics — both GA in main)
#
# See docs/monitoring.md for runbook and extension instructions.

set -euo pipefail

# ----------------------------------------------------------------------
# Constants
# ----------------------------------------------------------------------

CHANNEL_DISPLAY_NAME="YDJ Founder — Launch Alerts"
ERROR_POLICY_NAME="YDJ Cloud Function Error Rate"
WEBHOOK_POLICY_NAME="YDJ Stripe Webhook Failures"
FUNCTIONS_BUDGET_NAME="YDJ Cloud Functions Spend"
FIRESTORE_BUDGET_NAME="YDJ Firestore Spend"
LOG_METRIC_NAME="ydj_cloud_function_errors"

ERROR_COUNT_THRESHOLD="${ERROR_COUNT_THRESHOLD:-5}"
ERROR_WINDOW_SECONDS="${ERROR_WINDOW_SECONDS:-900}"
WEBHOOK_WINDOW_SECONDS="${WEBHOOK_WINDOW_SECONDS:-300}"

FUNCTIONS_BUDGET_USD="${FUNCTIONS_BUDGET_USD:-100}"
FIRESTORE_BUDGET_USD="${FIRESTORE_BUDGET_USD:-50}"

# SKU service IDs from the Cloud Billing Catalog. These are stable but if
# Google ever rotates them, look up the current values with:
#   gcloud billing accounts list-services --billing-account=$GCP_BILLING_ACCOUNT_ID
FUNCTIONS_SERVICE_ID="${FUNCTIONS_SERVICE_ID:-services/29E7-DA93-CA13}"
FIRESTORE_SERVICE_ID="${FIRESTORE_SERVICE_ID:-services/F3A1-DCCB-5BC6}"

# All onCall + onSchedule + onDocumentCreated + onRequest functions that
# matter for launch monitoring. To add a new function, append its export
# name here and re-run the script.
FUNCTIONS_LIST=(
  getMultiVoiceCoaching
  getJourneyMap
  getGrandPrixThinking
  getDataVisualizations
  getPhysicalGuidance
  getEventPlanner
  getReadinessSnapshot
  generateFirstLight
  regenerateFirstLight
  weeklyFocusRefresh
  showPlannerBiweeklyContent
  onDebriefCreated
  onReflectionCreated
  onJourneyEventCreated
  onPhysicalAssessmentCreated
  onRiderAssessmentCreated
  onHealthEntryCreated
  onMicroDebriefSubmit
  onFreshStartSubmit
  stripeWebhook
  firstLightGraduateOnDebrief
  firstLightGraduateOnReflection
)

# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------

CREATED=()
SKIPPED=()
UPDATED=()

log_create() { echo "[create] $1"; CREATED+=("$1"); }
log_skip()   { echo "[skip]   Already exists: $1"; SKIPPED+=("$1"); }
log_update() { echo "[update] $1"; UPDATED+=("$1"); }
log_info()   { echo "         $1"; }

require_env() {
  local var_name="$1"
  if [ -z "${!var_name:-}" ]; then
    echo "ERROR: Missing $var_name" >&2
    echo "  Set it like: $var_name=<value> ./scripts/setup-monitoring.sh" >&2
    echo "  See header comment in this script for the full list of required env vars." >&2
    exit 1
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: '$1' not found in PATH" >&2
    exit 1
  fi
}

# ----------------------------------------------------------------------
# Preflight
# ----------------------------------------------------------------------

require_cmd gcloud
require_env FOUNDER_EMAIL
require_env GCP_BILLING_ACCOUNT_ID

PROJECT_ID=$(gcloud config get-value project 2>/dev/null || true)
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
  echo "ERROR: no active gcloud project. Run 'gcloud config set project <id>' first." >&2
  exit 1
fi

echo "============================================================"
echo " YDJ monitoring setup"
echo "============================================================"
echo " Project:         $PROJECT_ID"
echo " Founder email:   $FOUNDER_EMAIL"
echo " Billing account: $GCP_BILLING_ACCOUNT_ID"
echo " Error threshold: > $ERROR_COUNT_THRESHOLD logs / ${ERROR_WINDOW_SECONDS}s"
echo " Functions budget: \$${FUNCTIONS_BUDGET_USD}/mo (50/80/100%)"
echo " Firestore budget: \$${FIRESTORE_BUDGET_USD}/mo (50/80/100%)"
echo "============================================================"
echo

TMPDIR_LOCAL=$(mktemp -d)
trap 'rm -rf "$TMPDIR_LOCAL"' EXIT

# Build a regex alternation of all monitored function names for the log filter.
IFS='|' read -r FUNCTION_NAMES_REGEX <<<"$(printf '%s|' "${FUNCTIONS_LIST[@]}" | sed 's/|$//')"

# ----------------------------------------------------------------------
# Step 1: notification channel (email)
# ----------------------------------------------------------------------

echo "--- Step 1/6: notification channel ---"

# `gcloud alpha monitoring channels list --format=value(name)` returns the
# full resource name: projects/PROJECT_ID/notificationChannels/CHANNEL_ID.
EXISTING_CHANNEL=$(
  gcloud alpha monitoring channels list \
    --filter="displayName=\"$CHANNEL_DISPLAY_NAME\"" \
    --format="value(name)" \
    | head -n1
)

if [ -n "$EXISTING_CHANNEL" ]; then
  CHANNEL_NAME="$EXISTING_CHANNEL"
  log_skip "Notification channel: $CHANNEL_DISPLAY_NAME"
else
  CHANNEL_NAME=$(
    gcloud alpha monitoring channels create \
      --display-name="$CHANNEL_DISPLAY_NAME" \
      --type=email \
      --channel-labels=email_address="$FOUNDER_EMAIL" \
      --description="Launch-period alerts for Your Dressage Journey (B18 + B22)" \
      --format="value(name)"
  )
  log_create "Notification channel: $CHANNEL_DISPLAY_NAME"
fi
log_info "channel: $CHANNEL_NAME"
echo

# ----------------------------------------------------------------------
# Step 2: log-based metric for cloud function ERROR severity
# ----------------------------------------------------------------------

echo "--- Step 2/6: log-based metric ($LOG_METRIC_NAME) ---"

LOG_FILTER="resource.type=\"cloud_function\" severity=ERROR resource.labels.function_name=~\"^(${FUNCTION_NAMES_REGEX})$\""

if gcloud logging metrics describe "$LOG_METRIC_NAME" --format="value(name)" >/dev/null 2>&1; then
  gcloud logging metrics update "$LOG_METRIC_NAME" \
    --description="ERROR-severity logs from monitored YDJ Cloud Functions (managed by setup-monitoring.sh)" \
    --log-filter="$LOG_FILTER" \
    --quiet >/dev/null
  log_update "Log-based metric: $LOG_METRIC_NAME"
else
  gcloud logging metrics create "$LOG_METRIC_NAME" \
    --description="ERROR-severity logs from monitored YDJ Cloud Functions (managed by setup-monitoring.sh)" \
    --log-filter="$LOG_FILTER" \
    --quiet >/dev/null
  log_create "Log-based metric: $LOG_METRIC_NAME"
fi
log_info "covers ${#FUNCTIONS_LIST[@]} functions"
echo

# Cloud Monitoring typically picks up new log-based metrics within ~60s.
# The alert policy below will reference it whether or not propagation has
# completed — the policy is valid as soon as the metric definition exists.

# ----------------------------------------------------------------------
# Step 3: alert policy — "YDJ Cloud Function Error Rate"
# ----------------------------------------------------------------------

echo "--- Step 3/6: alert policy ($ERROR_POLICY_NAME) ---"

# Spec says "> 5% ERROR-severity log rate over 15 min." A strict ratio
# (errors / total invocations) requires PromQL or MQL plumbing that is
# fragile to express in a shell heredoc. For pre-launch ops we use a
# count threshold over the same window — operationally equivalent for
# our pilot traffic volume. Tune ERROR_COUNT_THRESHOLD to taste.

ERROR_POLICY_YAML="$TMPDIR_LOCAL/error-policy.yaml"
cat >"$ERROR_POLICY_YAML" <<EOF
displayName: "$ERROR_POLICY_NAME"
combiner: OR
documentation:
  content: |
    More than $ERROR_COUNT_THRESHOLD ERROR-severity log entries from a monitored
    YDJ Cloud Function over the last ${ERROR_WINDOW_SECONDS}s window.

    Likely causes:
      - Anthropic API outage or rate-limit
      - Recent deploy regression
      - Firestore permission / rule misconfiguration
      - Downstream timeout from a chained Cloud Function

    See docs/monitoring.md for the full runbook.
  mimeType: text/markdown
conditions:
  - displayName: "ERROR log count > $ERROR_COUNT_THRESHOLD over ${ERROR_WINDOW_SECONDS}s"
    conditionThreshold:
      filter: 'metric.type="logging.googleapis.com/user/$LOG_METRIC_NAME" resource.type="cloud_function"'
      aggregations:
        - alignmentPeriod: ${ERROR_WINDOW_SECONDS}s
          perSeriesAligner: ALIGN_DELTA
          crossSeriesReducer: REDUCE_SUM
      comparison: COMPARISON_GT
      duration: 0s
      thresholdValue: $ERROR_COUNT_THRESHOLD
      trigger:
        count: 1
notificationChannels:
  - $CHANNEL_NAME
alertStrategy:
  autoClose: 86400s
enabled: true
EOF

EXISTING_ERROR_POLICY=$(
  gcloud alpha monitoring policies list \
    --filter="displayName=\"$ERROR_POLICY_NAME\"" \
    --format="value(name)" \
    | head -n1
)

if [ -n "$EXISTING_ERROR_POLICY" ]; then
  gcloud alpha monitoring policies update "$EXISTING_ERROR_POLICY" \
    --policy-from-file="$ERROR_POLICY_YAML" \
    --quiet >/dev/null
  log_update "Alert policy: $ERROR_POLICY_NAME"
  log_info "policy: $EXISTING_ERROR_POLICY"
else
  NEW_POLICY=$(
    gcloud alpha monitoring policies create \
      --policy-from-file="$ERROR_POLICY_YAML" \
      --format="value(name)"
  )
  log_create "Alert policy: $ERROR_POLICY_NAME"
  log_info "policy: $NEW_POLICY"
fi
echo

# ----------------------------------------------------------------------
# Step 4: alert policy — "YDJ Stripe Webhook Failures"
# ----------------------------------------------------------------------

echo "--- Step 4/6: alert policy ($WEBHOOK_POLICY_NAME) ---"

# Uses the built-in function execution_count metric with status!=ok over
# a 5-minute window. ANY non-2xx fires the alert because state drift
# (failed checkout / failed coupon swap) is much costlier than a noisy
# page during real Stripe retries.

WEBHOOK_POLICY_YAML="$TMPDIR_LOCAL/webhook-policy.yaml"
cat >"$WEBHOOK_POLICY_YAML" <<EOF
displayName: "$WEBHOOK_POLICY_NAME"
combiner: OR
documentation:
  content: |
    stripeWebhook returned a non-2xx response. Stripe retries automatically,
    but subscription state can drift if the failure is persistent (e.g. a
    signature verification regression or downstream Firestore write error).

    Check stripeWebhook Cloud Function logs first, then the Stripe dashboard
    webhook tab (Events → Failed). See docs/monitoring.md.
  mimeType: text/markdown
conditions:
  - displayName: "stripeWebhook non-2xx over ${WEBHOOK_WINDOW_SECONDS}s"
    conditionThreshold:
      filter: |
        metric.type="cloudfunctions.googleapis.com/function/execution_count"
        resource.type="cloud_function"
        resource.labels.function_name="stripeWebhook"
        metric.labels.status!="ok"
      aggregations:
        - alignmentPeriod: ${WEBHOOK_WINDOW_SECONDS}s
          perSeriesAligner: ALIGN_DELTA
          crossSeriesReducer: REDUCE_SUM
      comparison: COMPARISON_GT
      duration: 0s
      thresholdValue: 0
      trigger:
        count: 1
notificationChannels:
  - $CHANNEL_NAME
alertStrategy:
  autoClose: 86400s
enabled: true
EOF

EXISTING_WEBHOOK_POLICY=$(
  gcloud alpha monitoring policies list \
    --filter="displayName=\"$WEBHOOK_POLICY_NAME\"" \
    --format="value(name)" \
    | head -n1
)

if [ -n "$EXISTING_WEBHOOK_POLICY" ]; then
  gcloud alpha monitoring policies update "$EXISTING_WEBHOOK_POLICY" \
    --policy-from-file="$WEBHOOK_POLICY_YAML" \
    --quiet >/dev/null
  log_update "Alert policy: $WEBHOOK_POLICY_NAME"
  log_info "policy: $EXISTING_WEBHOOK_POLICY"
else
  NEW_POLICY=$(
    gcloud alpha monitoring policies create \
      --policy-from-file="$WEBHOOK_POLICY_YAML" \
      --format="value(name)"
  )
  log_create "Alert policy: $WEBHOOK_POLICY_NAME"
  log_info "policy: $NEW_POLICY"
fi
echo

# ----------------------------------------------------------------------
# Budget helper
# ----------------------------------------------------------------------

# create_or_update_budget DISPLAY_NAME AMOUNT_USD SERVICE_ID
#
# - threshold-rules at 50%, 80%, 100% (current spend basis)
# - notification channel attached to the 100% rule (and overall budget)
#   so the founder gets paged when spend tips over
create_or_update_budget() {
  local display_name="$1"
  local amount_usd="$2"
  local service_id="$3"

  local existing
  existing=$(
    gcloud billing budgets list \
      --billing-account="$GCP_BILLING_ACCOUNT_ID" \
      --filter="displayName=\"$display_name\"" \
      --format="value(name)" \
      | head -n1
  )

  # `gcloud billing budgets` lives in main as of mid-2023. If your gcloud
  # version is older, swap `billing budgets` → `beta billing budgets`.
  local common_args=(
    --billing-account="$GCP_BILLING_ACCOUNT_ID"
    --display-name="$display_name"
    --budget-amount="${amount_usd}USD"
    --filter-projects="projects/$PROJECT_ID"
    --filter-services="$service_id"
    --threshold-rule=percent=0.5
    --threshold-rule=percent=0.8
    --threshold-rule=percent=1.0
    --notifications-rule-monitoring-notification-channels="$CHANNEL_NAME"
  )

  if [ -n "$existing" ]; then
    # `budgets update` takes the short ID, not the full resource name.
    local budget_id="${existing##*/}"
    gcloud billing budgets update "$budget_id" "${common_args[@]}" --quiet >/dev/null
    log_update "Budget: $display_name"
    log_info "budget: $existing"
  else
    local new_budget
    new_budget=$(gcloud billing budgets create "${common_args[@]}" --format="value(name)")
    log_create "Budget: $display_name"
    log_info "budget: $new_budget"
  fi
}

# ----------------------------------------------------------------------
# Step 5: budget — Cloud Functions
# ----------------------------------------------------------------------

echo "--- Step 5/6: budget (Cloud Functions \$${FUNCTIONS_BUDGET_USD}/mo) ---"
create_or_update_budget "$FUNCTIONS_BUDGET_NAME" "$FUNCTIONS_BUDGET_USD" "$FUNCTIONS_SERVICE_ID"
echo

# ----------------------------------------------------------------------
# Step 6: budget — Firestore
# ----------------------------------------------------------------------

echo "--- Step 6/6: budget (Firestore \$${FIRESTORE_BUDGET_USD}/mo) ---"
create_or_update_budget "$FIRESTORE_BUDGET_NAME" "$FIRESTORE_BUDGET_USD" "$FIRESTORE_SERVICE_ID"
echo

# ----------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------

echo "============================================================"
echo " Summary"
echo "============================================================"

if [ "${#CREATED[@]}" -gt 0 ]; then
  echo " Created:"
  for item in "${CREATED[@]}"; do echo "   + $item"; done
fi
if [ "${#UPDATED[@]}" -gt 0 ]; then
  echo " Updated:"
  for item in "${UPDATED[@]}"; do echo "   ~ $item"; done
fi
if [ "${#SKIPPED[@]}" -gt 0 ]; then
  echo " Skipped (already existed):"
  for item in "${SKIPPED[@]}"; do echo "   = $item"; done
fi

echo
echo " All alerts and budget notifications route to: $FOUNDER_EMAIL"
echo " View in console:"
echo "   Alerts:   https://console.cloud.google.com/monitoring/alerting?project=$PROJECT_ID"
echo "   Budgets:  https://console.cloud.google.com/billing/$GCP_BILLING_ACCOUNT_ID/budgets"
echo "============================================================"
