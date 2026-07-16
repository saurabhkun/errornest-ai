# ErrorNest

**AI-Powered Error Monitoring & Debugging Platform**

ErrorNest is a production-ready, multi-tenant SaaS platform that captures, groups, triages, and resolves application errors using deterministic fingerprinting and context-aware AI. Built with Next.js 16, TypeScript strict mode, and PostgreSQL.

---

## ✨ Key Features

### Error Monitoring

- **Real-time Event Ingestion** — High-throughput endpoint accepting events from client SDKs with idempotency and rate limiting.
- **Deterministic Grouping** — Stack trace normalization and SHA-256 fingerprinting combines duplicate errors into clean issues.
- **Issue Lifecycle** — Full CRUD with status transitions (Unresolved → Resolved → Reopened), assignment, and auto-regression detection.

### AI Assistant

- **Error Explanations** — Server-side Gemini integration produces structured root-cause explanations.
- **Fix Suggestions** — Diff-style code fix suggestions with rationale, clearly marked as suggestions.
- **PII Redaction** — Automatic scrubbing of emails, tokens, API keys, and credit cards before any AI provider call.
- **Graceful Degradation** — AI features fail silently; issue triage is never blocked.

### Alerting & Notifications

- **Alert Engine** — New issue, regression, and spike detection with sliding window thresholds and cooldown logic.
- **Notification Center** — In-app notification feed with read/unread state.
- **Email Worker** — Async email delivery via Resend.
- **User Preferences** — Per-notification-type in-app and email toggles.

### Analytics & Releases

- **Release CRUD** — Track deployments with version, commit SHA, and environment.
- **Hourly Rollups** — Efficient aggregation engine for trend charts and KPI cards.
- **Dashboard Charts** — Error trends, release health, environment breakdowns, affected users.
- **Release Comparison** — Side-by-side error rate comparison between versions.

### Team Management

- **Invite System** — Invite by email with role selection (Admin, Member, Viewer), 7-day expiry, duplicate protection.
- **RBAC** — Owner, Admin, Member, Viewer roles with strict privilege escalation prevention.
- **Member Management** — Role changes, member removal with last-owner protection.
- **Audit Logging** — Every organization-changing action creates an immutable AuditLog entry.

### Settings & Security

- **Organization Settings** — Rename, slug update, danger-zone deletion.
- **User Profile** — Display name update, active session management, session revocation.
- **Security Audit Log** — Paginated, filterable log viewer with JSON diff modal.
- **Notification Preferences** — Per-type in-app and email configuration.

---

## 🏗 Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   JS/Node    │────▶│  Ingestion   │────▶│  Grouping    │
│     SDK      │     │   Endpoint   │     │   Engine     │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌──────────────┐     ┌───────▼──────┐
                     │    Alert     │◀────│   Issue      │
                     │   Engine    │     │   Store      │
                     └──────┬───────┘     └──────────────┘
                            │
               ┌────────────┼────────────┐
               ▼            ▼            ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ In-App   │  │  Email   │  │   AI     │
        │  Notif   │  │  Worker  │  │ Explain  │
        └──────────┘  └──────────┘  └──────────┘
```

---

## 🛠️ Technology Stack

| Layer              | Choice                           |
| ------------------ | -------------------------------- |
| **Framework**      | Next.js 16 (App Router)          |
| **Language**       | TypeScript strict mode           |
| **UI Styling**     | Tailwind CSS v4, shadcn/ui       |
| **Database**       | PostgreSQL (Neon), Prisma ORM    |
| **Authentication** | Auth.js (NextAuth v5)            |
| **Task Queue**     | Upstash Redis                    |
| **Email**          | Resend                           |
| **AI Provider**    | Google Gemini                    |
| **Testing**        | Vitest (Unit) & Playwright (E2E) |
| **CI/CD**          | GitHub Actions                   |
| **Hosting**        | Vercel-ready                     |

---

## 📁 Project Structure

```text
errornest/
├── prisma/                  # Prisma schema, seed script, config
├── public/                  # Static assets, robots.txt, manifest
├── packages/sdk/            # @errornest/js SDK package
├── src/
│   ├── app/
│   │   ├── api/             # REST API routes
│   │   │   ├── health/      # Health check endpoint
│   │   │   └── v1/          # Versioned API (ingest, issues, alerts, etc.)
│   │   ├── app/[orgSlug]/   # Authenticated dashboard pages
│   │   │   ├── dashboard/   # Analytics dashboard
│   │   │   ├── projects/    # Project management + issue detail
│   │   │   ├── releases/    # Release tracking
│   │   │   └── settings/    # Org, profile, team, audit, notifications
│   │   ├── layout.tsx       # Root layout with SEO metadata
│   │   ├── page.tsx         # Public landing page
│   │   └── sitemap.ts       # Dynamic sitemap generation
│   ├── components/          # Shared UI components
│   │   ├── ai/              # AI assistant panel
│   │   ├── dashboard/       # Sidebar, Topbar
│   │   └── ui/              # shadcn/ui primitives
│   └── lib/
│       ├── auth/            # NextAuth config & session helpers
│       ├── db/              # Prisma client
│       ├── queue/           # Alert queue & Redis client
│       ├── services/        # Business logic
│       │   ├── ai/          # Gemini adapter, redaction, fingerprinting
│       │   ├── alerts/      # Rule evaluator, spike detector, dispatchers
│       │   ├── analytics/   # Rollup manager
│       │   ├── audit/       # Audit log service
│       │   └── grouping.ts  # Fingerprint engine
│       └── utils/           # Audit, keys, rate limiting
├── tests/
│   ├── e2e/                 # Playwright specs
│   └── unit/                # Vitest unit tests
├── docs/                    # Architecture, API spec, DB schema, UI design
│   └── screenshots/         # Application screenshots (placeholder)
└── .github/workflows/       # CI pipeline
```

---

## ⚙️ Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL (or Neon serverless)
- (Optional) Upstash Redis, Resend API key, Gemini API key

### 1. Clone & Install

```bash
git clone https://github.com/saurabhkun/errornest-ai.git
cd errornest-ai
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in the required values:

