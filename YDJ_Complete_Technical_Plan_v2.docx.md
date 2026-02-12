

**YOUR DRESSAGE JOURNEY**

────────────────────

Complete Technical Plan

Pilot Through Full Launch

February 2026 – December 2026

Version 2.0  |  February 2026

Architecture, Infrastructure, Service Providers & Development Strategy

# **1\. Executive Summary**

This document is the definitive technical plan for Your Dressage Journey (YDJ), consolidating all prior architecture recommendations, the Platform Outputs Definition v2.0, and the updated subscription/phase matrix into a single, actionable reference. It covers every service provider, every development phase, and every integration decision from the February 2026 pilot through the full commercial launch in Q4 2026\.

**Current State**

HTML/JavaScript prototype forms with localStorage. Functional on desktop; iOS Safari mobile persistence issues identified and resolved through web hosting deployment. Comprehensive data collection forms, voice input, 150+ curated reflection prompts, and a complete USDF dressage test database are built.

**Target State**

Production-ready web application with Firebase-backed storage, user authentication, AI-powered multi-voice coaching analysis, interactive data visualizations, subscription billing, and a mobile-first Progressive Web App experience supporting 500+ concurrent users.

**Critical Path**

*Deploy hosted forms \+ Firebase database (pilot) → Claude artifact output for pilot users → API-powered web output for beta/paid users → Stripe billing → Dashboard & visualizations → PWA → Scale.*

| Key Pilot Decision Pilot users (up to 15\) enter data via hosted forms saved to Firebase, then copy/paste their data into the YDJ Comprehensive Analyzer Claude artifact for AI output. All subsequent tiers receive output via web pages and the app, powered by server-side Claude API calls. |
| :---- |

# **2\. Complete Service Provider Stack**

The following table defines every third-party service required across the full lifecycle of YDJ, organized by function.

| Function | Provider | Purpose | Cost Estimate |
| :---- | :---- | :---- | :---- |
| **Hosting** | Netlify | Static site hosting, CDN, CI/CD, form handling, SSL | Free – $19/mo (Pro) |
| **Source Control** | GitHub | Version control, PR review, Actions CI/CD | Free (public/private repos) |
| **Database** | Firebase / Firestore | NoSQL database, offline sync, real-time listeners, automatic backups | Free tier → $25–100/mo |
| **Authentication** | Firebase Auth | Email/password, social login, session management, email verification | Free (up to 50K MAU) |
| **AI – Primary** | Anthropic Claude API | All coaching analysis, pattern recognition, journey maps, multi-voice coaching, GP Thinking, event planning | $100–500/mo (scales) |
| **AI – Optional** | Google Gemini | Possible initial pre-processing / classification layer to reduce Claude token usage | $0–50/mo (deferred) |
| **Billing** | Stripe | Subscription management, checkout, customer portal, invoicing, webhooks, dunning | 2.9% \+ $0.30/txn |
| **Email – Transactional** | Resend | Account verification, password reset, subscription confirmations, analysis-ready notifications | Free (3K/mo) → $20/mo |
| **Email – Marketing** | ConvertKit (Kit) | Welcome sequences, onboarding drips, pilot check-ins, re-engagement campaigns, newsletter | Free (1K subs) → $25/mo |
| **Error Tracking** | Sentry | Frontend/backend error capture, performance monitoring, release tracking | Free (5K events/mo) |
| **Uptime Monitoring** | UptimeRobot | 5-minute interval checks, alert notifications, status page | Free (50 monitors) |
| **Analytics** | Google Analytics 4 | User behavior, funnels, conversion tracking, engagement metrics | Free |
| **Product Analytics** | Mixpanel or PostHog | Feature usage tracking, activation funnels, cohort retention, A/B testing | Free tier → $25/mo |
| **Domain / DNS** | Cloudflare | DNS management, DDoS protection, CDN edge caching, SSL | Free |
| **Scheduling (Pilot)** | Calendly | Pilot participant check-in scheduling, debrief call booking | Free (1 event type) |
| **Community** | Facebook Group / Discord | Pilot cohort communication, feature feedback, peer support | Free |
| **PDF Generation** | Puppeteer or react-pdf | Export journey maps, coaching analysis, event plans to PDF | Included (library) |

