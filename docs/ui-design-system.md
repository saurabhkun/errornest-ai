# ErrorNest — UI/UX and Design System Specification

## 1. Product Design Goal

ErrorNest should feel calm during failure. The interface must reduce panic, not amplify it.

Inspiration may be taken from the information hierarchy of Linear, Sentry, Stripe, and Vercel, but the visual identity, layout, copy, and components must remain original.

## 2. Design Principles

1. Show what needs attention first.
2. Use density deliberately; do not turn every value into a card.
3. Prefer hierarchy through typography and spacing over borders.
4. Make empty, loading, error, and success states first-class.
5. Keep dangerous actions visually isolated.
6. Make keyboard use equal to mouse use.
7. AI output must always be clearly identified and reviewable.

## 3. Visual Tokens

### Typography

- UI/body: Geist Sans or Inter
- Code/data: Geist Mono or JetBrains Mono
- Type scale: 12, 14, 16, 20, 24, 32, 48 px
- Body: 14–16 px, line-height 1.5
- Page title: 24–32 px

### Spacing

4 px base scale:
`4, 8, 12, 16, 24, 32, 48, 64`

### Radius

- inputs: 6 px
- buttons/cards: 8 px
- dialogs: 12 px
- pills: full

### Width

- app shell max: 1440 px
- readable text: 680 px
- sidebar: 240 px expanded, 64 px collapsed

### Color roles

- neutral canvas/surfaces/text/borders,
- one brand accent,
- red only for fatal/error/destructive,
- amber for warning/regression,
- green for resolved/success,
- blue or accent for informational and selected states.

Do not use gradients in the authenticated dashboard.

## 4. App Shell

### Sidebar

- organization switcher,
- Dashboard,
- Projects,
- Issues,
- Alerts,
- Releases,
- Team,
- Settings,
- collapse control.

### Topbar

- project selector,
- global search,
- command palette hint,
- notification bell,
- user menu.

Mobile: sidebar becomes a drawer; topbar retains project selector and notifications.

## 5. Required Routes

### Public

- `/`
- `/features`
- `/docs/getting-started`
- `/docs/sdk`
- `/login`
- `/signup`
- `/forgot-password`
- `/verify-email`

### Authenticated

- `/app/[orgSlug]/dashboard`
- `/app/[orgSlug]/projects`
- `/app/[orgSlug]/projects/[projectSlug]`
- `/app/[orgSlug]/projects/[projectSlug]/issues`
- `/app/[orgSlug]/projects/[projectSlug]/issues/[issueId]`
- `/app/[orgSlug]/projects/[projectSlug]/alerts`
- `/app/[orgSlug]/projects/[projectSlug]/releases`
- `/app/[orgSlug]/notifications`
- `/app/[orgSlug]/settings/team`
- `/app/[orgSlug]/settings/audit`
- `/settings/profile`
- `/settings/security`
- `/settings/notifications`

## 6. Dashboard

Above the fold:

- unresolved issues,
- events in last 24h,
- regressions,
- median resolution time,
- event-volume line chart,
- needs-attention issue list.

Each metric deep-links to a filtered issue list.

Empty dashboard:

- SDK installation CTA,
- copyable setup snippet,
- “Send test error” action,
- link to docs.

## 7. Issue List

Desktop table columns:

- level,
- title/error type,
- project,
- status,
- occurrences,
- affected users,
- assignee,
- last seen.

Controls:

- debounced search,
- status,
- level,
- environment,
- release,
- assignee,
- date range,
- sort,
- saved URL state,
- bulk selection where appropriate.

Mobile: each issue becomes a compact card with title, level, count, status, and last seen. No horizontal scrolling.

## 8. Issue Detail

Header:

- error type and message,
- project/environment/release,
- status control,
- assignee,
- first/last seen,
- occurrences,
- affected users.

Tabs:

1. Stack trace
2. Occurrences
3. Context
4. Comments
5. Activity

Right rail on desktop:

- AI explanation,
- AI fix suggestion,
- tags,
- quick actions.

On mobile, right-rail content becomes accordion sections below the main content.

## 9. Stack Trace Viewer

- mono font,
- in-app frames emphasized,
- vendor frames collapsed by default,
- function name, file, line, column,
- source context where available,
- raw/pretty toggle,
- copy button,
- keyboard navigation between frames.

Never use syntax highlighting that lowers text contrast.

## 10. AI Panels

AI explanation includes:

- “AI-generated” badge,
- likely root cause,
- impact,
- evidence used,
- uncertainty note,
- helpful/not-helpful feedback,
- regenerate action.

AI fix suggestion includes:

- review warning,
- rationale,
- proposed steps or diff-style block,
- copy action,
- no apply button.

## 11. States

Every async surface must define:

- loading skeleton matching final geometry,
- first-use empty state with primary CTA,
- no-results state with reset,
- actionable error with retry,
- success feedback.

Toasts:

- success auto-dismiss around 4 seconds,
- failure persists until dismissed or retried,
- destructive actions offer undo only when technically safe.

## 12. Accessibility

- WCAG 2.1 AA.
- 4.5:1 body contrast.
- visible 2 px focus ring with offset.
- 44 × 44 px touch targets.
- semantic landmarks.
- labels for icon-only buttons.
- focus trap in dialogs.
- Esc closes dialogs/drawers.
- reduced-motion support.
- charts include textual summaries or accessible tables.

## 13. Keyboard Shortcuts

- Cmd/Ctrl + K: command palette
- `/`: focus issue search
- `j` / `k`: next/previous issue
- `e`: explain selected issue with AI
- `a`: assign selected issue
- `r`: resolve selected issue
- `?`: shortcut reference

Shortcuts must not trigger while typing in an input or editor.

## 14. Motion

- hover/press: 100–150 ms,
- drawer/dialog: 200–250 ms,
- hard maximum: 300 ms,
- motion only for state or position change,
- disabled under prefers-reduced-motion.

## 15. Marketing Page

Required sections:

- specific headline,
- short demo animation or screenshot,
- “Install SDK in minutes” flow,
- grouping explanation,
- AI debugging section,
- dashboard screenshots,
- feature summary,
- FAQ,
- open-source/GitHub link,
- final CTA.

No fake testimonials or invented customer logos.

## 16. Copy Style

- direct,
- technical but readable,
- no hype such as “revolutionary,”
- errors explain the next action,
- examples use realistic developer language.

Examples:

- Good: “This API key was revoked. Create a new key and update your SDK configuration.”
- Bad: “Oops! Something went wrong.”
