# ErrorNest — Engineering Specification (plan.md)

**Tagline:** AI-Powered Error Monitoring & Debugging Platform
**Document type:** Full engineering specification (pre-development)
**Audience:** Engineering team (backend, frontend, DB, DevOps, QA)
**Status:** Draft v1.0 — for review before implementation begins

---

## Table of Contents

1. Project Overview
2. Problem Statement
3. Why This Product Exists
4. Business Value
5. Goals
6. Non-Goals
7. MVP Scope
8. Future Scope
9. User Personas
10. Functional Requirements (all modules)
11. User Stories
12. Database Planning
13. API Planning
14. Folder Planning
15. Dashboard Planning
16. Authentication Flow
17. UI/UX Planning
18. Development Milestones
19. Risks
20. Documentation Required
21. Development Roadmap

---

## 1. Project Overview

ErrorNest is a multi-tenant SaaS platform that helps software teams capture, group, triage, and resolve application errors in production and staging environments. Teams install a lightweight SDK (or call a REST ingestion API directly) inside their applications; when an exception occurs, the SDK sends a structured error event to ErrorNest. ErrorNest deduplicates events into **issues** (a group of similar occurrences of the same underlying bug), enriches them with stack trace parsing, and gives engineers a dashboard to search, filter, assign, comment on, and resolve issues.

On top of the core monitoring pipeline, ErrorNest layers an **AI assistant** that reads the stack trace, error message, and surrounding metadata to (a) explain what the error means in plain language and (b) suggest a concrete, reviewable fix. The AI never auto-applies changes — it produces a suggestion an engineer reviews, exactly the way a senior engineer would review a junior's patch.

ErrorNest is designed API-first: every dashboard feature is a thin client over a documented REST API, so the same platform can be scripted, integrated into CI/CD, or wrapped by a future CLI or mobile app without re-architecture.

---

## 2. Problem Statement

Software teams — especially small teams without a dedicated observability budget — routinely ship code that fails silently in production. Common failure patterns this product addresses:

- Errors are discovered from user complaints or support tickets, not from monitoring, because full observability platforms (Sentry, Datadog) are expensive, heavyweight, or require dedicated setup time the team doesn't have.
- When an error is discovered, engineers spend disproportionate time re-deriving context (which release, which environment, how often it happens, who else it affects) instead of fixing it.
- Duplicate reports of the same underlying bug are treated as unrelated tickets, wasting triage time.
- Junior engineers and solo developers often lack a second pair of eyes to interpret unfamiliar stack traces quickly.
- There is no lightweight, self-serve, transparently-priced way for a 2–20 person team to get production error visibility in under 10 minutes.

---

## 3. Why This Product Exists

ErrorNest exists to close the gap between "an error happened" and "an engineer understands it well enough to fix it," compressing both **discovery time** (via automatic capture, grouping, and alerting) and **comprehension time** (via AI explanation and fix suggestions). It targets the segment of the market — solo developers, early-stage startups, small software teams — that is underserved by enterprise-grade observability tools priced and scoped for large organizations.

---

## 4. Business Value

- **Reduced mean time to detection (MTTD):** automatic ingestion + alerting surfaces errors before users report them.
- **Reduced mean time to resolution (MTTR):** issue grouping, stack trace viewing, and AI explanation shrink the investigation phase of a bug fix.
- **Lower triage overhead:** deduplication and assignment workflows prevent duplicate work across a team.
- **Lower barrier to entry:** a scoped, self-serve SaaS product with a fast SDK integration reduces time-to-value from days to minutes compared to enterprise APM suites.
- **Defensible differentiation:** the AI explanation/fix-suggestion layer is a genuine capability differentiator versus purely mechanical error trackers, not a bolted-on gimmick — it operates on real captured stack traces and metadata.
- **Expansion path:** the API-first design supports future monetizable surfaces (CLI, Slack/Teams bot, CI/CD gating, mobile SDKs) without re-platforming.

---

## 5. Goals

- Ship a production-grade, deployed, multi-tenant SaaS with real authentication, RBAC, and persistence.
- Provide an ingestion pipeline that can accept error events via API and immediately group them into issues using a deterministic fingerprinting strategy.
- Provide a dashboard that lets a team search, filter, sort, triage, assign, comment on, and resolve issues.
- Provide release and environment tracking so teams can correlate errors with deploys.
- Provide an alerting and notification system for new/regressed/spiking issues.
- Provide an AI feature (error explanation + fix suggestion) that is genuinely useful, not decorative.
- Maintain full audit logging of sensitive actions for accountability.
- Be API-first: every UI action maps to a documented, independently usable API endpoint.

## 6. Non-Goals

- Full APM (Application Performance Monitoring) — no distributed tracing, no performance/latency monitoring, no infrastructure metrics.
- Log aggregation as a general product (ErrorNest stores structured error events, not arbitrary log streams).
- Native mobile SDKs (iOS/Android/React Native crash reporting) — web/server SDK and REST ingestion only in MVP.
- Session replay / screen recording.
- On-premise / self-hosted deployment — MVP is hosted SaaS only.
- Billing/subscription management — out of scope for the trial; organizations are provisioned without payment gating.
- Multi-region data residency — single-region deployment for MVP.
- SSO/SAML enterprise identity federation — MVP supports email+password and OAuth (Google/GitHub) only.

---

## 7. MVP Scope

The MVP must ship all of the following, end to end, in production:

- Email+password and OAuth (Google, GitHub) authentication with email verification.
- Organizations with RBAC (Owner, Admin, Member, Viewer).
- Projects scoped to an organization, each with a unique DSN-style API key.
- SDK/API key management (create, rotate, revoke).
- Error ingestion API accepting structured events from an SDK or direct HTTP call.
- Deterministic issue grouping (fingerprinting) of incoming events.
- Issue list with search, filters (status, level, environment, release, assignee), and sort.
- Issue detail view: stack trace viewer, occurrence timeline, affected users/count, tags, environment/release breakdown.
- Comments and assignment on issues.
- Manual issue status transitions (unresolved → resolved → reopened, ignored).
- Release tracking (create release, associate errors with a release/version).
- Environment management (production, staging, development — arbitrary named environments).
- Alert rules (new issue, regression, spike threshold) with in-app + email notification delivery.
- Notification center (in-app feed of alerts and mentions).
- Analytics dashboard: error volume over time, top issues, error rate by project/environment/release.
- AI error explanation (plain-language summary of an issue from its stack trace + message).
- AI fix suggestion (a proposed patch/diff-style suggestion or remediation steps, clearly marked as AI-generated and unapplied).
- Audit log of sensitive actions (role changes, key rotation, issue resolution, deletions).
- User settings (profile, password, notification preferences).
- Organization settings (name, members, roles, danger zone).

## 8. Future Scope

Explicitly deferred beyond the trial/MVP, to be planned later:

- Native mobile crash SDKs.
- Distributed tracing / performance monitoring module.
- Session replay.
- Slack/Teams/PagerDuty integrations for alerting.
- SAML/SSO and SCIM provisioning for enterprise customers.
- Usage-based billing and subscription tiers.
- Public status pages per project.
- Custom retention policies and data export/archival tooling.
- Self-hosted / on-prem deployment option.
- AI auto-fix PR creation (opening a pull request with the suggested patch) — MVP only _suggests_, never _applies_.
- Multi-region / data residency controls.

---

## 9. User Personas

**1. Solo Developer — "Aditi"**
Indie hacker running a side-project SaaS. No dedicated ops time. Wants error visibility with near-zero setup and an AI assistant to speed up debugging since she has no teammate to ask.

**2. Startup Engineering Lead — "Marcus"**
Leads a 6-person engineering team at a seed-stage startup. Needs to know when production breaks before customers complain, wants lightweight RBAC so contractors get limited access, and cares about MTTR because every hour matters pre-Series-A.

**3. QA Engineer — "Reema"**
Verifies bug reports against real production error data instead of relying on reproduction steps alone. Needs strong search/filter and the ability to link issues to releases to confirm regressions.

**4. DevOps Engineer — "Yusuf"**
Owns deploy pipelines and wants error rate correlated with releases and environments to gate or roll back deploys. Cares about API access (for CI/CD scripting) and alert reliability.

**5. Engineering Manager — "Sana"**
Doesn't triage individual issues but needs the analytics dashboard: trend lines, top offenders, team throughput on resolving issues, and audit logs for accountability during incident retrospectives.

---

## 10. Functional Requirements

Each module below specifies Purpose, Features, User Flow, Acceptance Criteria, Edge Cases, Priority, and Dependencies. Priority: **P0** = MVP blocking, **P1** = MVP important but not blocking, **P2** = post-MVP/bonus.

### 10.1 Authentication

**Purpose:** Establish verified user identity and a secure session as the root of all authorization decisions.

**Features:**

- Email + password signup with Argon2id hashing.
- Email verification required before any write action.
- Login, logout, password reset (single-use token, 15–30 min TTL).
- OAuth login via Google and GitHub.
- Session management via httpOnly, Secure, SameSite=Lax cookies.
- Rate limiting on login/reset endpoints.

**User Flow:**

1. User signs up with email/password or OAuth.
2. If email/password: verification email sent; account is read-only until verified.
3. User logs in; session cookie issued; session ID rotates on login and on privilege change.
4. User can request password reset; receives single-use link; sets new password; all other sessions are invalidated.

**Acceptance Criteria:**

- A new account cannot create an organization or project until email is verified.
- Passwords are never stored or logged in plaintext.
- Reset tokens are single-use and expire within the configured TTL.
- OAuth accounts that share an email with an existing password account are linked, not duplicated, after ownership verification.
- Failed login attempts are rate-limited to ~5 per 15 minutes per IP+account with exponential backoff.

**Edge Cases:**