| Monthly Infrastructure Cost Projection Pilot (15 users): \~$0–50/mo on free tiers. Beta (100 users): \~$150–400/mo. Full launch (500 users): \~$400–1,000/mo. Claude API is the primary variable cost; pre-processing reduces token usage by 60–80%. |
| :---- |

# **3\. System Architecture**

## **3.1 High-Level Architecture**

The platform follows a three-tier architecture: a React frontend served via Netlify, Firebase as the data and authentication layer, and server-side Cloud Functions orchestrating Claude API calls. During the pilot phase, the AI output tier is replaced by manual Claude artifact usage.

**Pilot Architecture (Feb–Mar 2026\)**

* User enters data via hosted web forms on Netlify

* Forms save to Firebase Firestore (resolves iOS localStorage issue)

* User exports data via copy-to-clipboard from each form

* User pastes data into YDJ Comprehensive Analyzer (Claude artifact)

* Claude artifact generates journey map, coaching analysis, data dashboard

* Barb facilitates manually, monitoring completion milestones

**Production Architecture (Apr 2026+)**

* Same hosted forms, now with full authentication and subscription gating

* Firebase Cloud Functions aggregate user data and invoke Claude API

* Pre-processing layer computes summaries before API calls (token optimization)

* API responses rendered to web dashboard views (React components)

* Optional PDF export of all outputs via Puppeteer/react-pdf

* Stripe webhooks control feature access by subscription tier

## **3.2 Data Flow**

1. User completes form on mobile or desktop browser

2. Form validates client-side, then writes to Firestore via Firebase SDK

3. Firestore security rules enforce per-user data isolation

4. Cloud Function triggered on data thresholds (e.g., 5th debrief submitted)

5. Pre-processing function aggregates raw data into computed summaries

6. Summaries sent to Claude API with output-specific system prompts

7. API response parsed, validated, cached in Firestore

8. Frontend queries cached results and renders dashboard/reports

## **3.3 Database Schema (Firestore)**

Firestore’s document-oriented model maps naturally to YDJ’s data structure. Each user is a top-level document with subcollections for each data type.

| Collection | Documents | Key Fields |
| :---- | :---- | :---- |
| **users** | One per user | email, displayName, subscriptionTier, createdAt |
| **users/{uid}/rider\_profiles** | One per user | Goals, experience, learning style, riding history |
| **users/{uid}/horse\_profiles** | One per horse | Name, breed, level, temperament, quirks |
| **users/{uid}/debriefs** | One per ride | Date, horse, ratings, exercises, narrative, emotions |
| **users/{uid}/reflections** | One per reflection | Category (6 types), prompt, narrative, date |
| **users/{uid}/self\_assessments** | Rider \+ Physical | Awareness states, self-regulation, strengths, physical scores |
| **users/{uid}/events** | One per event | Type, date, details, goals, concerns |
| **users/{uid}/observations** | Lesson/ride observations | Observer, date, structured feedback |
| **users/{uid}/analysis\_cache** | Cached AI outputs | Type, generatedAt, version, JSON payload |
| **dressage\_tests** | Global test database | Level, test name, movements, coefficients, geometry |

# **4\. Phase & Subscription Matrix**

## **4.1 Platform Phases**

| Phase | Max Users | Minimum Viable Input | Output Delivery |
| :---- | :---- | :---- | :---- |
| **Pilot** | 15 | Rider profile \+ 5 debriefs \+ 6 reflections (1 per category) | Claude artifact (user pastes data) |
| **Beta** | 100 | Per subscription level | Web app views \+ optional PDF |
| **Full Launch** | Unlimited | Per subscription level | Web app views \+ optional PDF |

## **4.2 Input Sets by Feature**

