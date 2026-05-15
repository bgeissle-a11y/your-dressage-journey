# YDJ Consolidated Working Plan — May 12 → July 7, 2026

**Pulled together from:** `LAUNCH_CHECKLIST_JUNE_1.md` · `LAUNCH_FINAL_REMEDIATION_LIST.md` · `YDJ_Marketing_Plan_May-July_2026.docx`

**Locked dates that drive everything below:**
- **May 15** — Pilot ends (pilot-grace begins)
- **June 1** — Paid tiers go live (P1)
- **June 19** — CLD Classic (P2 trial run for NDPC)
- **July 1–5** — NDPC (P2 marquee moment)
- **July 7** — IC cohort closes (lowest priority — unlikely to fill)

---

## Priority Stack (your stated priorities, locked at the top)

**P1 — Website live + payments accepted by June 1.** Stripe live mode, coupons live, webhook idempotency, ToS/Privacy/Refund published, end-to-end dry run clean. Nothing else moves until this is done.

**P2 — Minimal marketing in advance of NDPC, using CLD Classic (June 19) as trial run.** YouTube release cadence, weekly founder post, IC pricing page polished, NDPC vendor table prep, printed + virtual game.

**P3 — New users feel welcome, engaged, excited.** First Light, Quick Start map, Tips & FAQ, welcome video / use recommendations, onboarding email sequence, founder office hours.

**S1 (secondary) — Forms and outputs (especially Weekly Focus) gating, cycling, saving correctly.** Riders need a week+ of data before they see most of this, so it gets attention in weeks 4–7 once new signups start hitting the thresholds.

**S2 (secondary) — Being well-prepared for NDPC as first real showcase.** Slips behind P3 — better to have a working product 50 NDPC visitors love than a polished booth for a buggy product.

**Lowest — IC > 100 cap, and pilot conversion mechanics.** Both ignored unless something breaks. Don't optimize.

---

## How to use this list

- Work the weeks in order. Within a week, do P1 items before P2 before P3 before S1.
- Items tagged **[BLOCKER]** must ship before June 1 or you can't go live.
- Items tagged **[PRIORITY]** are the ones you'd lose sleep over if skipped — protect them.
- Items tagged **[DROP IF NEEDED]** are the first to cut when time runs short.
- File:line references come from the underlying audit; they're there if you want to send a tight prompt to Claude Code.

---

## WEEK 1 — May 12–17 · Critical scaling & ops blockers + pilot email round 1

**Theme:** Stop the silent-failure killers and get Round 1 pilot comms out. ~17 engineering hours.

### P1 — Launch-critical engineering
- [ ] **[BLOCKER]** Stripe live-mode swap — production env keys, run `scripts/configureBillingPortal.cjs --allow-live`, confirm `/admin/stripeConfig.billingPortalConfigId` updates *(2h)*
- [ ] **[BLOCKER]** Create all live-mode coupons (`IC_WORKING_2026`, `IC_MEDIUM_2026`, `IC_EXTENDED_2026`, `PILOT_MONTHLY_10`, `TRIAL_FIRSTYEAR_10`) with matching IDs *(included in swap)*
- [ ] **[BLOCKER]** Anthropic production-tier API key swap + rate-limit sizing for ~10 calls/rider/week × N riders *(0.5h)*
- [ ] **[BLOCKER]** `weeklyFocusRefresh` pagination fix — `auth.listUsers(200)` silently truncates at 200 users (`functions/api/weeklyFocusRefresh.js:133`) *(2h)*
- [ ] **[BLOCKER]** Bump `weeklyFocusRefresh` timeout 120s → 540s (`functions/index.js:228`) *(1h)*
- [ ] **[BLOCKER]** `dataTriggeredRegeneration` recursion depth limit — add `depth` arg, bail at `depth >= 2` (`functions/api/dataTriggeredRegeneration.js:191`) *(1h)*
- [ ] **[BLOCKER]** `refreshWeeklyFocusSnapshotSection` try/catch in `coaching.js:613`, `physicalGuidance.js:328`, `grandPrixThinking.js:413` *(0.5h)*
- [ ] **[BLOCKER]** Stripe webhook event-ID idempotency — `processedStripeEvents/{event.id}` check at top of handler (`functions/api/stripe.js:610–655`) *(2h)*
- [ ] **[PRIORITY]** `lastRegenError` field + banner on all 5 panels (Multi-Voice, Journey Map, GPT, Physical, DataViz) *(4h)*
- [ ] **[PRIORITY]** Cloud Function error-rate alerting — Console alert: ERROR rate > 5% / 15min on all 13 critical handlers, SMS founder *(1h)*
- [ ] **[PRIORITY]** UptimeRobot pings — frontend URL, `/health` endpoint, Stripe webhook URL, SMS alert *(0.5h)*
- [ ] **[PRIORITY]** Firestore + Anthropic + Stripe budget alerts at 50/80/100% *(1h)*
- [ ] Bump frontend timeouts 300s → 540s for JM/GPT/Physical/DataViz (`src/services/aiService.js`) *(0.5h)*
- [ ] `firstLight.graduate` — switch to `count()` aggregation (`functions/api/firstLight.js:484,492`) *(1h)*
- [ ] Tighten `microDebriefs` / `freshStarts` Firestore rules — `empatheticResponse` immutable from client *(1h)*
- [ ] Add React `<ErrorBoundary>` at App root + each Insights tab, wire to Sentry *(part of polish)*