- User attempts OAuth login with an email already registered via password — must confirm identity (e.g., verify via existing password or email link) before linking.
- Password reset requested for a non-existent email — API responds identically to a valid request (no user enumeration).
- Session cookie replay after logout — must be rejected (session invalidated server-side, not just cleared client-side).
- Concurrent password reset requests — only the most recently issued token is valid.

**Priority:** P0
**Dependencies:** None (foundational module).

---

### 10.2 Organizations

**Purpose:** Top-level tenant boundary; every project, member, and billing-adjacent entity belongs to exactly one organization.

**Features:**

- Create organization (auto-assigns creator as Owner).
- Rename organization, manage slug/URL identifier.
- View organization member list and roles.
- Organization deletion (Owner-only, destructive, confirmation-gated).

**User Flow:**

1. On first login, user is prompted to create or join an organization.
2. Owner invites members by email; invitees receive an invite link tied to a role.
3. Owner/Admin can change member roles or remove members.

**Acceptance Criteria:**

- Every project, issue, alert, and API key is scoped to exactly one organization; no cross-org data leakage under any query path.
- Only Owners can delete an organization or transfer ownership.
- Organization deletion cascades explicitly (projects, issues, keys) after a confirmation step — never silently.

**Edge Cases:**

- Last remaining Owner tries to leave or demote themselves — must be blocked, or require promoting another member first.
- Invite sent to an email already a member — reject with a clear message, not a duplicate invite.
- Slug collision on organization creation — must be enforced unique with a clear validation error.

**Priority:** P0
**Dependencies:** Authentication.

---

### 10.3 Projects

**Purpose:** Scope error data to a specific application/service within an organization (e.g., "Web App," "API," "Worker").

**Features:**

- Create/rename/archive/delete project.
- View project-level settings (environments, alert rules, API keys).
- Project-level role inheritance from organization roles (no separate per-project RBAC in MVP).

**User Flow:**

1. Org Admin/Owner creates a project, selecting a platform type (e.g., Node.js, Python, browser JS) for SDK guidance.
2. Project is issued a default API key immediately on creation.
3. Members with organization access see the project in their project list.

**Acceptance Criteria:**

- A project always belongs to exactly one organization.
- Deleting a project soft-deletes it and all descendant issues/events (recoverable within a grace window) rather than hard-deleting immediately.
- Archiving a project stops accepting new events but preserves existing data and read access.

**Edge Cases:**

- Project name collision within the same organization — must be uniquely named per-org (not globally).
- Attempt to ingest events into an archived project — API must reject with a clear error, not silently drop.
- Deleting a project that has active alert rules — rules must be deleted/deactivated in the same transaction.

**Priority:** P0
**Dependencies:** Organizations.

---

### 10.4 Team Management

**Purpose:** Manage who belongs to an organization and what they're allowed to do.

**Features:**

- Invite member by email with a chosen role (Owner, Admin, Member, Viewer).
- Accept/decline invite.
- Change a member's role.
- Remove a member.
- View pending invites.

**User Flow:**

1. Admin/Owner sends invite with role.
2. Invitee receives email with a signed, expiring invite link.
3. Invitee accepts (creating an account if needed) and is added with the assigned role.

**Acceptance Criteria:**

- RBAC is enforced server-side on every route; role sent from client is never trusted.
- Role permission matrix (see below) is consistently enforced across all modules.
- Invite links expire (e.g., 7 days) and are single-use.

**Role permission matrix (MVP):**

| Action                           | Owner | Admin | Member | Viewer |
| -------------------------------- | ----- | ----- | ------ | ------ |
| Manage billing/org deletion      | ✅    | ❌    | ❌     | ❌     |
| Manage members/roles             | ✅    | ✅    | ❌     | ❌     |
| Manage projects/API keys         | ✅    | ✅    | ❌     | ❌     |
| Manage alert rules               | ✅    | ✅    | ✅     | ❌     |
| Resolve/assign/comment on issues | ✅    | ✅    | ✅     | ❌     |
| View issues/dashboard            | ✅    | ✅    | ✅     | ✅     |

**Edge Cases:**

- Invite email typo — invites are not validated against existing accounts, so a bounced invite must be revocable/re-sendable.
- Member removed while they have an active session — session must be invalidated on next request (server-side role re-check, not just at login).
- Role downgraded mid-session (e.g., Admin → Member) — must immediately restrict access on next request.

**Priority:** P0
**Dependencies:** Organizations, Authentication.

---

### 10.5 SDK / API Keys

**Purpose:** Authenticate error ingestion traffic from client applications without using user session credentials.

**Features:**

- Auto-generated API key (DSN-style) per project on creation.
- Create additional keys, rotate, revoke.
- Per-key metadata: name, created date, last used, environment scoping (optional).

**User Flow:**

1. Developer copies the project's API key/DSN from project settings.
2. Developer configures the SDK (or raw HTTP client) with the key.
3. Ingestion requests are authenticated by key, not by user session.

**Acceptance Criteria:**

- Revoking a key immediately rejects further ingestion using that key (no caching window beyond a short, documented TTL).
- Keys are never displayed again in full after creation except at creation time (only a masked suffix shown thereafter) — matching standard API key hygiene, OR displayed with an explicit "copy now" pattern; team must pick one approach and apply it consistently (recommended: show-once).
- Key rotation invalidates the old key and issues a new one atomically.

**Edge Cases:**

- Ingestion request with a revoked or malformed key — reject with 401, do not leak whether the key format was merely invalid vs. revoked.
- Race condition: event ingested with a key that is revoked mid-request — must fail closed (reject), not partially process.
- Rate-limited key abuse (e.g., leaked key spamming ingestion) — per-key rate limiting with 429 responses.

**Priority:** P0
**Dependencies:** Projects.

---

### 10.6 Error Monitoring (Ingestion)

**Purpose:** Receive structured error events from SDKs/API clients and durably persist them.

**Features:**

- REST ingestion endpoint accepting a structured error payload (message, stack trace, level, environment, release, user context, tags, timestamp).
- Payload validation and size limits.
- Async processing pipeline (ingest → validate → fingerprint → group → persist → notify).
- Basic SDK (JS/Node reference implementation) that captures uncaught exceptions and unhandled promise rejections and posts them to the ingestion endpoint.

**User Flow:**

1. Application throws an uncaught exception.
2. SDK (or manual `captureException` call) serializes the error and posts it to the ingestion API with the project's key.
3. Server validates, fingerprints, and either attaches the event to an existing issue or creates a new issue.
4. If alert rules match, notifications are triggered.

**Acceptance Criteria:**

- Ingestion endpoint responds quickly (event accepted, heavy processing — grouping, AI, notification — happens asynchronously) so SDK calls never block the host application meaningfully.
- Malformed payloads are rejected with a clear validation error and never crash the pipeline.
- Every event is durably stored with its raw payload preserved for later re-analysis.

**Edge Cases:**

- Extremely large stack traces or payloads — enforce a max payload size (e.g., 200KB) with graceful truncation and a flag indicating truncation occurred.
- Burst ingestion (thousands of events/minute from a crash loop) — ingestion must degrade gracefully via rate limiting per project/key, not fall over.
- Clock skew between client and server — server timestamp is authoritative for ordering; client timestamp stored separately for reference.
- Duplicate event submission (SDK retry after timeout) — idempotency key or short-window dedup to avoid double-counting.

**Priority:** P0
**Dependencies:** SDK/API Keys, Projects.

---

### 10.7 Issue Grouping

**Purpose:** Deduplicate many occurrences of the same underlying bug into a single actionable "issue."

**Features:**

- Deterministic fingerprinting algorithm based on normalized stack trace frames (function name, file, and a normalized line reference) plus error type.
- Manual "merge issues" and "split issue" actions for cases the algorithm gets wrong.
- Fingerprint override capability (custom fingerprint rules per project, e.g., group by error message pattern instead of stack trace).

**User Flow:**

1. New event arrives; server computes a fingerprint hash from its normalized top N stack frames.
2. If a matching open issue exists with that fingerprint in the project, the event is attached to it and its counters/last-seen timestamp update.
3. If no match, a new issue is created.
4. A user can manually merge two issues they believe are duplicates, or split a wrongly-grouped event out into its own issue.

**Acceptance Criteria:**

- Two events with identical normalized stack traces always group into the same issue.
- Merging two issues preserves all events and comments from both, under the surviving issue.
- Fingerprint computation excludes volatile data (line numbers from minified/dynamic code should be normalized where source maps are unavailable — documented as a known limitation).

**Edge Cases:**

- Minified JS stack traces without source maps — grouping falls back to a coarser fingerprint (error type + message pattern) and is flagged as "low-confidence grouping" in the UI.
- Two genuinely different bugs that happen to share a top frame (e.g., a shared utility function) — manual split must be available and non-destructive.
- Merge across issues with different resolution statuses — resulting merged issue's status must be explicitly decided (default: least-resolved status wins, e.g., unresolved beats resolved).

**Priority:** P0
**Dependencies:** Error Monitoring.

---

### 10.8 Issue Details

**Purpose:** Give an engineer everything needed to understand and resolve a specific issue.

**Features:**

- Header: title (derived from error type + message), status, level, first seen/last seen, occurrence count, affected user count.
- Tabs/sections: Stack Trace, Occurrences timeline, Tags/Context, Comments, Activity/Audit.
- Status transitions: Unresolved, Resolved, Ignored, Reopened (auto-reopen on new occurrence of a resolved issue).
- Assignment to a team member.

**User Flow:**

1. User opens an issue from the issue list.
2. Reviews stack trace and metadata to understand the failure.
3. Assigns to self or a teammate, adds a comment, and/or triggers AI explanation.
4. Marks resolved once fixed and deployed; issue auto-reopens if it recurs.

**Acceptance Criteria:**

- Resolving an issue records who resolved it and when (audit trail).
- A resolved issue that receives a new matching event automatically transitions to Reopened and triggers a regression alert.
- All state transitions are reflected in the issue's Activity feed in chronological order.