| Input Set | Required Items | Optional Items |
| :---- | :---- | :---- |
| **Pilot** | Rider profile, 5 debriefs, 6 reflections (1 from each category) | Horse profile, observations, events |
| **Static Planner** | Rider profile, horse profile, 5 debriefs, 6 reflections, 1 event planner | Observations, events |
| **Static GP Thinking** | Rider profile, horse profile, 5 debriefs, 6 reflections, GP thinking self-assessment | Observations, events |
| **Static Physical** | Rider profile, horse profile, 5 debriefs, 6 reflections, physical self-assessment | Observations, events |
| **Complete / Continuous** | Rider profile, horse profile, 5 debriefs, 6 reflections, GP self-assessment, physical self-assessment, event planner | Observations, events |

## **4.3 Subscription Tiers**

| Tier | Price | Output Set | Output Delivery |
| :---- | :---- | :---- | :---- |
| **Pilot** | Free | Journey map, multi-voice analysis, basic data dashboard | Claude artifact (paste data) |
| **Tier 1** | $9.99/mo | Static journey map, multi-voice analysis, basic data dashboard | API → web view \+ PDF |
| **Tier 2a** | $24.99/mo | Tier 1 \+ static event planner (1 event, 6-month window) | API → web view \+ PDF |
| **Tier 2b** | $24.99/mo | Tier 1 \+ GP Thinking Layers 1 & 2 | API → web view \+ PDF |
| **Tier 2c** | $24.99/mo | Tier 1 \+ physical guidance | API → web view \+ PDF |
| **Tier 3** | $49.99/mo | Dynamic journey map, all voices, unlimited event planner (12-mo), dynamic GP Thinking, dynamic physical guidance | API → web view \+ PDF (on demand) |

| Tier Design Rationale Tier 2 is split into three variants (a/b/c) so riders choose the feature most relevant to them. This controls AI API costs by only generating the outputs each rider actually uses, while creating natural upsell paths to Tier 3\. |
| :---- |

# **5\. Development Phases**

## **Phase 1: Pilot Foundation (February–March 2026\)**

**Goal:** Working hosted forms with Firebase database backend, resolving all mobile iOS data persistence issues. Pilot users receive AI output via the Claude artifact.

**Technical Deliverables**

* Deploy all data collection forms to Netlify with SSL

* Set up Firebase project (Firestore, Auth) on free/Spark tier

* Implement email/password authentication with verification

* Connect all forms to Firestore (replace localStorage writes)

* Build copy-to-clipboard export for each form (feeds Claude artifact)

* Implement auto-save with Firestore offline persistence

* Test on iOS Safari, Android Chrome, desktop browsers

* Set up automated Firestore backups

* Configure ConvertKit for pilot welcome sequence and weekly check-in emails

* Deploy YDJ Comprehensive Analyzer as shareable Claude artifact

**Service Provider Setup (Phase 1\)**

| Provider | Action | Tier | Est. Hours |
| :---- | :---- | :---- | :---- |
| Netlify | Create account, connect GitHub repo, deploy | Free | 4 |
| Firebase | Create project, configure Firestore \+ Auth \+ security rules | Spark (free) | 6 |
| GitHub | Organize repo, set up branch protection, CI/CD Actions | Free | 4 |
| ConvertKit | Create account, build pilot welcome sequence (Days 1, 3, 7, 14\) | Free | 6 |
| Calendly | Set up pilot check-in scheduling | Free | 1 |
| Google Analytics 4 | Install tracking on all pages | Free | 2 |

**Development Effort**

**Total: 60–80 hours.** Critical path: Hosting \+ CI/CD (4 hrs) → Firebase setup \+ security rules (6 hrs) → Auth flow (12 hrs) → Form–Firestore integration (20 hrs) → Mobile testing (16 hrs) → Documentation \+ onboarding (8 hrs).

**Phase 1 Infrastructure Cost: $0/month**

All providers at free tier for 15 users.

## **Phase 2: AI Integration (April–May 2026\)**

**Goal:** Replace the Claude artifact workflow with server-side API calls. All users now see output rendered directly in the web app.

**Technical Deliverables**