### P2 — Marketing groundwork
- [ ] **[PRIORITY]** Pilot conversion email Round 1 — send by May 13 *(1h)*
- [ ] Block Monday mornings on calendar for next 9 weeks as content production time
- [ ] Pull list of top 10 most-engaged pilot users for personal DMs next week
- [ ] Choose 3 anchor YouTube videos for Week 2, 3, 4 releases; write captions
- [ ] Email NDPC organizers to confirm June 8–15 partnership-post window
- [ ] Open a running notes file for Sunday 5-line weekly updates

### P3 — New-user onboarding polish
- [ ] Read `YDJ_FirstLight_Implementation_Brief_v3.md` and walk First Light end-to-end on a fresh test account — flag any glitches
- [ ] Read `QuickStartMap_Implementation_Brief.md` and walk Quick Start on a fresh account — flag any glitches
- [ ] Inventory the existing Tips & FAQ — list missing launch-week questions to add next week

### S1 — Forms/outputs gating (low touch this week)
- [ ] Spot-check: a brand-new account with no data sees the right empty states on Insights tabs and Dashboard (no broken charts, no "Loading…" forever)

---

## WEEK 2 — May 18–24 · Coaching/show-planner blockers + marketing prep + onboarding polish

**Theme:** Land the AI hardening, finalize marketing assets, and make sure the welcome experience is excellent. ~21 engineering hours + marketing.

### P1 — Launch-critical engineering
- [ ] **[BLOCKER]** Multi-Voice partial-failure stale fallback — per-voice stale cache load before placeholder (`functions/api/coaching.js:549`, `MultiVoicePanel.jsx:436`, `CoachingVoiceCard.jsx:56`) *(3h)*
- [ ] **[BLOCKER]** Précis lock collision fix — wrap précis block in `tryAcquireLock(uid, "coaching_precis")` (`coaching.js:539,603`) *(1h)*
- [ ] **[BLOCKER]** Show Planner copy fix — drop "10 shows/yr" claim from pricing copy *(0.5h; the enforcement counter is post-launch work)*
- [ ] **[BLOCKER]** Event Planner Steps 2–4 — per-step cache, in-flight lock, truncation try/catch (`eventPlanner.js:296–411`) *(4h)*
- [ ] **[BLOCKER]** Bi-weekly cron same-day dedup — check `biweeklyContent` for entry with `generatedAt` within UTC day before `arrayUnion` (`showPlannerBiweeklyContent.js:209`) *(1h)*
- [ ] **[BLOCKER]** Bi-weekly cron global spend cap — track total cost, abort on env ceiling (`showPlannerBiweeklyContent.js:230–247`) *(1h)*
- [ ] **[BLOCKER]** GPT trajectory step 1 resume banner per polish backlog spec *(2h)*
- [ ] **[BLOCKER]** `_countL2OpusThisMonth` date range filter — `where("timestamp", ">=", monthStartIso)` (`grandPrixThinking.js:73`) *(1h)*
- [ ] **[BLOCKER]** Data Viz `maxTokens` → `getMaxTokens()` (`dataVisualizations.js:154,162,178`) *(1.5h)*
- [ ] **[BLOCKER]** 14-day past-due scheduled lapse job — IC + pilot discount forfeit (`stripe.js:969–988`) *(2h)*
- [ ] Multi-Voice backend timeout 120s → 240s OR backend-side per-voice timeout with stale fallback *(1h)*
- [ ] Précis prompt 3-of-4 path — verify `buildMultiVoicePrecisPrompt` handles missing keys (`coaching.js:594`) *(1h)*
- [ ] Tier-aware daily call limits — Working 30 / Medium 60 / Extended 100 (`claudeCall.js:32`) *(1h)*
- [ ] Verify Inter I → Inter II guardrail fires — test rider at Inter I + aggressive goals must NOT get passage/piaffe accelerated *(1h)*
- [ ] Verify rider health stripping — generate Weekly Coach Brief + Journey Map for test rider with `riderHealthEntries`, inspect raw input *(1h)*