**Edge Cases:**

- Two users resolve the same issue simultaneously — last-write-wins with both actions recorded in the activity feed (no silent overwrite).
- Issue reopened while assignee has left the organization — issue becomes unassigned and flagged for re-assignment, not left pointing at a removed user.
- Ignoring an issue with an expiration condition (e.g., "ignore until 10 more events") — must be explicitly supported or explicitly out of scope (MVP: simple ignore with manual un-ignore only; conditional ignore is P2).

**Priority:** P0
**Dependencies:** Issue Grouping, Team Management (for assignment).

---

### 10.9 Stack Trace Viewer

**Purpose:** Render a captured stack trace in a way that's fast to read and pinpoint the failure location.

**Features:**

- Frame-by-frame display: function name, file, line/column, and (where available) surrounding source context lines.
- Collapse/expand of library/vendor frames (in-app frames highlighted, framework noise collapsed by default).
- Copy raw stack trace to clipboard.
- Toggle between raw and "pretty" (grouped/annotated) view.

**User Flow:**

1. From issue detail, user views the Stack Trace tab.
2. In-app frames are visually distinguished from vendor/framework frames.
3. User expands a collapsed vendor section if needed for deeper investigation.

**Acceptance Criteria:**

- Stack traces render correctly for at least the reference SDK's supported languages/runtimes (JS/Node in MVP).
- Long stack traces (50+ frames) render without layout jank and remain scrollable/collapsible.
- Copy-to-clipboard reproduces the exact raw trace as received.

**Edge Cases:**

- Missing or malformed stack trace (error captured without a trace) — viewer shows a clear "no stack trace available" state instead of a blank/broken panel.
- Extremely deep recursion producing hundreds of frames — must truncate display with a "show all" affordance rather than rendering all frames unconditionally.

**Priority:** P0
**Dependencies:** Error Monitoring, Issue Details.

---

### 10.10 Release Tracking

**Purpose:** Correlate errors with specific application versions/deploys to identify regressions.

**Features:**

- Create a release (version string, optional commit SHA, deploy timestamp).
- Associate incoming events with the release reported by the SDK at capture time.
- Release detail view: new issues introduced in this release, issues resolved by this release, error rate compared to prior release.

**User Flow:**

1. CI/CD pipeline (or manual entry) creates a release record via API when deploying.
2. SDK is configured with the current release version, tagging all events it sends.
3. Team views the release page to see whether error rate improved or regressed versus the previous release.

**Acceptance Criteria:**

- Every event can (optionally) carry a release tag; issues can be filtered/grouped by release.
- A release comparison view correctly computes delta in issue count and event volume against the immediately preceding release for the same project.

**Edge Cases:**

- Events with no release tag (older SDK versions, direct API calls without a release) — must be grouped under an explicit "unknown release" bucket, not dropped or crash the comparison view.
- Release created after events referencing it already arrived (out-of-order) — events remain associated by string match once the release record exists; no error prior to that.

**Priority:** P1
**Dependencies:** Error Monitoring, Projects.

---

### 10.11 Environment Management

**Purpose:** Separate error data by deployment environment (production, staging, development, or custom names).

**Features:**

- Environments are implicitly created the first time an event tags a new environment string (no separate creation step required), plus an explicit management screen to rename/hide environments.
- Filter issues/dashboard by environment.

**User Flow:**

1. SDK is configured with an environment string (e.g., `production`).
2. Events tagged with that environment automatically populate the environment filter and dashboard breakdowns.
3. Team can hide/archive noisy environments (e.g., `local-dev`) from default views without deleting data.

**Acceptance Criteria:**

- Environment filter accurately scopes every list, search, and analytics view it's applied to.
- Hiding an environment removes it from default views but does not delete underlying events (recoverable via "show hidden").

**Edge Cases:**

- Typo'd environment names creating near-duplicate environments (`prod` vs `production`) — MVP does not auto-merge; document as a known limitation and provide manual rename/merge as P1 capability.

**Priority:** P1
**Dependencies:** Error Monitoring.

---

### 10.12 Alerts

**Purpose:** Proactively notify the team when something needs attention, without requiring anyone to be watching the dashboard.

**Features:**

- Alert rule types: New Issue, Regression (resolved issue reopened), Spike (event count exceeds threshold within a time window).
- Rule scope: project-wide or filtered (by environment/level).
- Delivery channels: in-app notification (MVP) and email (MVP). Slack/PagerDuty explicitly deferred (Future Scope).

**User Flow:**

1. Admin/Member creates an alert rule (e.g., "notify on spike >50 events/5min in production").
2. Matching ingestion events evaluate active rules asynchronously.
3. On match, a notification is created and delivered via configured channels.

**Acceptance Criteria:**

- Alert evaluation does not block or slow the ingestion path (evaluated asynchronously after persistence).
- A given rule does not re-fire redundantly for the same ongoing spike within its cooldown window (documented, configurable cooldown, e.g., 30 min per rule).
- Deleting a project or environment cleans up dependent alert rules explicitly.

**Edge Cases:**

- Spike rule threshold met exactly at window boundary — must use a consistent, documented windowing strategy (fixed or sliding window; sliding recommended) to avoid boundary flapping.
- Alert rule referencing a deleted environment — rule is disabled automatically with a visible warning, not silently broken.
- Email delivery failure — failure is logged and retried with backoff; in-app notification still delivered regardless of email status.

**Priority:** P0 (New Issue + Regression), P1 (Spike)
**Dependencies:** Error Monitoring, Issue Grouping, Notification Center.

---

### 10.13 Notification Center

**Purpose:** Give users a single place to see everything that needs their attention (alerts, mentions, assignments).

**Features:**

- In-app feed: unread/read state, notification types (alert fired, assigned to you, mentioned in comment).
- Mark as read (single/all).
- Notification preferences (per-type, per-channel opt-in/out) in User Settings.

**User Flow:**

1. Notification-triggering event occurs (alert fires, user is assigned, user is @mentioned).
2. Notification appears in the bell/feed with an unread badge.
3. User clicks through to the relevant issue; notification is marked read.

**Acceptance Criteria:**

- Unread count badge accurately reflects unread notifications at all times (no stale count after read actions).
- Notification preferences are respected at delivery time (a muted type never generates a delivered notification, though it may still be logged for audit purposes if required).

**Edge Cases:**

- User deletes their account/is removed from org — pending notifications for them are cleaned up, not orphaned.
- High-frequency alert firing (many spikes in a short time) — notifications are batched/grouped in the feed rather than flooding it one-by-one.

**Priority:** P0
**Dependencies:** Alerts.

---

### 10.14 Analytics Dashboard

**Purpose:** Give a bird's-eye view of application health across projects.

**Features:**

- Error volume over time (line chart, selectable time range).
- Top issues by occurrence count / affected users.
- Error rate breakdown by project, environment, and release.
- Resolution metrics (issues resolved this period, average time-to-resolution).

**User Flow:**

1. User lands on the dashboard after login (org-level default view, or scoped to a selected project).
2. User adjusts time range and filters (project, environment).
3. Charts and top-issue lists update to reflect the selection.

**Acceptance Criteria:**

- All dashboard numbers are computed from the same underlying data as the issue list/search (no drift between "top issues" widget and manually filtering the issue list to match).
- Dashboard loads for a returning user with sensible default data above the fold (e.g., last 24h) without requiring configuration.

**Edge Cases:**

- Project/org with zero events — dashboard shows an explicit empty state with a call-to-action to install the SDK, not empty/broken charts.
- Very high event volume — analytics queries must use pre-aggregated/indexed data (not scanning raw events at request time) to stay responsive; see Database Planning for aggregation strategy.

**Priority:** P0
**Dependencies:** Error Monitoring, Issue Grouping, Release Tracking, Environment Management.

---

### 10.15 Search

**Purpose:** Let users quickly locate a specific issue or set of issues.

**Features:**

- Server-side full-text/trigram search over issue title, error type, and message.
- Debounced search input (~300ms).
- Search results mirror active filters (search is combined with filters, not exclusive of them).

**User Flow:**

1. User types into the search box on the issue list.
2. After debounce, a server-side search request returns matching issues, respecting any active filters.
3. Query is reflected in the URL so results are shareable/bookmarkable.

**Acceptance Criteria:**

- Search is performed server-side against an indexed column (not client-side array filtering) and scales to large issue counts.
- Empty search results are visually distinguished from "no data at all" (matches copyright/UX requirement: "no matches for this filter" vs "no data yet").

**Edge Cases:**

- Search query containing special characters/regex-like input — must be safely escaped for the underlying search engine, never passed unsanitized into a query.
- Search across an organization with many projects — results must remain scoped to projects the user has access to.

**Priority:** P0
**Dependencies:** Issue Grouping.

---

### 10.16 Filters

**Purpose:** Narrow the issue list and dashboard to a relevant subset.

**Features:**

- Filter by status (unresolved/resolved/ignored), level (error/warning/info), environment, release, assignee, project, and date range.
- Filters combine with AND semantics.
- Filter state mirrored into the URL query string.

**User Flow:**

1. User selects one or more filters from the issue list toolbar.
2. List and any dependent analytics widgets update immediately.
3. User can copy/share the URL to hand a colleague the exact same filtered view.

**Acceptance Criteria:**

- Filter combinations are additive (AND), and the applied filter set is always visibly summarized (chips/badges) so the user isn't guessing what's currently applied.
- Browser back/forward navigates between filter states correctly (filter state lives in the URL, not only in component state).

**Edge Cases:**

- Filter combination yielding zero results — one-click "reset filters" affordance is always available.
- Filtering by an assignee who has since left the organization — filter option remains available (historical data) but is visually marked as a former member.

**Priority:** P0
**Dependencies:** Search, Issue Details.

---

### 10.17 Comments