* Upgrade Firebase to Blaze (pay-as-you-go) for Cloud Functions

* Implement pre-processing layer (prepareGrandPrixData() and equivalents)

* Build Claude API integration via Cloud Functions (27 unique call patterns)

* Implement Journey Map generation (3 API calls)

* Implement Multi-Voice Coaching (4 API calls: Technical, Empathetic, Classical, Strategist)

* Implement Data Visualizations API calls (3 calls)

* Build analysis caching layer in Firestore

* Build React dashboard shell with report rendering components

* Implement weekly batch processing for recurring reports

* Set up Resend for transactional emails (analysis-ready notifications)

* Implement Sentry error tracking

**New Service Provider Setup (Phase 2\)**

| Provider | Action | Tier | Est. Hours |
| :---- | :---- | :---- | :---- |
| Anthropic Claude API | Set up account, API keys, implement all prompt templates for 7 output types | Pay-as-you-go | 32 |
| Resend | Configure transactional email templates, verification, analysis-ready notifications | Free (3K/mo) | 6 |
| Sentry | Install SDK, configure error capture, set up alerts | Free | 4 |
| UptimeRobot | Configure endpoint monitoring and alerts | Free | 1 |

**Development Effort**

**Total: 80–100 hours.** Claude API integration \+ testing (8 hrs) → Data aggregation service (16 hrs) → Prompt engineering \+ testing (24 hrs) → Report rendering (20 hrs) → Caching (12 hrs) → Admin dashboard (16 hrs).

**API Call Architecture**

Per the Platform Outputs Definition v2.0, the weekly coaching report totals 10 API calls per rider: 3 for Journey Map, 4 for Multi-Voice Coaching, and 3 for Data Visualizations. GP Thinking Layer 1, Physical Guidance, and Self-Assessment are triggered by data milestones, not weekly. Layer 2 uses Opus and is generated only at major milestones (\~3 times per program). All other calls use Sonnet.

**Phase 2 Infrastructure Cost: \~$150–300/month**

Primary driver is Claude API usage. Pre-processing reduces input tokens by 60–80%.

## **Phase 3: Payments & Subscriptions (April 2026, parallel)**

**Goal:** Accept payments and gate features by subscription tier, enabling the beta/preliminary rollout to paying subscribers.

**Technical Deliverables**

* Set up Stripe account with test mode, then go live

* Build checkout flow for Tiers 1, 2a/2b/2c, and 3

* Implement Stripe webhook handler in Cloud Functions

* Sync subscription status to Firestore user document

* Build feature-gating middleware (check tier before API calls)

* Implement Stripe Customer Portal for self-service billing management

* Build dunning / retry logic for failed payments

* Create cancellation flow with exit survey

* Billing history page and invoice access

**Stripe Integration Detail**

1. Stripe Checkout Sessions for initial purchase (hosted checkout page)

2. Stripe Billing Portal for upgrades, downgrades, payment method updates

3. Webhook events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment\_failed

4. Cloud Function webhook handler updates Firestore user.subscriptionTier on every event

5. Frontend reads user.subscriptionTier to show/hide features and prompt upgrades

**Development Effort**

**Total: 50–60 hours.** Stripe setup (4 hrs) → Checkout flow (12 hrs) → Webhooks \+ subscription sync (16 hrs) → Feature gates (10 hrs) → Customer portal (8 hrs) → Testing edge cases (8 hrs).

## **Phase 4: Dashboard & Visualizations (June–August 2026\)**

**Goal:** Interactive data visualization and full output suite including GP Thinking Layer 2, Event Planner, and Physical Guidance.

**Technical Deliverables**

* Dashboard layout with tab navigation across all output types

* Chart.js integration for ride frequency, emotional trends, consistency tracking

* GP Thinking Layer 2 implementation (4 API calls, Opus for Calls 1–2)

* Event Planner full implementation (4 API calls \+ test database integration)

* Physical Guidance implementation (2 API calls)

* Self-Assessment longitudinal comparison

* Interactive filtering, date ranges, horse-specific views