| Variable             | Description                           | Required |
| -------------------- | ------------------------------------- | -------- |
| `DATABASE_URL`       | PostgreSQL connection string          | ✅       |
| `AUTH_SECRET`        | NextAuth session secret               | ✅       |
| `AUTH_URL`           | Application URL                       | ✅       |
| `AUTH_GOOGLE_ID`     | Google OAuth client ID                | Optional |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret            | Optional |
| `AUTH_GITHUB_ID`     | GitHub OAuth client ID                | Optional |
| `AUTH_GITHUB_SECRET` | GitHub OAuth client secret            | Optional |
| `RESEND_API_KEY`     | Resend email API key                  | Optional |
| `EMAIL_FROM`         | Sender email address                  | Optional |
| `GEMINI_API_KEY`     | Google Gemini API key for AI features | Optional |
| `AI_DAILY_LIMIT`     | AI generation limit per user          | Optional |
| `APP_URL`            | Public-facing URL                     | Optional |
| `CRON_SECRET`        | Secret for scheduled job endpoints    | Optional |

### 3. Initialize Database

```bash
npx prisma generate
npx prisma db push     # or npx prisma migrate dev
```

### 4. Seed Demo Data (Optional)

```bash
npx prisma db seed
```

Creates a demo organization with 2 projects, 15 issues, 220+ events, alert rules, AI results, and analytics rollups.

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🧪 Testing

### Unit Tests (Vitest)

```bash
npm run test           # Run all unit tests
npm run test:watch     # Watch mode
```

**103 unit tests** covering: ingestion, grouping, comments, alerts, analytics, AI, audit, team management, releases, and SDK.

### E2E Tests (Playwright)

```bash
npx playwright install chromium --with-deps  # First time
npm run test:e2e
```

**17 E2E specs** covering: health endpoint, projects, issues, releases, analytics, alerts, AI panel, settings, and team management.

### Linting & Type Checking

```bash
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run format         # Prettier
```

---

## 🚀 API Overview

All API routes are versioned under `/api/v1/`.

| Category      | Endpoints                                                               |
| ------------- | ----------------------------------------------------------------------- |
| **Ingest**    | `POST /ingest/events`                                                   |
| **Issues**    | `GET/PATCH /issues`, `POST /issues/bulk`, status, assign, events        |
| **Comments**  | `GET/POST /issues/:id/comments`, `PATCH/DELETE /comments/:id`           |
| **AI**        | `POST /issues/:id/ai/explain`, `/ai/suggest-fix`, feedback              |
| **Alerts**    | `GET/POST /projects/:id/alert-rules`, `PATCH/DELETE /:ruleId`           |
| **Analytics** | overview, trends, releases, issues, environments                        |
| **Releases**  | `GET/POST /projects/:id/releases`, compare                              |
| **Team**      | memberships (list, update role, remove), invites (list, create, revoke) |
| **Settings**  | `GET/PATCH /me`, sessions, notification preferences, org CRUD           |
| **Audit**     | `GET /organizations/:id/audit-log`                                      |
| **Health**    | `GET /api/health`                                                       |

---

## 📸 Screenshots

> Screenshots should be placed in `docs/screenshots/` and referenced here.
>
> Recommended captures:
>
> - `docs/screenshots/landing.png` — Landing page
> - `docs/screenshots/dashboard.png` — Analytics dashboard
> - `docs/screenshots/issues.png` — Issues list view
> - `docs/screenshots/issue-detail.png` — Issue detail with AI panel
> - `docs/screenshots/team.png` — Team management
> - `docs/screenshots/settings.png` — Organization settings
> - `docs/screenshots/alerts.png` — Alert rules configuration

---

## 🏷 Deployment

ErrorNest is optimized for Vercel but can run anywhere Node.js 20+ is supported.

```bash
npm run build          # Production build
npm run start          # Start production server
```

### Vercel

1. Connect your GitHub repository to Vercel.
2. Set environment variables in the Vercel dashboard.
3. Deploy — Prisma client is generated during the build step.

---

## 📄 License

MIT

---

**ErrorNest v1.0.0** — Built with ❤️ for developers who need calm during failure.