### P1 — Legal & support pages (start this week so lawyer review can roll)
- [ ] **[BLOCKER]** Terms of Service drafted & sent for lawyer review — subscription terms, refund policy, data retention, AI disclaimers
- [ ] **[BLOCKER]** Privacy Policy drafted & sent for lawyer review — Firestore, Anthropic (no training/ephemeral), Sentry, GA4, Stripe
- [ ] **[BLOCKER]** Refund policy — annual subs, IC tier-coupon forfeit rule explicit

### P2 — Marketing prep
- [ ] **[PRIORITY]** Landing page copy review — hero, four voices, pricing, FAQ. Does it answer "why is journaling alone expensive record-keeping?"
- [ ] **[PRIORITY]** Pricing page final pass — IC banner, spots-remaining counter, trial CTA, monthly/annual toggle, coupon visibility — all on mobile
- [ ] **[PRIORITY]** Release Week 2 YouTube video (anchor 1) + caption
- [ ] **[PRIORITY]** Personal DMs to top 10 most-engaged pilot users
- [ ] Founder weekly post — "Why I built this" or equivalent

### P3 — New-user onboarding polish
- [ ] **[PRIORITY]** Tips & FAQ — add launch-week-specific entries: "What happens to my pilot data?", "Can I switch tiers?", "What's the IC cohort?", "Refunds?", "How do I get the most out of my first week?"
- [ ] **[PRIORITY]** Welcome video / use recommendations recorded (5–8 min screencast: "Here's what to do in your first 7 days") — keep it founder-voice, no edits
- [ ] **[PRIORITY]** Onboarding email sequence drafted in Resend — welcome → first-step prompt → week-1 check-in → week-2 reflection prompt
- [ ] Walk new-user funnel on real iPhone: signup → onboarding → First Light → Quick Start → first Debrief. Flag every glitch.

### S1 — Forms/outputs
- [ ] Sanity-check: any new debrief, reflection, observation submitted on a fresh test account saves correctly and shows up in the right list page

### Comms
- [ ] **[PRIORITY]** Pilot conversion email Round 2 — send May 19 *(1h)*

---

## WEEK 3 — May 25–31 · Launch week: code freeze, dry run, lockdown

**Theme:** No new features after May 27. Everything funnels into a clean live launch. ~21 hours.