* PDF export for all output types (Puppeteer/react-pdf)

* Mobile responsive design for all dashboard views

**Development Effort**

**Total: 100–120 hours.** Dashboard architecture (12 hrs) → Data query optimization (16 hrs) → Chart implementation (40 hrs) → Interactive filtering (20 hrs) → Export (16 hrs) → Mobile responsive (20 hrs).

## **Phase 5: Progressive Web App (August–September 2026\)**

**Goal:** Native-like mobile experience with offline form submission capability.

**Technical Deliverables**

* Service worker for offline form caching and background sync

* Web App Manifest for install-to-home-screen

* Push notifications for submission reminders and analysis-ready alerts

* Camera integration for ride photo uploads

* Performance optimization targeting \< 2 second load on 3G

**Development Effort**

**Total: 80–100 hours.**

## **Phase 6: Scale & Optimization (September–December 2026\)**

**Goal:** Handle 200+ subscribers with high performance, robust monitoring, and growth infrastructure.

**Technical Deliverables**

* Firestore index optimization and query performance tuning

* Cloudflare CDN edge caching configuration

* Code splitting, lazy loading, and bundle size reduction

* Mixpanel/PostHog product analytics for feature usage and retention cohorts

* A/B testing framework for onboarding and conversion optimization

* Referral program infrastructure ($10 give/$10 get)

* Engagement scoring and at-risk user identification

**Development Effort**

**Total: 60–80 hours.**

# **6\. AI Output Architecture**

YDJ produces 7 distinct output types powered by 27 unique API call patterns. Every output follows the same workflow: structured input assembly → pre-processing into computed summaries → Claude API call with output-specific system prompt → response parsing and caching → rendering.

## **6.1 API Calls Per Output**

| Output | API Calls | Model | Trigger | Min Tier |
| :---- | :---- | :---- | :---- | :---- |
| Journey Map | 3 | Sonnet | Weekly | Tier 1 |
| Multi-Voice Coaching | 4 | Sonnet | Weekly | Tier 1 |
| Data Visualizations | 3 | Sonnet | Weekly | Tier 1 |
| GP Thinking L1 | 1 \+ pre | Sonnet | Data threshold | Tier 2b |
| GP Thinking L2 | 4 | Opus \+ Sonnet | Milestones (\~3x) | Tier 2b |
| Physical Guidance | 2 | Sonnet | Bi-weekly | Tier 2c |
| Event Planner | 4 | Sonnet | On-demand | Tier 2a |
| Self-Assessment Analysis | 3 | Sonnet | On submission | Tier 2b/2c |

## **6.2 Cost Management Strategy**

* Pre-processing: Server-side aggregation of raw data into summaries cuts input tokens by 60–80% — the single largest cost lever

* Caching: GP Thinking dashboards and L2 roadmaps cached in Firestore, regenerated only on data thresholds

* Model selection: Only GP Thinking L2 Calls 1–2 use Opus; everything else uses Sonnet

* Batch processing: Weekly reports for all riders generated in a scheduled Cloud Function window

* Staleness detection: Prompt regeneration only when new data materially changes the analysis

* Tier gating: Only generate outputs the rider’s subscription includes

## **6.3 Gemini Pre-Processing Layer (Optional, Deferred)**

A potential future optimization: use Google Gemini as an initial classification/summarization layer before Claude API calls. Gemini could handle data categorization, sentiment scoring, and basic trend extraction at lower cost, feeding refined inputs to Claude for nuanced coaching analysis. This is deprioritized during the pilot and beta phases for simplicity and stability, but represents a meaningful cost optimization path at scale (200+ users).

# **7\. Security, Privacy & Compliance**

## **7.1 Authentication**

* Firebase Authentication: email/password with email verification required

* Password policy: 8+ characters, mixed letters and numbers

* JWT session tokens with 30-day expiration

* Role-based access: User, Admin, Support

* Social login (Google) as optional convenience — Phase 2+

## **7.2 Data Security**

* Encryption at rest: Firebase default (AES-256)

* Encryption in transit: HTTPS/TLS 1.3 enforced

