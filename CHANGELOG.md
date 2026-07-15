# Changelog

All notable changes to ErrorNest are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — M8: AI Assistant

### Added
- **AI Error Explanation** — `POST /api/v1/issues/:issueId/ai/explain`  
  Server-side Gemini integration that analyzes the issue's stack trace and error message to produce a structured root-cause explanation. Responses are cached by SHA-256 fingerprint; `?force=true` bypasses cache.
- **AI Fix Suggestion** — `POST /api/v1/issues/:issueId/ai/suggest-fix`  
  Generates a reviewable, diff-style code fix suggestion with rationale and clarifying questions. Clearly marked "not automatically applied."
- **AI Feedback** — `POST /api/v1/ai-results/:resultId/feedback`  
  Records `HELPFUL` / `NOT_HELPFUL` feedback on any AI result. Idempotent.
- **PII Redaction** — `src/lib/services/ai/redact.ts`  
  Best-effort pattern-based scrubbing of emails, JWTs, bearer tokens, API keys, credit cards, AWS keys, and private-key blocks before any content is sent to the LLM provider.
- **Payload Truncation** — Stack traces exceeding 8 000 characters are truncated server-side; UI displays a truncation notice.
- **Rate Limiting** — 10 AI generations per user per rolling hour, enforced via `db.aiResult.count` query. Returns 429 with `Retry-After: 3600`.
- **Graceful Degradation** — If `GEMINI_API_KEY` is missing or the provider fails, routes return 502; issue triage flow is never blocked.
- **AiPanel UI** — Collapsible Explain / Suggest-Fix panels in the issue detail right sidebar with idle, loading, error, success states, copy button, regenerate button, and thumbs-up/down feedback.
- **@google/generative-ai** SDK added as a runtime dependency.

### Changed
- `IssueDetailClient.tsx` — Added AI Assistant section in the right column sidebar above the triage box.

### Environment Variables
- `GEMINI_API_KEY` — Required for AI features. Already documented in `.env.example`.
- `AI_DAILY_LIMIT` — Documented limit (currently not server-enforced at org level; per-user hourly limit is enforced via DB).

---

## [M7] — Audit Log & Settings

### Added
- Organization settings (rename, danger-zone deletion)
- User profile settings (display name, session revocation)
- Security Audit Log viewer (paginated, filterable, JSON diff modal)
- APIs: `GET/PATCH /me`, `GET/DELETE /me/sessions/:id`, `GET /organizations/:orgId/audit-log`

---

## [M6] — Alerts & Notifications

### Added
- Alert engine: new-issue, regression, spike detection with cooldown
- In-app notification center
- Async email worker (Resend)
- Notification preferences per user

---

## [M5] — Issue Detail & Collaboration

### Added
- Collapsible stack trace viewer with source context
- Event occurrence navigation
- Comment and mention system (Markdown support)
- Activity timeline
- Device/request context parsing

---

## [M4] — Issue Grouping & Management

### Added
- Stack normalization and deterministic fingerprinting
- Issue CRUD, status transitions, assignment
- Search/filter/sort with cursor pagination
- Auto-reopen on regression

---

## [M3] — Ingestion & JS SDK

### Added
- Event ingestion endpoint
- Idempotency key support
- Project rate limiting
- Queue job processing
- Minimal JS/Node SDK

---

## [M2] — Projects & API Keys

### Added
- Project CRUD
- Show-once API keys with rotate/revoke
- SDK setup screen

---

## [M1] — Auth & Organization Shell

### Added
- Email/password and OAuth authentication
- Email verification and password reset
- Secure sessions
- Organization creation and membership roles
- Authenticated dashboard shell

---

## [M0] — Repository & CI

### Added
- Next.js TypeScript strict scaffold
- Prisma and PostgreSQL connection
- ESLint, Prettier, Vitest, Playwright
- GitHub Actions CI
- `.env.example`
- Health route `/api/health`
- Initial README