### P1 — Launch-critical engineering
- [ ] **[BLOCKER]** Code freeze May 27 — bug fixes only after this date
- [ ] **[BLOCKER]** `SHOW_PLANNER_BIWEEKLY_ENABLED=true` set in deploy config + verified (`showPlannerBiweeklyContent.js:48`) *(1h)*
- [ ] **[BLOCKER]** End-to-end live-mode dry run — fresh user → onboarding → rider/horse profile → 5 debriefs → AI generation → upgrade to Working → IC upgrade flow → cancel → pilot-grace fallback. Document every issue. *(4h)*
- [ ] **[BLOCKER]** Stripe webhook delivery test — trigger every event type against production endpoint, confirm Firestore updates
- [ ] **[BLOCKER]** Backup pilot Firestore database to GCS bucket — pre-launch snapshot
- [ ] **[BLOCKER]** ToS / Privacy / Refund published live (lawyer review back)
- [ ] **[BLOCKER]** DNS & SSL verification — custom domain → Firebase Hosting, cert valid + not expiring within 60 days, www + apex resolve
- [ ] **[BLOCKER]** Rate-limit/abuse protection — reCAPTCHA Enterprise on signup, password-reset rate-limited, per-user Cloud Function quotas
- [ ] `weeklyFocusRefresh` advance-error logging — surface `lastCycleAdvanceError` (`weeklyFocusRefresh.js:147`) *(0.5h)*
- [ ] Cycle-state extension try/catch — explicit logging in `physicalGuidance.js:165–183` + `grandPrixThinking.js:294–318` *(1h)*
- [ ] **[PRIORITY]** iOS Safari QA pass — full app, all forms, all outputs, checkout flow. Safari has bitten before. *(4h)*
- [ ] Voice input QA — Debrief, Reflection, Observation on iOS + Android *(1.5h)*
- [ ] Verify Firestore composite indexes deployed live — walk full app, watch console for index-required errors
- [ ] Cloud Functions cold-start budget — if GPT/Physical exceed ~10s cold, set `minInstances: 1`
- [ ] Lighthouse ≥85 on mobile for Home / Pricing / Dashboard / Insights
- [ ] **[DROP IF NEEDED]** 3 high-leverage unit tests — `entitlements.js` lifecycle, `stripe.js` `changeSubscriptionPlan` flows, `coaching.js` partial-failure stale fallback *(4h, defer if crunch)*
- [ ] **[DROP IF NEEDED]** GitHub Actions CI — single workflow, build + smoke tests on push to main *(defer if crunch)*

### P1 — Launch comms
- [ ] **[BLOCKER]** Public launch announcement drafted — email to pilots + waitlist + personal network; social posts (LinkedIn, FB groups, dressage forums); founder blog post
- [ ] **[BLOCKER]** Customer support runbook + canned-but-personalized templates for top 10 expected questions; refund flow step-by-step; account deletion flow *(2h)*
- [ ] **[PRIORITY]** Pilot conversion email Round 3 — send May 26 *(1h)*
- [ ] Founder office hours calendar block May 24 → June 14 — communicate in conversion emails

### P2 — Marketing
- [ ] **[PRIORITY]** Release Week 3 YouTube video (anchor 2) + caption
- [ ] Founder weekly post
- [ ] Press/influencer outreach — small personal email list (dressage publications, podcast hosts, USDF figures who beta-tested), not a press release

### P3 — New-user onboarding
- [ ] Final walk-through of First Light + Quick Start + Tips/FAQ + welcome video on a fresh test account — fix any remaining rough edges before freeze

### Pilot lifecycle (lowest, but don't skip)
- [ ] Test pilot-grace state in live app — manually flip a test user, confirm: read access works, create/generate buttons disabled with conversion CTA, no broken pages

---

## WEEK 4 — June 1–7 · LAUNCH + post-launch watch

**Theme:** Be at the keyboard. Watch dashboards. Reply fast. Don't create anything new.

### Launch Day — June 1
- [ ] Morning: final smoke test on production
- [ ] Send launch announcement email at chosen send time (mid-morning founder TZ)
- [ ] Post to social channels
- [ ] Pin "We're live!" in community channels where allowed
- [ ] Watch dashboards live first 4 hours: Sentry / Stripe / Firebase Functions / Anthropic console / UptimeRobot
- [ ] Be at the keyboard. No meetings. No barn.
- [ ] End-of-day status note: signups, conversions, IC count, incidents

### Daily through June 7
- [ ] Signup → first-debrief funnel check (if signups happen but no data entered, onboarding needs work — triage Day 1)
- [ ] Reply to every support email within 24h
- [ ] First "weekly batch" AI generation should fire successfully by ~June 8 — monitor errors + cost
- [ ] Conversion-to-paid check for pilots in grace