* Firestore security rules enforce per-user document isolation

* API rate limiting on Cloud Functions

* Input sanitization on all form fields (XSS/injection prevention)

* Environment variables for all API keys and secrets (never in repo)

## **7.3 Privacy**

* Data minimization: collect only what analysis requires

* Clear privacy policy explaining data usage and AI processing

* User data export capability (GDPR compliance)

* Account deletion with 30-day data purge

* Explicit opt-in for marketing emails

* No data sharing with third parties beyond the AI API providers

## **7.4 Backup & Disaster Recovery**

* Automated daily Firestore backups to Google Cloud Storage

* Point-in-time recovery with 30-day window

* Recovery Point Objective: \< 4 hours

* Recovery Time Objective: \< 24 hours

# **8\. Monitoring, Analytics & Success Metrics**

## **8.1 Technical Monitoring Stack**

* Sentry: Frontend and Cloud Function error tracking, performance monitoring

* UptimeRobot: 5-minute endpoint checks with Slack/email alerts

* Firebase Performance: Page load times, API latency

* Cloud Function logs: API call success/failure rates, token usage tracking

## **8.2 Business Metrics**

* Activation rate: % users completing profile \+ 3 debriefs

* Engagement rate: % users active weekly

* Retention cohorts: 30/60/90-day retention

* Churn rate: % subscriptions cancelled per month (target \< 5%)

* Analysis completion rate: % users reaching analysis milestone

* NPS: Survey-based satisfaction (target 50+)

## **8.3 Technical Performance Targets**

| Metric | Target | Measured By |
| :---- | :---- | :---- |
| Page load time | \< 2 seconds on 3G | Firebase Performance |
| API response time (p95) | \< 500ms | Cloud Function logs |
| Error rate | \< 0.1% of requests | Sentry |
| Uptime | 99.5%+ | UptimeRobot |
| Database query time (p95) | \< 100ms | Firestore metrics |
| Data integrity | \< 0.01% loss | Backup verification |
| AI analysis generation | \< 2 minutes/report | Cloud Function timing |
| Infrastructure cost | \< 10% of revenue | Monthly billing review |

# **9\. Resource Requirements & Budget**

## **9.1 Personnel**

| Role | Commitment | Phases | Est. Cost |
| :---- | :---- | :---- | :---- |
| Barb (Founder) | Full-time | All phases: product, community, pilot facilitation | — |
| Full-Stack Developer | 20→40 hrs/wk | Phases 1–6: all technical build | $35K–64K |
| AI/Prompt Specialist | Contract, 40 hrs | Phase 2–3: prompt engineering, API optimization | $4K–6K |
| Customer Success | 10–20 hrs/wk | Phase 4+: onboarding, support, community | $10K–20K |

## **9.2 Development Hours by Phase**

| Phase | Hours (Low) | Hours (High) | Timeline |
| :---- | :---- | :---- | :---- |
| 1\. Pilot Foundation | 60 | 80 | Feb–Mar |
| 2\. AI Integration | 80 | 100 | Apr–May |
| 3\. Payments & Subscriptions | 50 | 60 | Apr (parallel) |
| 4\. Dashboard & Visualizations | 100 | 120 | Jun–Aug |
| 5\. PWA | 80 | 100 | Aug–Sep |
| 6\. Scale & Optimization | 60 | 80 | Sep–Dec |
| **TOTAL** | **430** | **540** | **10 months** |

## **9.3 Total Budget Estimate**

| Category | Low | High |
| :---- | :---- | :---- |
| Development (developer \+ AI specialist) | $39,000 | $70,000 |
| Infrastructure (10 months) | $1,500 | $5,000 |
| AI API costs (10 months) | $1,000 | $5,000 |
| Customer success (6 months) | $10,000 | $20,000 |
| **TOTAL THROUGH DECEMBER 2026** | **$51,500** | **$100,000** |

# **10\. Risk Mitigation**

## **Technical Risks**