**Purpose:** Enable asynchronous team discussion on an issue without leaving the platform.

**Features:**

- Threaded (flat, single-level in MVP) comments on an issue.
- @mention teammates, triggering a notification.
- Edit/delete own comments; Admin/Owner can delete any comment.

**User Flow:**

1. User opens an issue and adds a comment, optionally @mentioning a teammate.
2. Mentioned user receives a notification.
3. Comment appears in the issue's activity/comment feed with author and timestamp.

**Acceptance Criteria:**

- Comment content is escaped/sanitized on render — never inserted as raw HTML.
- Deleting a comment removes it from the visible feed but is retained (or explicitly tombstoned) in the audit trail for accountability, per organization policy.

**Edge Cases:**

- @mention of a user without access to that project — mention is not resolved to a notification (avoid leaking issue existence to unauthorized users); UI should not even offer them in the mention autocomplete.
- Comment editing after a notification has already been sent for the original mention — no retroactive notification changes needed; original notification stands.

**Priority:** P0
**Dependencies:** Issue Details, Team Management, Notification Center.

---

### 10.18 Assignments

**Purpose:** Make ownership of an issue explicit so nothing falls through the cracks.

**Features:**

- Assign/reassign/unassign an issue to a single organization member.
- "Assigned to me" filter/view.
- Assignment change triggers a notification to the new assignee.

**User Flow:**

1. User opens an issue and assigns it to themselves or a teammate from a member picker (scoped to project access).
2. Assignee receives a notification.
3. Issue list can be filtered to "assigned to me" for a personal triage queue.

**Acceptance Criteria:**

- Only organization members with at least Member-level access to the project can appear in the assignee picker.
- Reassignment is logged in the issue's activity feed (who assigned, to whom, when).

**Edge Cases:**

- Assignee removed from the organization while issue is still open — issue is automatically unassigned and flagged, not left silently pointing at a nonexistent member.

**Priority:** P0
**Dependencies:** Issue Details, Team Management, Notification Center.

---

### 10.19 AI Error Explanation

**Purpose:** Reduce comprehension time by summarizing what an error means in plain language.

**Features:**

- "Explain this error" action on an issue, sending the stack trace, error message, language/runtime, and relevant tags to an LLM.
- Output: a structured explanation — likely root cause, which layer of the app is implicated (e.g., "this is a null-reference in your data-fetching layer"), and severity/impact framing.
- Explanation is cached per issue version (not regenerated on every view) with a manual "regenerate" option.

**User Flow:**

1. User opens an issue and clicks "Explain with AI."
2. Request is sent server-side (never exposing model API keys to the client) with the issue's stack trace and metadata.
3. Response is rendered in a dedicated panel, clearly labeled as AI-generated, with a regenerate button and a lightweight feedback control (helpful/not helpful).

**Acceptance Criteria:**

- AI output is always visually and textually labeled as AI-generated; it is never presented as a human/engineer statement.
- The feature degrades gracefully if the AI provider is unavailable (clear error state, retry option), never blocking core issue triage.
- No secret/API key material is ever sent to the client; all LLM calls are server-side.

**Edge Cases:**

- Extremely large stack trace exceeding model context limits — payload is truncated/summarized server-side before sending, with the truncation noted to the user.
- AI hallucinated/incorrect explanation — feedback control lets users flag it; flagged explanations are surfaced in an internal review list (does not block usage).
- Sensitive data potentially present in stack trace locals/messages (e.g., accidental PII in an error message) — document a redaction pass (best-effort pattern-based scrubbing of obvious secrets/emails) before sending to the AI provider.

**Priority:** P0
**Dependencies:** Issue Details, Stack Trace Viewer.

---

### 10.20 AI Fix Suggestions

**Purpose:** Give engineers a concrete, reviewable starting point for a fix, not just an explanation.

**Features:**

- "Suggest a fix" action, building on the same context as AI Error Explanation.
- Output: a proposed code-level suggestion (diff-style or described change) plus a plain-language rationale, and — where the root cause is ambiguous — clarifying questions instead of a guessed fix.
- Explicit UI treatment: suggestions are never auto-applied; there is no "apply" button in MVP, only "copy" and "was this helpful."

**User Flow:**

1. From an issue (typically after viewing the AI explanation), user clicks "Suggest a fix."
2. AI receives the stack trace, error message, and (if available) surrounding source context lines already captured in the event.
3. Suggestion renders in a clearly-labeled panel; user copies it into their own editor/PR workflow.

**Acceptance Criteria:**

- Suggestions are always presented as proposals requiring human review, with explicit copy such as "Review before using — not automatically applied."
- The feature works from the data ErrorNest already has (captured stack trace/context) and does not require connecting the user's full source repository in MVP (full-repo-aware suggestions are Future Scope).
- Suggestion generation is logged (who requested it, when, for which issue) for audit/cost-tracking purposes.

**Edge Cases:**

- Root cause not determinable from available context (e.g., a generic timeout with no informative trace) — AI response must say so explicitly rather than fabricating a plausible-sounding but ungrounded fix.
- Repeated requests on the same unchanged issue — rate-limited per issue per user to control cost and discourage spamming regenerate.

**Priority:** P0
**Dependencies:** AI Error Explanation, Stack Trace Viewer.

---

### 10.21 Audit Logs

**Purpose:** Provide an immutable accountability trail for sensitive actions across the organization.

**Features:**