### Marketing
- [ ] **[PRIORITY]** Release Week 4 YouTube video (anchor 3) + caption
- [ ] Founder weekly post (launch celebration, what surprised you)
- [ ] Sunday 5-line weekly update in running notes file

### Capture (don't fix yet)
- [ ] Write down every friction point you observe in a single doc. Collect, don't fix. Prioritize next week.

---

## WEEK 5 — June 8–14 · Stabilize, learn, ramp CLD prep

**Theme:** Polish based on real new-user behavior; prep CLD Classic as NDPC dress rehearsal.

### S1 — Forms/outputs (now riders have a week of data, this is real)
- [ ] **[PRIORITY]** Watch Weekly Focus generate on schedule for first cohort hitting Monday snapshot — verify gating, cycle advancement, save behavior
- [ ] Verify each output type fires correctly for at least one real new user: Multi-Voice, Journey Map, Data Visualizations, GPT L1, Physical Guidance
- [ ] Triage top 3 friction points from launch week — fix or defer with a written reason

### P2 — CLD Classic prep (trial run for NDPC)
- [ ] **[PRIORITY]** Pre-stage social posts for CLD Classic (June 19) — what you'll post, when, with what assets
- [ ] **[PRIORITY]** Draft NDPC postcard / handout copy (this gets refined for NDPC; CLD is the test)
- [ ] Confirm any CLD presence — booth? virtual? sponsorship mention? Be honest about what's realistic.
- [ ] Identify one rider at CLD who'd be willing to use the platform that weekend and give you immediate feedback

### P3 — Onboarding refinement
- [ ] Spot-check: are new users completing First Light? Quick Start? Where are they dropping off? (Check funnel.)
- [ ] Tune onboarding email send times based on actual signup-time distribution

### Marketing
- [ ] Release Week 5 YouTube video + caption
- [ ] Founder weekly post — first-week milestone reflections
- [ ] Sunday 5-line update

### IC monitoring (lowest priority — just watch the number)
- [ ] If IC signups < 20 by June 15: send a personal email to every active pilot user with their name + one specific pattern from their data, double next ad spend, host a 1-day "office hours" Live

---

## WEEK 6 — June 15–21 · CLD Classic trial run (June 19)

**Theme:** Use CLD as the controlled rehearsal for NDPC. Capture every operational lesson.

### P2 — CLD Classic execution
- [ ] **[PRIORITY]** Day-of June 19: post live updates per pre-staged plan
- [ ] **[PRIORITY]** After CLD: 1-page debrief — what worked, what failed, what to change for NDPC. This is the most valuable doc in the campaign.
- [ ] Capture any in-person email signups
- [ ] If you had a rider trial the platform at CLD — debrief their experience same day, write it up

### P2 — NDPC ramp
- [ ] **[PRIORITY]** Confirm NDPC vendor table logistics — banner, table cover, business cards, signup tablet/laptop, charger, backup hotspot
- [ ] **[PRIORITY]** Order printed NDPC game (lead time matters — get the order in this week)
- [ ] **[PRIORITY]** Build virtual NDPC game + prize notification flow — test end-to-end
- [ ] Pre-stage daily NDPC story templates (in case booth is quiet, they post anyway)

### S1 — Forms/outputs
- [ ] By now your earliest June 1 signups have ~2 weeks of data — verify their second Weekly Focus generates correctly
- [ ] Verify Physical Guidance + GPT L1 cycle behavior on at least one real user hitting the 30-day or 5-debrief threshold

### Marketing
- [ ] Release Week 6 YouTube video + caption — tie it to CLD/NDPC theme if possible
- [ ] Founder weekly post — CLD reflection, NDPC tease
- [ ] Sunday 5-line update

---

## WEEK 7 — June 22–28 · NDPC final prep

**Theme:** Lock everything for July 1–5. No new features, no new content categories. Polish only.

### P2 — NDPC prep finalization
- [ ] **[PRIORITY]** All NDPC physical materials in hand by June 26
- [ ] **[PRIORITY]** Virtual NDPC game tested by 3 outside people, prize notification flow verified
- [ ] **[PRIORITY]** Pre-write all NDPC week social posts (one per day, July 1–5) — schedule what can be scheduled
- [ ] **[PRIORITY]** "Stop by the booth" personal emails to dressage contacts attending NDPC
- [ ] Travel logistics, lodging, what fits in the car
- [ ] Founder office hours coverage during NDPC — communicate any reduced support window upfront in app