* **Firebase vendor lock-in:** Abstract database access behind an interface layer. If costs exceed $500/month, evaluate migration to Supabase (PostgreSQL, self-hostable, more predictable pricing).

* **AI costs spiral:** Hard per-user cost limits, pre-processing token reduction, analysis throttling, tier-based output gating, cached results.

* **Mobile compatibility:** Firebase Firestore offline persistence replaces localStorage. Extensive device testing matrix (iOS Safari, Android Chrome, desktop). PWA as fallback.

* **Security breach:** Per-user Firestore security rules, encryption at rest/in transit, regular dependency audits, incident response plan.

## **Development Risks**

* **Developer availability:** Thorough code documentation, knowledge sharing sessions, maintain backup contractor relationships.

* **Scope creep:** Strict per-phase deliverable lists, MVP mindset, monthly feature freeze reviews.

* **Technical debt:** Allocate 20% of dev time to refactoring and testing. Code review on all PRs.

## **Business Risks**

* **Low pilot engagement:** Weekly check-in emails via ConvertKit, Calendly-scheduled debrief calls, community group, direct Barb facilitation.

* **Pricing resistance:** Pilot exit survey includes pricing feedback. Tier 2 split lets riders choose their most-valued feature at a mid price point.

# **11\. Testing Strategy**

## **11.1 Manual Testing**

* Cross-browser: Chrome, Safari, Firefox, Edge

* Cross-device: iPhone (Safari), iPad, Android phone (Chrome), Android tablet, Desktop

* User acceptance testing: Pilot participants test all form flows

* Accessibility: Keyboard navigation, screen reader compatibility

## **11.2 Automated Testing**

* Unit tests: Jest for business logic and pre-processing functions (80%+ coverage)

* Integration tests: Cloud Function API endpoints, Firestore operations

* End-to-end: Playwright for critical flows (signup → profile → debrief → dashboard)

* Visual regression: Percy or similar for UI change detection

## **11.3 Performance Testing**

* Load testing: Simulate 100 concurrent users

* Stress testing: Find system breaking point

* Database query analysis: Identify slow queries, optimize Firestore indexes

# **12\. DevOps & CI/CD**

## **12.1 Git Workflow**

* GitHub repository with branch protection on main

* Branch strategy: main (production), staging, feature/\* branches

* All changes via pull request with code review

* Conventional Commits for clear changelog generation

## **12.2 Continuous Integration (GitHub Actions)**

* Lint \+ type check on every push

* Run unit \+ integration test suite

* Security dependency scanning

* Build verification

## **12.3 Continuous Deployment**

* Netlify auto-deploys staging branch to staging URL

* Production deploy: manual approval after staging validation

* Rollback: one-click revert to previous deploy

* Zero-downtime deploys via Netlify’s atomic deployment model

# **13\. Immediate Next Actions**

## **This Week (Week of February 10, 2026\)**

1. Create Netlify account and deploy existing forms from GitHub

2. Create Firebase project on Spark (free) plan

3. Test deployed forms on iOS Safari and Android Chrome

4. Set up ConvertKit account and draft pilot welcome email sequence

5. Finalize pilot participant list and send onboarding invitations

## **Next 2 Weeks**

1. Design and implement Firestore database schema

2. Build Firebase Auth flow (signup, login, email verification)

3. Connect first form (rider profile) to Firestore as proof-of-concept

4. Test Firestore offline persistence on iOS Safari (critical validation)

5. Post developer job listing; begin interviews

## **Before Pilot Data Collection Begins**

1. All forms deployed to Netlify with Firestore backend

2. Copy-to-clipboard export working on all forms

3. YDJ Comprehensive Analyzer artifact tested with sample data

4. Tested on 5+ device/browser combinations

5. Backup data collection plan ready (Google Forms fallback)

6. Pilot onboarding documentation and quick-start guide distributed

| Document Control Version 2.0  |  February 11, 2026 Consolidates: Technical Implementation Plan v1.0, Platform Outputs Definition v2.0, Project Roadmap v1.0 Next Review: March 15, 2026 (Post-Pilot Technical Retrospective) |
| :---: |

