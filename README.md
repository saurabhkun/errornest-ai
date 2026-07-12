# ErrorNest

AI-Powered Error Monitoring & Debugging Platform.

ErrorNest is a multi-tenant SaaS platform that helps software teams capture, group, triage, and resolve application errors in production and staging environments.

## 🚀 Key Features

- **Real-time Ingestion:** High-throughput endpoint accepting events from client SDKs.
- **Deterministic Grouping:** Intelligent fingerprinting that normalizes errors and groups duplicates into issues.
- **AI Diagnostics:** Integrates with the Gemini API to explain exception contexts and suggest code fixes.
- **Collaboration:** Assign issues, write comments, and track history.
- **Alerting Engine:** Get notified immediately on new issues, spikes, or regressions.

---

## 🛠️ Technology Stack

| Layer              | Choice                           |
| ------------------ | -------------------------------- |
| **Framework**      | Next.js 16 (App Router)          |
| **Language**       | TypeScript strict mode           |
| **UI Styling**     | Tailwind CSS v4, shadcn/ui       |
| **Database**       | PostgreSQL, Prisma ORM           |
| **Authentication** | Auth.js (NextAuth)               |
| **Task Queue**     | Upstash Redis                    |
| **Email**          | Resend                           |
| **AI Provider**    | Gemini API                       |
| **Testing**        | Vitest (Unit) & Playwright (E2E) |

---

## 📁 Project Directory Structure

```text
errornest/
├── prisma/               # Prisma Database Schema and Configurations
├── public/               # Static Assets
├── src/
│   ├── app/              # Next.js App Router (Pages & API Routes)
│   │   ├── (marketing)/  # Landing page and documentation
│   │   ├── (auth)/       # Sign-in/Sign-up/Reset (to be implemented)
│   │   └── api/          # REST Endpoint APIs (health, ingestion, auth)
│   ├── components/       # React UI Components (primitives, panels)
│   ├── lib/              # Business Logic Core (db client, auth config)
│   │   ├── auth/         # NextAuth configuration & helpers
│   │   └── db/           # Prisma client provider
│   └── types/            # Type definitions
├── tests/                # Testing Suite
│   ├── e2e/              # Playwright End-to-End tests
│   └── unit/             # Vitest Unit tests
├── .env.example          # Template environment configurations
├── playwright.config.ts  # Playwright configuration
├── tsconfig.json         # TypeScript configuration
├── vitest.config.ts      # Vitest configuration
└── README.md             # This document
```

---

## ⚙️ Local Development Setup

### 1. Clone & Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example variables file:

```bash
cp .env.example .env
```

Ensure you set valid credentials for PostgreSQL, NextAuth, Resend, and Gemini.

### 3. Initialize the Database

Prisma 7 decouples the connection url into `prisma.config.ts`. To apply migrations:

```bash
npx prisma generate
```

### 4. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the landing page.

---

## 🧪 Testing Suite

We use **Vitest** for quick unit/integration tests and **Playwright** for complete end-to-end user flows.

### Run Unit Tests (Vitest)

```bash
npm run test
```

### Run E2E Tests (Playwright)

```bash
npx playwright install --with-deps  # First time setup
npm run test:e2e
```

### Run Linting & Typechecking

```bash
npm run lint
npm run typecheck
```

---

## 📄 License

MIT