### P3 — Onboarding for NDPC visitors
- [ ] **[PRIORITY]** "Just met you at NDPC — here's how to get started in 5 minutes" landing page or auto-email triggered by NDPC signup
- [ ] QR code → landing page tested on real phones (different OS, browsers)

### S1 — Forms/outputs (S2 priority — only if time allows)
- [ ] Spot-check: any rider with 4+ weeks of data sees a complete Insights experience — every tab populated, nothing broken

### Marketing
- [ ] Release Week 7 YouTube video + caption — final pre-NDPC anchor
- [ ] Founder weekly post — final NDPC ramp-up
- [ ] Sunday 5-line update

---

## WEEK 8 — June 29–July 5 · NDPC week

**Theme:** Execute. No content creation, no new code. Booth + auto-posts + signups + support response.

- [ ] **[PRIORITY]** Daily NDPC story posts (pre-staged, fire even if booth is quiet)
- [ ] **[PRIORITY]** Capture every in-person email signup — target 75 from Marketing Plan
- [ ] **[PRIORITY]** Daily: respond to support within 24h even from the road
- [ ] **[PRIORITY]** Daily: 10-min check on Sentry, Stripe, Anthropic spend, error rate
- [ ] End-of-each-day note: signups today, IC enrollments today, anything weird
- [ ] If you have a rider using YDJ at NDPC — capture their experience for a post-event story

---

## WEEK 9 — July 6–7 · IC cohort closes (lowest-priority money moment)

**Theme:** Closing push, but accept the cap-fill is unlikely. Don't burn out chasing it.

### Closing comms (P2)
- [ ] July 6: "IC closes tomorrow at midnight" email to pilots + waitlist + NDPC signups
- [ ] July 7: morning + evening reminder; one final founder post
- [ ] **Sunday July 7, 11:59pm:** IC cohort closes — verify Stripe coupon disabled, `/pricing` updates

### Wrap-up
- [ ] July 8 morning: write the 8-week campaign retro — what worked, what didn't, what's next
- [ ] Snapshot final metrics: total signups, IC enrollments, pilot conversion rate, AI generation count, total spend
- [ ] Forgive yourself for whatever didn't get done

---

## Standing reminders (every week)

- **Mobile-first, Safari-tested.** Every fix gets QA'd on iOS Safari before merge.
- **Pilot data is sacred.** Any schema change touching pilot user docs gets a Firestore export first.
- **Cost discipline.** Pre-process aggressively, cache aggressively, Sonnet-by-default. Watch the Anthropic dashboard daily for the first month.
- **Monday morning = content production block.** Everything else is business operations.
- **Sunday evening = 30-minute 5-line update.** Signups this week / top post / what surprised you / what to change. Your only required reporting.

---

## What I dropped from the source lists (intentionally)

Per your priority direction, the following items from the source lists are de-prioritized — fix only if zero cost, otherwise defer past July 7:

- IC cohort > 100 race-condition handling (B2 in checklist) — unlikely to fill, won't matter
- Pilot conversion dashboard / per-pilot status spreadsheet — you've got this under control informally
- M-tier polish items (`comprehensive_dressage_test_database.json` cache key, `getStaleCache 90-day` audit, `repairTruncatedJSON` audit, diagnostic-scripts runbook, MicroDebrief `lastRegenError` surfacing) — all post-launch backlog
- 3 unit tests + GitHub Actions CI — defer past July 7 unless there's downtime; nice-to-have not need-to-have for a single-engineer launch
- Tight enforcement of "10 shows/yr" Show Planner counter — Week 2 fix is just removing the claim from copy; real counter is post-launch

---

## Fast-cut order (if you're behind)

If a week slips, drop in this order so the launch still ships:
1. Unit tests + CI (M6, M7)
2. Voice input QA (H9)
3. Tier-aware daily call limit (H4)
4. Frontend timeout flip (H1)
5. GitHub Actions CI

The five items above are the safest things to defer. Everything tagged **[BLOCKER]** stays.
