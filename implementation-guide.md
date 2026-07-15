# ErrorNest — Antigravity Implementation Guide

> Use `plan.md`, `architecture.md`, `database-schema.md`, `ui-design-system.md`, and `api-spec.md` as the source of truth.

## Operating Rules for Claude

1. Work on one milestone only.
2. Before coding, state affected files and acceptance criteria.
3. Schema and shared types come before feature UI.
4. Add tests in the same milestone.
5. Run lint, typecheck, tests, and production build before stopping.
6. Never use `any`.
7. Never expose secrets to client code.
8. Do not silently replace requirements.
9. Record important decisions in `docs/decisions.md`.
10. Stop after each milestone for human review.

## Milestone Order

### M0 — Repository and CI

- Next.js TypeScript strict scaffold
- Tailwind and shadcn/ui
- Prisma and PostgreSQL connection
- ESLint, Prettier, Vitest, Playwright
- GitHub Actions
- `.env.example`
- Vercel-ready health route
- initial README

### M1 — Auth and Organization Shell

- email/password and OAuth
- verification and reset
- secure sessions
- organization creation
- membership roles
- authenticated shell
- RBAC tests

### M2 — Projects and API Keys

- project CRUD
- show-once API keys
- rotate and revoke
- audit logging
- SDK setup screen

### M3 — Ingestion and JS SDK

- event schema
- ingestion endpoint
- idempotency
- project rate limit
- queue job
- minimal JS/Node SDK
- “send test error” flow

### M4 — Grouping and Issues

- stack normalization
- deterministic fingerprinting
- issue create/update
- issue list
- search/filter/sort/cursor pagination
- issue status and assignment
- auto-reopen regression

### M5 — Issue Detail and Collaboration

- stack trace viewer
- occurrences
- tags/context
- comments and mentions
- activity timeline
- responsive mobile view

### M6 — Alerts and Notifications

- new issue and regression alerts
- spike alerts
- cooldown
- in-app notification center
- email worker
- preferences

### M7 — Analytics and Releases

- release CRUD
- environment management
- hourly rollups
- dashboard charts
- release comparison

### M8 — AI Assistant

- input redaction
- provider adapter
- explanation
- fix suggestion
- cache and feedback limits
- graceful provider failure

### M9 — Team, Settings, Audit

- invite flow
- member role changes/removal
- user security settings
- organization settings
- audit log UI
- session revocation

### M10 — Polish and Launch

- all four states
- accessibility pass
- SEO and JSON-LD
- docs pages
- demo seed
- README screenshots
- Lighthouse and E2E
- release v1.0.0

## First Prompt to Run in Antigravity

```text
Read every Markdown file in the repository root and docs directory. Treat them as the approved source of truth.

Do not write feature code yet.

Create a concise
- rateimplementation checklist for Milestone M0 only. List:
- files to create or change,
- dependencies,
- commands,
- acceptance criteria,
- tests,
- risks and assumptions.

Check for contradictions between the documents. Resolve none silently: list each contradiction and recommend the smallest decision.

After producing the checklist, stop and wait for approval.
```

## Prompt Template for Each Milestone

```text
Implement Milestone <NUMBER AND NAME> using the approved documentation.

Before changing files:
1. Restate the milestone acceptance criteria.
2. List files to create/change.
3. State assumptions.

Then implement only this milestone.

Requirements:
- strict TypeScript, no any,
- server-side authorization,
- shared Zod validation,
- tests for happy path, boundary cases, and likely failures,
- loading, empty, error, and success states where UI is added,
- update README/CHANGELOG/docs when the milestone changes setup or architecture,
- run lint, typecheck, unit tests, relevant E2E tests, and production build,
- fix all failures before stopping.

At the end, provide:
- changed files,
- commands run and results,
- unresolved risks,
- suggested conventional commit message.

Do not begin the next milestone.
```