- Logged actions include: role changes, member removal, API key creation/rotation/revocation, issue resolution/status changes, comment deletion (admin override), project/organization deletion, alert rule changes.
- Per-entity activity view (e.g., an issue's own activity feed is a filtered view of the audit log) and an organization-wide audit log screen (Admin/Owner only).
- Each entry: actor, action, target entity, before/after (where applicable), timestamp, IP (for security-sensitive actions).

**User Flow:**

1. Sensitive action occurs (e.g., Admin changes a member's role).
2. An audit log entry is written in the same transaction as the action, never as a best-effort side effect.
3. Owner/Admin can view and filter the organization audit log by actor, action type, and date range.

**Acceptance Criteria:**

- Audit log entries are append-only; no update/delete path exists for them, including for Owners.
- Every action in the "logged actions" list above reliably produces exactly one corresponding entry (verified in tests, not just documented).

**Edge Cases:**

- Action performed by a since-deleted user — audit entry retains the actor's identity snapshot (name/email at time of action) rather than a dangling foreign key reference.
- High-volume audit log growth — query view is paginated and indexed by (organization, timestamp) to stay performant.

**Priority:** P1
**Dependencies:** Team Management, SDK/API Keys, Issue Details.

---

### 10.22 User Settings

**Purpose:** Let a user manage their own identity and preferences.

**Features:**

- Edit display name, avatar.
- Change password (requires current password); manage linked OAuth providers.
- Notification preferences (per notification type, per channel).
- View active sessions and revoke individual sessions ("log out other devices").

**User Flow:**

1. User navigates to Settings → Profile/Account.
2. Edits profile fields or notification preferences; changes save with explicit confirmation (not silent auto-save for sensitive fields like password).
3. User can revoke other active sessions if they suspect unauthorized access.

**Acceptance Criteria:**

- Changing password invalidates all other active sessions immediately.
- Notification preference changes take effect on the next notification-triggering event (no stale caching of old preferences).

**Edge Cases:**

- User with only an OAuth login (no password set) attempts to "change password" — flow instead offers to set an initial password, clearly distinguishing this from a change.
- Revoking the current session — must log the user out immediately and consistently (no stale UI showing them as still logged in).

**Priority:** P1
**Dependencies:** Authentication.

---

### 10.23 Organization Settings

**Purpose:** Let Owners/Admins configure organization-wide behavior.

**Features:**

- Organization name/slug editing.
- Member management (see Team Management).
- Danger zone: organization deletion, ownership transfer.
- Default notification/alert settings inherited by new projects (optional convenience feature).

**User Flow:**

1. Owner/Admin navigates to Organization Settings.
2. Edits general settings; danger-zone actions require typed confirmation (e.g., typing the org name) before executing.

**Acceptance Criteria:**

- Danger-zone actions are visually and interactively distinct (separate section, confirmation modal requiring exact-match input) from routine settings.
- Only Owners can access ownership transfer and organization deletion; Admins see these controls disabled/hidden, not merely error out if clicked.

**Edge Cases:**

- Ownership transfer to a user who hasn't accepted their invite yet — transfer target must already be an active member.
- Slug change breaking previously bookmarked/shared URLs — old slug should 301-redirect for a grace period if feasible, or the limitation should be explicitly documented.

**Priority:** P1
**Dependencies:** Organizations, Team Management.

---

## 11. User Stories

Format: `As a <persona>, I want <capability>, so that <benefit>.` Each includes acceptance criteria in Given/When/Then form.

**US-01 — Signup with email verification**
As a solo developer, I want to sign up with email and password, so that I can create my first organization.

- Given a new email, When I submit signup, Then an account is created in an unverified state and a verification email is sent.
- Given an unverified account, When I try to create a project, Then the request is rejected with a clear "verify your email" message.

**US-02 — Install SDK and see first event**
As a solo developer, I want to install the SDK and see my first captured error within minutes, so that I trust the product works before investing more setup time.

- Given a newly created project and its API key, When my app throws an uncaught exception with the SDK configured, Then an issue appears in the dashboard within a few seconds.

**US-03 — Invite a teammate with limited access**
As a startup engineering lead, I want to invite a contractor as a Viewer, so that they can see error data without being able to change anything.

- Given I am an Owner, When I invite a user with role Viewer, Then that user can view issues and dashboards but every mutating action is rejected server-side.

**US-04 — Deduplicate noisy errors**
As a QA engineer, I want repeated occurrences of the same bug grouped into one issue, so that I don't triage the same bug 500 times.

- Given 500 events with identical normalized stack traces, When they are ingested, Then they appear as one issue with an occurrence count of 500.

**US-05 — Correlate errors with a release**
As a DevOps engineer, I want to see whether a new release increased error rate, so that I can decide whether to roll back.

- Given release v1.2.0 is created and tagged on new events, When I view the release comparison, Then I see new-issue count and event-volume delta versus v1.1.0.

**US-06 — Get alerted on a spike**
As an engineering lead, I want to be notified automatically when errors spike in production, so that I don't have to babysit the dashboard.

- Given a spike alert rule of >50 events/5min in production, When that threshold is crossed, Then an in-app and email notification is sent within the rule's evaluation interval, and it does not re-fire again within the cooldown window for the same ongoing spike.

**US-07 — Understand an unfamiliar error with AI**
As a solo developer, I want an AI explanation of an error I don't recognize, so that I can understand it without a teammate to ask.

- Given an issue with a captured stack trace, When I click "Explain with AI," Then I receive a plain-language explanation labeled as AI-generated within a reasonable time, or a clear error state if the AI provider fails.

**US-08 — Get a fix suggestion**
As a solo developer, I want a suggested fix for a well-understood error, so that I have a reviewable starting point instead of a blank editor.

- Given an issue with sufficient context, When I click "Suggest a fix," Then I receive a diff-style suggestion with rationale, clearly marked as unapplied and requiring review.

**US-09 — Resolve and auto-reopen**
As an engineering manager, I want resolved issues to reopen automatically if they recur, so that "resolved" is trustworthy.

- Given a resolved issue, When a new matching event arrives, Then the issue transitions to Reopened and a regression alert fires.

**US-10 — Search and filter**
As a QA engineer, I want to search issues by error message and filter by environment, so that I can quickly find the specific bug I'm verifying.

- Given issues across multiple environments, When I search "NullPointerException" and filter to `staging`, Then only matching issues in staging are returned, and the URL reflects this exact state.

**US-11 — Audit a sensitive change**
As an Owner, I want a record of who changed a teammate's role, so that I can investigate unexpected access during a security review.

- Given a role change from Member to Admin, When I view the organization audit log, Then I see the actor, target, old/new role, and timestamp, and this entry cannot be edited or deleted.

**US-12 — Comment and mention a teammate**
As a team member, I want to @mention a teammate on an issue, so that they're pulled into the investigation without a separate Slack message.

- Given an issue and a project teammate, When I comment "@teammate can you check this," Then the teammate receives a notification linking directly to the issue and comment.

---

## 12. Database Planning

No SQL or ORM schema is generated here — this section describes entities, relationships, attributes, indexing strategy, soft-delete strategy, and audit logging at a conceptual level for the database architect to formalize.

### 12.1 Entity Overview

- **User** — an individual account. Attributes: id, email (unique), password_hash (nullable if OAuth-only), display_name, avatar_url, email_verified_at, created_at, updated_at, deleted_at.
- **OAuthIdentity** — links a User to an external provider. Attributes: id, user_id (FK User), provider (google/github), provider_account_id, created_at. Unique on (provider, provider_account_id).
- **Session** — active login session. Attributes: id, user_id (FK User), session_token_hash, created_at, expires_at, revoked_at, ip_address, user_agent.
- **Organization** — tenant root. Attributes: id, name, slug (unique), owner_user_id (FK User), created_at, updated_at, deleted_at.
- **Membership** — join entity between User and Organization with a role. Attributes: id, organization_id (FK), user_id (FK), role (owner/admin/member/viewer), invited_by (FK User, nullable), status (invited/active), joined_at, created_at.
- **Invite** — pending invitation. Attributes: id, organization_id (FK), email, role, token_hash, invited_by (FK User), expires_at, accepted_at, created_at.
- **Project** — application/service scoped to an org. Attributes: id, organization_id (FK), name, slug, platform, status (active/archived), created_at, updated_at, deleted_at.
- **ApiKey** — ingestion credential. Attributes: id, project_id (FK), name, key_hash, key_suffix (for display), created_by (FK User), last_used_at, revoked_at, created_at.
- **Environment** — named deployment context, implicit or explicit. Attributes: id, project_id (FK), name, is_hidden, created_at. Unique on (project_id, name).
- **Release** — version/deploy record. Attributes: id, project_id (FK), version, commit_sha (nullable), deployed_at, created_by (FK User, nullable), created_at.
- **Issue** — grouped bug. Attributes: id, project_id (FK), fingerprint (indexed), title, error_type, status (unresolved/resolved/ignored), level (error/warning/info), first_seen_at, last_seen_at, occurrence_count, affected_user_count, assignee_id (FK User, nullable), resolved_at, resolved_by (FK User, nullable), created_at, updated_at, deleted_at.
- **Event** — a single occurrence of an issue. Attributes: id, issue_id (FK), project_id (FK, denormalized for query performance), environment_id (FK), release_id (FK, nullable), message, raw_payload (JSON, size-capped), stack_trace (JSON, normalized frames), user_context (JSON, nullable), tags (JSON key/value), server_received_at, client_sent_at, created_at.
- **IssueComment** — discussion on an issue. Attributes: id, issue_id (FK), author_id (FK User), body, mentioned_user_ids (array/join table), deleted_at, created_at, updated_at.
- **AlertRule** — notification trigger definition. Attributes: id, project_id (FK), type (new_issue/regression/spike), scope_filter (JSON: environment/level), threshold_count (nullable, for spike), threshold_window_seconds (nullable), cooldown_seconds, is_active, created_by (FK User), created_at, updated_at.
- **Notification** — delivered/queued notification for a user. Attributes: id, user_id (FK), organization_id (FK), type (alert/mention/assignment), payload (JSON: issue_id, alert_rule_id, comment_id as applicable), read_at, created_at.
- **NotificationPreference** — per-user, per-type opt-in state. Attributes: id, user_id (FK), notification_type, in_app_enabled, email_enabled.
- **AiExplanation** — cached AI output for an issue. Attributes: id, issue_id (FK), type (explanation/fix_suggestion), model_used, input_fingerprint (hash of stack trace + message, to know when regeneration is needed), content (text), requested_by (FK User), feedback (helpful/not_helpful/null), created_at.
- **AuditLogEntry** — immutable action record. Attributes: id, organization_id (FK), actor_user_id (FK User, nullable for system actions), actor_snapshot (JSON: name/email at time of action), action_type, target_type, target_id, before_state (JSON, nullable), after_state (JSON, nullable), ip_address, created_at. **Append-only — no update/delete path.**

### 12.2 Relationships

- User 1—N Membership N—1 Organization (many-to-many via Membership).
- Organization 1—N Project.
- Project 1—N ApiKey, 1—N Environment, 1—N Release, 1—N Issue, 1—N AlertRule.
- Issue 1—N Event, 1—N IssueComment, 1—N AiExplanation.
- Event N—1 Environment, N—1 Release (nullable).
- User 1—N Notification, 1—N Session, 1—N OAuthIdentity.
- Organization 1—N AuditLogEntry.

### 12.3 Indexing Strategy

- `Issue`: composite index on (project_id, status, last_seen_at) for the default issue-list query; index on (project_id, fingerprint) unique-ish lookup for grouping; full-text/trigram index on (title, error_type) for search.
- `Event`: composite index on (issue_id, server_received_at) for occurrence timelines; index on (project_id, environment_id, server_received_at) for analytics aggregation; index on (project_id, release_id) for release comparisons.
- `Membership`: composite index on (organization_id, user_id) unique; index on (user_id) for "my organizations" lookups.
- `AuditLogEntry`: composite index on (organization_id, created_at) for the audit log screen, paginated descending.
- `Notification`: composite index on (user_id, read_at, created_at) for the unread-first notification feed.
- `ApiKey`: unique index on key_hash for fast ingestion-time lookup.
- `AlertRule`: index on (project_id, is_active, type) for evaluation-time rule lookup.

### 12.4 Soft Delete Strategy

- Soft-delete (via `deleted_at`) applies to entities where recovery matters and cascading destruction has real user cost: **Organization, Project, Issue, IssueComment, User** (on account deletion request).
- Hard-delete (immediate, no recovery) applies to entities that are either purely credential/session material or already effectively logs: **Session** (on logout/revoke), **Invite** (on expiry/cancellation), expired password reset tokens.
- **AuditLogEntry is never deleted**, soft or hard, under any application code path — it is the accountability record of record. Any future data-retention/GDPR deletion requirement must be handled as a deliberate, documented, restricted operation outside normal application flows, not a standard soft-delete.
- Cascade rules are explicit, not inherited by accident: deleting a Project soft-deletes its Issues; deleting an Organization soft-deletes its Projects (and transitively their Issues) in the same transaction, gated behind the typed-confirmation flow described in Organization Settings.
- Soft-deleted records are excluded from all default queries via a consistent query-layer convention (e.g., a shared "not deleted" scope), not ad-hoc `WHERE deleted_at IS NULL` sprinkled inconsistently across the codebase.

### 12.5 Audit Logging Strategy

- Audit entries are written in the **same transaction** as the action they record — an action that succeeds without a corresponding audit entry (for the actions listed in section 10.21) is treated as a bug.
- `before_state`/`after_state` store only the changed fields relevant to the action (not full entity dumps), keeping entries compact and readable.
- Audit entries reference the actor by ID **and** store a denormalized snapshot (name/email at time of action) so the log remains meaningful even after the actor's account is later modified or removed.
- Audit log is queried exclusively through indexed, paginated access (section 12.3) — never a full-table scan from the UI.

---

## 13. API Planning

API-first, versioned under `/api/v1`. All endpoints (except signup/login/OAuth/reset and the ingestion endpoint) require a valid session and are additionally authorized by organization/project role. All list endpoints support pagination, and mutating endpoints return the mutated resource.

### 13.1 Authentication

| Method | Path                                  | Purpose                     | Auth    | Input               | Output               | Validation                                  | Errors                                    |
| ------ | ------------------------------------- | --------------------------- | ------- | ------------------- | -------------------- | ------------------------------------------- | ----------------------------------------- |
| POST   | /api/v1/auth/signup                   | Create account              | None    | email, password     | user (unverified)    | email format, password strength             | 400 validation, 409 email exists          |
| POST   | /api/v1/auth/verify-email             | Verify email via token      | None    | token               | success              | token exists, not expired                   | 400 invalid/expired token                 |
| POST   | /api/v1/auth/login                    | Authenticate, issue session | None    | email, password     | session cookie, user | rate-limited                                | 401 invalid credentials, 429 rate-limited |
| POST   | /api/v1/auth/logout                   | End current session         | Session | —                   | success              | —                                           | 401 unauthenticated                       |
| POST   | /api/v1/auth/oauth/:provider/start    | Begin OAuth flow            | None    | —                   | redirect URL         | provider supported                          | 400 unsupported provider                  |
| GET    | /api/v1/auth/oauth/:provider/callback | Complete OAuth flow         | None    | provider code       | session cookie, user | code validity                               | 401 provider error                        |
| POST   | /api/v1/auth/password-reset/request   | Request reset email         | None    | email               | generic success      | — (no enumeration)                          | 429 rate-limited                          |
| POST   | /api/v1/auth/password-reset/confirm   | Set new password            | None    | token, new_password | success              | token valid, not expired, password strength | 400 invalid/expired token                 |
| GET    | /api/v1/auth/session                  | Get current user/session    | Session | —                   | user, memberships    | —                                           | 401 unauthenticated                       |

### 13.2 Organizations & Team Management

| Method | Path                                           | Purpose                 | Auth                    | Input        | Output         | Validation                      | Errors              |
| ------ | ---------------------------------------------- | ----------------------- | ----------------------- | ------------ | -------------- | ------------------------------- | ------------------- |
| POST   | /api/v1/organizations                          | Create organization     | Session, verified email | name         | organization   | unique slug                     | 400, 409 slug taken |
| GET    | /api/v1/organizations                          | List my organizations   | Session                 | —            | organization[] | —                               | 401                 |
| GET    | /api/v1/organizations/:orgId                   | Get organization detail | Session, Member+        | —            | organization   | —                               | 403, 404            |
| PATCH  | /api/v1/organizations/:orgId                   | Update org name/slug    | Session, Admin+         | name?, slug? | organization   | unique slug                     | 403, 409            |
| DELETE | /api/v1/organizations/:orgId                   | Delete organization     | Session, Owner          | confirm_name | success        | typed confirmation matches      | 403, 400 mismatch   |
| POST   | /api/v1/organizations/:orgId/invites           | Invite member           | Session, Admin+         | email, role  | invite         | valid role, not existing member | 403, 409            |
| GET    | /api/v1/organizations/:orgId/invites           | List pending invites    | Session, Admin+         | —            | invite[]       | —                               | 403                 |
| DELETE | /api/v1/organizations/:orgId/invites/:inviteId | Revoke invite           | Session, Admin+         | —            | success        | —                               | 403, 404            |
| POST   | /api/v1/invites/:token/accept                  | Accept invite           | Session                 | —            | membership     | token valid, not expired        | 400, 404            |
| GET    | /api/v1/organizations/:orgId/members           | List members            | Session, Member+        | —            | membership[]   | —                               | 403                 |
| PATCH  | /api/v1/organizations/:orgId/members/:userId   | Change role             | Session, Admin+         | role         | membership     | not last owner demotion         | 403, 400 last-owner |
| DELETE | /api/v1/organizations/:orgId/members/:userId   | Remove member           | Session, Admin+         | —            | success        | not last owner                  | 403, 400 last-owner |

### 13.3 Projects & API Keys

| Method | Path                                           | Purpose                | Auth             | Input          | Output                           | Validation         | Errors   |
| ------ | ---------------------------------------------- | ---------------------- | ---------------- | -------------- | -------------------------------- | ------------------ | -------- |
| POST   | /api/v1/organizations/:orgId/projects          | Create project         | Session, Admin+  | name, platform | project + default api key        | unique name in org | 403, 409 |
| GET    | /api/v1/organizations/:orgId/projects          | List projects          | Session, Member+ | —              | project[]                        | —                  | 403      |
| GET    | /api/v1/projects/:projectId                    | Get project detail     | Session, Member+ | —              | project                          | —                  | 403, 404 |
| PATCH  | /api/v1/projects/:projectId                    | Update/archive project | Session, Admin+  | name?, status? | project                          | unique name        | 403, 409 |
| DELETE | /api/v1/projects/:projectId                    | Soft-delete project    | Session, Admin+  | —              | success                          | —                  | 403, 404 |
| POST   | /api/v1/projects/:projectId/keys               | Create API key         | Session, Admin+  | name           | api key (full value, shown once) | —                  | 403      |
| GET    | /api/v1/projects/:projectId/keys               | List API keys          | Session, Admin+  | —              | api key[] (masked)               | —                  | 403      |
| POST   | /api/v1/projects/:projectId/keys/:keyId/rotate | Rotate key             | Session, Admin+  | —              | new api key (shown once)         | —                  | 403, 404 |
| DELETE | /api/v1/projects/:projectId/keys/:keyId        | Revoke key             | Session, Admin+  | —              | success                          | —                  | 403, 404 |

### 13.4 Ingestion (SDK-facing)

| Method | Path                  | Purpose               | Auth             | Input                                                                                                | Output              | Validation                          | Errors                                                           |
| ------ | --------------------- | --------------------- | ---------------- | ---------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| POST   | /api/v1/ingest/events | Submit an error event | API Key (header) | message, error_type, stack_trace, level, environment, release?, tags?, user_context?, client_sent_at | accepted (event id) | payload size limit, required fields | 401 invalid key, 400 validation, 413 too large, 429 rate-limited |

### 13.5 Issues, Comments, Assignment

| Method | Path                               | Purpose                           | Auth                      | Input                                                                              | Output                      | Validation                                   | Errors                      |
| ------ | ---------------------------------- | --------------------------------- | ------------------------- | ---------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------- | --------------------------- |
| GET    | /api/v1/projects/:projectId/issues | List/search/filter issues         | Session, Viewer+          | q?, status?, level?, environment?, release?, assignee?, sort?, cursor?, page_size? | issue[] + pagination cursor | page_size <= 100                             | 403                         |
| GET    | /api/v1/issues/:issueId            | Get issue detail                  | Session, Viewer+          | —                                                                                  | issue + latest occurrences  | —                                            | 403, 404                    |
| PATCH  | /api/v1/issues/:issueId            | Update status                     | Session, Member+          | status                                                                             | issue                       | valid status transition                      | 403, 400 invalid transition |
| POST   | /api/v1/issues/:issueId/assign     | Assign/unassign                   | Session, Member+          | assignee_id (nullable)                                                             | issue                       | assignee has project access                  | 403, 400                    |
| POST   | /api/v1/issues/:issueId/merge      | Merge into another issue          | Session, Member+          | target_issue_id                                                                    | merged issue                | same project                                 | 403, 400                    |
| POST   | /api/v1/issues/:issueId/split      | Split an event into a new issue   | Session, Member+          | event_id                                                                           | new issue                   | event belongs to issue                       | 403, 400, 404               |
| GET    | /api/v1/issues/:issueId/events     | List occurrences                  | Session, Viewer+          | cursor?, page_size?                                                                | event[]                     | page_size <= 100                             | 403                         |
| GET    | /api/v1/issues/:issueId/activity   | Get audit/activity feed for issue | Session, Viewer+          | —                                                                                  | activity[]                  | —                                            | 403                         |
| GET    | /api/v1/issues/:issueId/comments   | List comments                     | Session, Viewer+          | —                                                                                  | comment[]                   | —                                            | 403                         |
| POST   | /api/v1/issues/:issueId/comments   | Add comment                       | Session, Member+          | body, mentioned_user_ids?                                                          | comment                     | body non-empty, mentions have project access | 403, 400                    |
| PATCH  | /api/v1/comments/:commentId        | Edit own comment                  | Session, author or Admin+ | body                                                                               | comment                     | —                                            | 403, 404                    |
| DELETE | /api/v1/comments/:commentId        | Delete comment                    | Session, author or Admin+ | —                                                                                  | success                     | —                                            | 403, 404                    |

### 13.6 Releases & Environments

| Method | Path                                                    | Purpose                  | Auth                        | Input                | Output        | Validation                 | Errors   |
| ------ | ------------------------------------------------------- | ------------------------ | --------------------------- | -------------------- | ------------- | -------------------------- | -------- |
| POST   | /api/v1/projects/:projectId/releases                    | Create release           | Session or API Key, Member+ | version, commit_sha? | release       | unique version per project | 403, 409 |
| GET    | /api/v1/projects/:projectId/releases                    | List releases            | Session, Viewer+            | —                    | release[]     | —                          | 403      |
| GET    | /api/v1/projects/:projectId/releases/:releaseId/compare | Compare vs prior release | Session, Viewer+            | —                    | delta metrics | —                          | 403, 404 |
| GET    | /api/v1/projects/:projectId/environments                | List environments        | Session, Viewer+            | —                    | environment[] | —                          | 403      |
| PATCH  | /api/v1/environments/:envId                             | Rename/hide environment  | Session, Admin+             | name?, is_hidden?    | environment   | unique name in project     | 403, 409 |

### 13.7 Alerts & Notifications

| Method | Path                                    | Purpose               | Auth             | Input                                                                               | Output         | Validation                    | Errors   |
| ------ | --------------------------------------- | --------------------- | ---------------- | ----------------------------------------------------------------------------------- | -------------- | ----------------------------- | -------- |
| POST   | /api/v1/projects/:projectId/alert-rules | Create alert rule     | Session, Member+ | type, scope_filter?, threshold_count?, threshold_window_seconds?, cooldown_seconds? | alert rule     | type-specific required fields | 403, 400 |
| GET    | /api/v1/projects/:projectId/alert-rules | List alert rules      | Session, Viewer+ | —                                                                                   | alert rule[]   | —                             | 403      |
| PATCH  | /api/v1/alert-rules/:ruleId             | Update rule           | Session, Member+ | fields                                                                              | alert rule     | —                             | 403, 404 |
| DELETE | /api/v1/alert-rules/:ruleId             | Delete rule           | Session, Member+ | —                                                                                   | success        | —                             | 403, 404 |
| GET    | /api/v1/notifications                   | List my notifications | Session          | unread_only?, cursor?                                                               | notification[] | —                             | 401      |
| POST   | /api/v1/notifications/:id/read          | Mark read             | Session, owner   | —                                                                                   | notification   | —                             | 401, 404 |
| POST   | /api/v1/notifications/read-all          | Mark all read         | Session          | —                                                                                   | success        | —                             | 401      |
| GET    | /api/v1/me/notification-preferences     | Get preferences       | Session          | —                                                                                   | preference[]   | —                             | 401      |
| PATCH  | /api/v1/me/notification-preferences     | Update preferences    | Session          | preference updates                                                                  | preference[]   | valid type/channel            | 401, 400 |

### 13.8 Analytics Dashboard

| Method | Path                                              | Purpose                   | Auth             | Input              | Output           | Validation          | Errors   |
| ------ | ------------------------------------------------- | ------------------------- | ---------------- | ------------------ | ---------------- | ------------------- | -------- |
| GET    | /api/v1/projects/:projectId/analytics/volume      | Error volume over time    | Session, Viewer+ | from, to, interval | time series      | valid date range    | 403, 400 |
| GET    | /api/v1/projects/:projectId/analytics/top-issues  | Top issues by count/users | Session, Viewer+ | from, to, limit?   | issue summary[]  | —                   | 403      |
| GET    | /api/v1/projects/:projectId/analytics/breakdown   | Error rate by env/release | Session, Viewer+ | from, to, group_by | breakdown[]      | valid group_by enum | 403, 400 |
| GET    | /api/v1/organizations/:orgId/analytics/resolution | Resolution metrics        | Session, Member+ | from, to           | resolution stats | —                   | 403      |

### 13.9 AI Features

| Method | Path                                   | Purpose                              | Auth             | Input             | Output         | Validation                  | Errors                          |
| ------ | -------------------------------------- | ------------------------------------ | ---------------- | ----------------- | -------------- | --------------------------- | ------------------------------- |
| POST   | /api/v1/issues/:issueId/ai/explain     | Generate/fetch cached explanation    | Session, Member+ | force_regenerate? | ai explanation | rate-limited per issue/user | 403, 429, 502 AI provider error |
| POST   | /api/v1/issues/:issueId/ai/suggest-fix | Generate/fetch cached fix suggestion | Session, Member+ | force_regenerate? | ai suggestion  | rate-limited per issue/user | 403, 429, 502                   |
| POST   | /api/v1/ai-explanations/:id/feedback   | Submit helpful/not-helpful           | Session, Member+ | feedback          | ai explanation | valid enum                  | 403, 404, 400                   |

### 13.10 Audit Log & Settings

| Method | Path                                   | Purpose              | Auth            | Input                                     | Output                           | Validation                         | Errors   |
| ------ | -------------------------------------- | -------------------- | --------------- | ----------------------------------------- | -------------------------------- | ---------------------------------- | -------- |
| GET    | /api/v1/organizations/:orgId/audit-log | List audit entries   | Session, Admin+ | actor?, action_type?, from?, to?, cursor? | audit entry[]                    | —                                  | 403      |
| GET    | /api/v1/me                             | Get own profile      | Session         | —                                         | user                             | —                                  | 401      |
| PATCH  | /api/v1/me                             | Update profile       | Session         | display_name?, avatar_url?                | user                             | —                                  | 401, 400 |
| POST   | /api/v1/me/change-password             | Change password      | Session         | current_password, new_password            | success (revokes other sessions) | current password correct, strength | 401, 400 |
| GET    | /api/v1/me/sessions                    | List active sessions | Session         | —                                         | session[]                        | —                                  | 401      |
| DELETE | /api/v1/me/sessions/:sessionId         | Revoke a session     | Session, owner  | —                                         | success                          | —                                  | 401, 404 |

---

## 14. Folder Planning

Layout follows the Next.js App Router convention with a clear API/UI boundary, matching the repository structure standard used across the program:

```
errornest/
├── .github/
│   ├── workflows/ci.yml
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── screenshots/
├── prisma/ (or equivalent migration directory)
│   ├── schema (entities per section 12)
│   └── migrations/
├── public/
├── src/
│   ├── app/
│   │   ├── (marketing)/                 # landing page, pricing-free info, docs pages
│   │   ├── (auth)/                      # login, signup, reset, verify
│   │   ├── (dashboard)/
│   │   │   ├── org/[orgSlug]/
│   │   │   │   ├── projects/
│   │   │   │   ├── projects/[projectSlug]/issues/
│   │   │   │   ├── projects/[projectSlug]/issues/[issueId]/
│   │   │   │   ├── projects/[projectSlug]/releases/
│   │   │   │   ├── projects/[projectSlug]/alerts/
│   │   │   │   ├── settings/            # org settings, members, audit log
│   │   │   ├── settings/                # user settings
│   │   │   ├── notifications/
│   │   ├── api/v1/                      # route handlers implementing section 13
│   ├── components/
│   │   ├── ui/                          # shared design-system primitives (button, input, card, etc.)
│   │   ├── issues/                      # issue list, issue detail, stack trace viewer
│   │   ├── dashboard/                   # charts, analytics widgets
│   │   ├── notifications/
│   │   ├── ai/                          # AI explanation/fix-suggestion panels
│   ├── lib/
│   │   ├── auth/                        # session, RBAC helpers, password hashing
│   │   ├── db/                          # DB client, query helpers
│   │   ├── validators/                  # shared Zod (or equivalent) schemas, client+server
│   │   ├── ingestion/                   # fingerprinting, grouping logic
│   │   ├── ai/                          # LLM client, prompt templates, redaction pass
│   │   ├── notifications/               # delivery (in-app, email)
│   │   ├── audit/                       # audit log writer helper (used inside mutation transactions)
│   ├── server/                          # server actions / business logic invoked by API routes
│   └── types/                           # shared TypeScript types generated from/aligned with the schema
├── sdk/
│   └── js/                              # reference JS/Node SDK: captureException, init, release/env config
├── tests/
│   ├── unit/
│   └── e2e/
├── .env.example
├── .gitignore
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

**Rationale:** The `(dashboard)` route group isolates authenticated app UI from the `(marketing)` and `(auth)` groups so layouts (nav, sidebar) don't leak into public pages. `lib/ingestion`, `lib/ai`, and `lib/audit` are isolated because they encode the most business-critical, most-tested logic in the system (grouping correctness, AI redaction, audit completeness) and should not be scattered inside route handlers. The `sdk/` directory is a separately publishable package, kept out of `src/` so it can be versioned and distributed independently of the web app.

---

## 15. Dashboard Planning

**Default landing view (org-level, all projects):**

- Top summary row: total unresolved issues, events in last 24h, active alert rules, orgs' resolution rate this week.
- Primary chart: error volume over time (stacked by project or single-project when scoped), default range last 24h, switchable to 7d/30d.
- "Needs attention" list: top 5 issues by recent occurrence spike, each row showing title, project, occurrence count, first/last seen, assignee avatar.
- "Assigned to me" quick-filter shortcut.

**Project-scoped dashboard:**

- Same volume chart, scoped to the project.
- Breakdown by environment (donut/bar) and by release (table with delta vs. prior release).
- Top issues table with inline status/assignee quick actions.

**Issue list view:**

- Left: filter sidebar (status, level, environment, release, assignee) with counts per filter value.
- Top: search bar (debounced) + sort control (last seen, first seen, occurrence count, priority).
- Table: title, level badge, status badge, occurrence count, affected users, assignee avatar, last seen (relative time).
- Empty states: "no issues match these filters" (with reset) vs. "no data yet" (with SDK install CTA), per section 10.14/10.16 requirements.

**Issue detail view:**

- Header: title, status dropdown, assignee picker, level/environment/release badges.
- Left/main column: Stack Trace tab (default), Occurrences tab (timeline + table), Tags/Context tab.
- Right sidebar: AI Explanation panel, AI Fix Suggestion panel (collapsed by default, expand on demand), Comments feed, Activity feed.

**Design principle applied throughout:** every async view resolves to loading (skeleton matching final layout) / empty / error / success, per the platform-wide functional requirement — no view in this dashboard is exempt.

---

## 16. Authentication Flow

**Signup (email/password):**

1. Client submits email + password to `/auth/signup`.
2. Server validates, hashes password with Argon2id, creates User (email_verified_at = null), sends verification email with a signed, expiring token.
3. Client is shown a "check your email" state; write actions remain blocked until verification.

**Email verification:**

1. User clicks verification link → `/auth/verify-email?token=...`.
2. Server validates token (signature + expiry + single-use), sets email_verified_at, redirects to onboarding (create/join organization).

**Login (email/password):**

1. Client submits credentials to `/auth/login`.
2. Server verifies password hash, checks rate limit, issues a new session (httpOnly, Secure, SameSite=Lax cookie), rotates session ID.
3. Client receives current user + memberships and redirects to the dashboard (or organization creation if none exist).

**OAuth login (Google/GitHub):**

1. Client hits `/auth/oauth/:provider/start`, redirected to provider consent screen.
2. Provider redirects back to `/auth/oauth/:provider/callback` with an auth code.
3. Server exchanges code for provider profile, finds or creates a User + OAuthIdentity (linking to an existing email-verified account if the email matches, after appropriate verification), issues session.

**Password reset:**

1. User requests reset with email → server always responds with a generic success message (no enumeration) and, if the account exists, emails a single-use, short-TTL token.
2. User submits new password with the token → server validates token, updates password_hash, invalidates all other active sessions, logs the action in the audit trail as a security-relevant event.

**Session lifecycle:**

- Session ID rotates on login and on any privilege change (role update).
- Every request re-validates the session against the server-side session store/table — a revoked or expired session is rejected even if the cookie is still present client-side.
- Logout revokes the current session server-side, not just clears the cookie.

**Authorization layer (applied on every request, independent of the above):**

- Session resolves to a User → request's target organization/project resolves the User's Membership → role is checked against the permission matrix (section 10.4) in server-side middleware before any handler logic executes. The client-submitted role, if any, is never trusted.

---

## 17. UI/UX Planning

ErrorNest's UI follows the restrained, high-density aesthetic appropriate for a monitoring tool used many times a day — closer to Linear/Stripe than to a marketing site.

- **Spacing/type/radius/motion:** follow the 4px spacing scale (8px default rhythm), 12/14/16/20/24/32/48px type scale (body 16px/1.5 line-height), 8px base radius (6px inputs, 12px cards/modals), and 150–250ms ease-out motion on state changes only, honoring `prefers-reduced-motion`.
- **Color:** 3 neutral grays + 1 accent color, with level badges (error=red, warning=amber, info=blue) as the only additional semantic color usage, kept desaturated enough to pass WCAG AA against both light and dark backgrounds.
- **Typography:** Inter or Geist Sans for UI/body; Geist Mono/JetBrains Mono for stack traces, occurrence counts, and other numeric/code data — monospace is functionally important here, not decorative, since stack trace alignment matters for readability.
- **Density:** the issue list is a data-dense table (not cards) by default, since the target users (section 9) triage many issues quickly; a density toggle is a reasonable P2 addition.
- **All four states designed before styling:** every list/detail view has explicit loading (skeleton matching final layout), empty (with CTA), error (actionable message + retry), and success designs, per the platform-wide functional requirement.
- **Keyboard-first:** Cmd/Ctrl+K command palette covering navigation and core actions (resolve, assign, search); `j`/`k` row navigation in the issue list; `/` focuses search; Esc closes modals/panels; every control has a visible focus ring.
- **Dark mode:** designed (not inverted) — elevated surfaces via lighter grays rather than shadows, desaturated accent, "white" text capped near 87% opacity; system-aware with no flash on load.
- **AI panels are visually distinct:** the AI Explanation and AI Fix Suggestion panels use a subtly different surface treatment (e.g., a left accent bar or distinct background tint) and persistent "AI-generated" labeling so they are never confused with human-authored content, consistent with the module's acceptance criteria.
- **Accessibility:** WCAG 2.1 AA baseline — 4.5:1 body contrast, 3:1 large text/icons, semantic HTML landmarks, ARIA labels on icon-only controls, modal focus traps, full keyboard operability of every flow including the command palette and issue triage actions.
- **Responsiveness:** mobile-first from 320px; the issue table collapses to a card layout below the `md` breakpoint; touch targets ≥44px; no horizontal scroll at any breakpoint.

---

## 18. Development Milestones

Milestones are scoped as vertical slices (schema → endpoint → screen) per milestone, consistent with an AI-pair-programming workflow of small, reviewable increments rather than monolithic generations.

**M0 — Foundations (Days 1–2)**
Repo scaffold, CI pipeline (lint/typecheck/test on push), base folder structure, deployed "hello world" to production hosting on day one, database connection + first migration (User, Session, Organization, Membership).

**M1 — Authentication & Organizations (Days 2–4)**
Signup/login/logout, email verification, password reset, OAuth (Google/GitHub), organization creation, invites, member management, RBAC middleware, session revocation UI.

**M2 — Projects, API Keys, Ingestion (Days 4–6)**
Project CRUD, API key issuance/rotation/revocation, ingestion endpoint, payload validation, reference JS SDK, fingerprinting + issue grouping logic, environment auto-creation.

**M3 — Issue Management (Days 6–8)**
Issue list (search, filter, sort, pagination), issue detail, stack trace viewer, status transitions (including auto-reopen), assignment, comments with @mentions.

**M4 — Releases, Alerts, Notifications (Days 8–10)**
Release tracking + comparison view, alert rule CRUD, async alert evaluation pipeline, in-app notification center, email delivery, notification preferences.

**M5 — Analytics Dashboard (Days 10–11)**
Volume time series, top issues, environment/release breakdowns, resolution metrics, aggregation strategy implementation (pre-aggregated rollups, not raw scans).

**M6 — AI Features (Days 11–12)**
Server-side LLM integration, redaction pass, AI explanation generation + caching, AI fix suggestion generation, feedback capture, rate limiting per issue/user.

**M7 — Audit Log, Settings, Polish (Days 12–13)**
Audit log writer wired into every sensitive mutation from M1–M6, org-wide audit log screen, user settings, organization settings/danger zone, empty/loading/error state pass across all screens, accessibility and keyboard-navigation pass.

**M8 — SEO, Deployment Hardening, Docs, Submission Prep (Day 13–14)**
Meta tags/OG images/sitemap/robots.txt/JSON-LD, Lighthouse pass (≥90 all categories), production env var audit (no leaked secrets), README/architecture docs/case study, demo video, tagged v1.0.0 release.

---

## 19. Risks

| Risk                                                                                                      | Impact                                                                            | Likelihood                                                | Mitigation                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Issue-grouping fingerprint algorithm produces poor grouping on minified/production JS without source maps | High — undermines the core value prop (dedup)                                     | Medium                                                    | Document as a known MVP limitation; provide manual merge/split; plan source-map support as a near-term follow-up                                                     |
| AI provider latency/downtime blocks perceived product quality                                             | Medium                                                                            | Medium                                                    | Async, non-blocking AI calls; explicit loading/error/retry states; core triage flow never depends on AI availability                                                 |
| Ingestion burst (crash loop) overwhelms the pipeline                                                      | High — could cause data loss or downtime                                          | Medium                                                    | Per-key rate limiting, async processing queue, load testing before submission                                                                                        |
| Sensitive data (PII/secrets) accidentally captured in stack traces sent to a third-party LLM              | High — privacy/compliance exposure                                                | Medium                                                    | Best-effort redaction pass before any AI call; document as best-effort, not guaranteed, in user-facing copy                                                          |
| RBAC bypass via client-trusted role data                                                                  | High — full multi-tenant data breach                                              | Low (if server-side enforcement is followed consistently) | Centralize authorization in shared middleware/helpers, never per-route ad hoc checks; add integration tests specifically for cross-org/cross-role access attempts    |
| Analytics queries scanning raw event tables degrade under load                                            | Medium                                                                            | Medium                                                    | Pre-aggregated rollups per section 12.3/15; load-test with synthetic high-volume data before submission                                                              |
| Scope creep given the breadth of 24 modules within a 7–14 day timebox                                     | High — risk of shipping many half-finished modules instead of fewer polished ones | High                                                      | Strict adherence to MVP scope (section 7); P1/P2 items explicitly deferred; milestone-based delivery with a working, deployed increment at the end of each milestone |
| Timezone/clock-skew bugs in event ordering and analytics windows                                          | Medium                                                                            | Medium                                                    | Server-received timestamp is authoritative everywhere; client timestamp stored but never used for ordering or windowing logic                                        |

---

## 20. Documentation Required

- **README.md** — pitch, screenshot/GIF, live demo link, demo login, quick start, env var table, architecture summary link, per the program's README template.
- **docs/architecture.md** — data model diagram (entities/relationships from section 12), authentication/authorization summary paragraph, notable trade-offs (e.g., fingerprint fallback strategy, async alert evaluation).
- **docs/api.md** — the endpoint reference from section 13, kept in sync with actual implementation; OpenAPI file if time allows.
- **CONTRIBUTING.md** — local setup, branch naming, commit style, test/lint commands.
- **CHANGELOG.md** — Keep a Changelog format, updated per milestone/release.
- **LICENSE** — MIT.
- **Case study** (portfolio deliverable) — problem, approach, key decisions/trade-offs (e.g., fingerprinting strategy, AI redaction approach), result, what would be built next.
- **Inline documentation policy** — comments explain _why_ a non-obvious decision was made (e.g., why events are denormalized with project_id, why alert cooldowns use a sliding window), not _what_ the code does; good naming carries the "what."

---

## 21. Development Roadmap

**Pre-MVP (this specification):** finalize schema and API surface, get sign-off equivalent (self-review against this document) before any implementation begins.

**MVP (Milestones M0–M8, ~14 days):** as detailed in section 18 — ships every item in section 7.

**Post-MVP, near-term (first month after submission):**

- Source-map support for accurate JS/TS stack traces and improved fingerprinting.
- Environment name merge/alias tooling to fix the typo'd-environment edge case noted in section 10.11.
- Conditional/expiring "ignore" rules for issues.
- Slack/Teams alert delivery channel.

**Post-MVP, mid-term:**

- Native mobile crash SDKs (iOS/Android).
- Basic performance/latency monitoring module (opt-in, clearly separated from error monitoring).
- Usage-based billing and subscription tiers.
- SSO/SAML for enterprise organizations.

**Post-MVP, long-term / exploratory:**

- AI auto-fix PR creation (opening a pull request with a suggested patch against a connected repository), evolving AI Fix Suggestions from "reviewable text" to "reviewable PR" — deliberately deferred until the reviewability and trust model (human-in-the-loop review) is well-proven in the current suggestion-only form.
- Self-hosted/on-prem deployment option.
- Multi-region data residency.
