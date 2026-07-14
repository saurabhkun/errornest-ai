# ErrorNest — API Contract Specification

> Base path: `/api/v1`  
> Formats: JSON except CSV exports.  
> Authentication: session cookie for dashboard endpoints; project API key for ingestion.

## 1. Response Conventions

Successful object:

```json
{ "data": {}, "meta": {} }
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the highlighted fields.",
    "fieldErrors": {},
    "requestId": "..."
  }
}
```

Cursor list:

```json
{
  "data": [],
  "meta": {
    "nextCursor": null,
    "hasMore": false
  }
}
```

## 2. Cross-Cutting Requirements

- Zod validation for body, params, query, and environment variables.
- Maximum page size 100; default 25.
- Stable sort with ID as secondary key.
- 429 responses include `Retry-After`.
- Cross-tenant resources return 404.
- Mutations return the updated record.
- Request IDs are returned in response headers.
- State-changing operations create audit entries when required.

## 3. Auth

- `POST /auth/signup`
- `POST /auth/verify-email`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`
- `GET /auth/session`
- Auth.js OAuth routes for Google and GitHub

## 4. Organizations and Memberships

- `POST /organizations`
- `GET /organizations`
- `GET /organizations/:orgId`
- `PATCH /organizations/:orgId`
- `DELETE /organizations/:orgId`
- `GET /organizations/:orgId/members`
- `PATCH /organizations/:orgId/members/:userId`
- `DELETE /organizations/:orgId/members/:userId`
- `POST /organizations/:orgId/invites`
- `GET /organizations/:orgId/invites`
- `DELETE /organizations/:orgId/invites/:inviteId`
- `POST /invites/:token/accept`

## 5. Projects and Keys

- `POST /organizations/:orgId/projects`
- `GET /organizations/:orgId/projects`
- `GET /projects/:projectId`
- `PATCH /projects/:projectId`
- `DELETE /projects/:projectId`
- `POST /projects/:projectId/keys`
- `GET /projects/:projectId/keys`
- `POST /projects/:projectId/keys/:keyId/rotate`
- `DELETE /projects/:projectId/keys/:keyId`

Key creation/rotation responses expose the full key only once.

## 6. Event Ingestion

### `POST /ingest/events`

Headers:

- `Authorization: Bearer <project-api-key>`
- `Idempotency-Key: <optional unique value>`
- `Content-Type: application/json`

Required body:

```json
{
  "message": "Cannot read properties of undefined",
  "errorType": "TypeError",
  "level": "error",
  "environment": "production",
  "stackTrace": "..."
}
```

Optional:

- release,
- tags,
- user context,
- client timestamp,
- transaction/route,
- source context.

Response: `202 Accepted`

```json
{
  "data": {
    "eventId": "...",
    "status": "accepted"
  }
}
```

Possible errors:

- 400 malformed payload,
- 401 invalid/revoked key,
- 413 too large,
- 429 project rate limit.

## 7. Issues

- `GET /projects/:projectId/issues`
- `GET /issues/:issueId`
- `PATCH /issues/:issueId/status`
- `POST /issues/:issueId/assign`
- `POST /issues/:issueId/merge`
- `POST /issues/:issueId/split`
- `GET /issues/:issueId/events`
- `GET /issues/:issueId/activity`

List query:

- q,
- status,
- level,
- environment,
- release,
- assignee,
- from,
- to,
- sort,
- direction,
- cursor,
- pageSize.

Valid transitions:

- unresolved → resolved or ignored,
- resolved → reopened,
- reopened → resolved or ignored,
- ignored → unresolved.

A new matching event automatically changes resolved to reopened.

## 8. Comments

- `GET /issues/:issueId/comments`
- `POST /issues/:issueId/comments`
- `PATCH /comments/:commentId`
- `DELETE /comments/:commentId`

Mentioned users must belong to the organization.

## 9. Releases and Environments

- `POST /projects/:projectId/releases`
- `GET /projects/:projectId/releases`
- `GET /projects/:projectId/releases/:releaseId`
- `GET /projects/:projectId/releases/:releaseId/compare`
- `GET /projects/:projectId/environments`
- `PATCH /environments/:environmentId`

## 10. Alert Rules

- `POST /projects/:projectId/alert-rules`
- `GET /projects/:projectId/alert-rules`
- `PATCH /alert-rules/:ruleId`
- `DELETE /alert-rules/:ruleId`

Spike rule validation requires:

- thresholdCount,
- thresholdWindowSeconds,
- cooldownSeconds.

## 11. Notifications

- `GET /notifications`
- `POST /notifications/:notificationId/read`
- `POST /notifications/read-all`
- `GET /me/notification-preferences`
- `PATCH /me/notification-preferences`

## 12. AI

- `POST /issues/:issueId/ai/explain`
- `POST /issues/:issueId/ai/suggest-fix`
- `POST /ai-results/:resultId/feedback`

AI operations:

- require Member or higher,
- are rate-limited,
- reuse cached results unless forced,
- return 502 when provider unavailable,
- never block issue access.

## 13. Analytics

All analytics endpoints require `projectId` (UUID) as a query parameter. Optional query parameters include:
- `environmentId`: Filter by a specific environment.
- `period`: Filter by standard time windows (`24h`, `7d`, `30d`).
- `from` and `to`: Provide explicit RFC 3339 datetime bounds for precise queries.

Endpoints:
- `GET /api/v1/analytics/overview` - Returns high-level KPI cards (Total Events, Total Issues, Error Rate, Affected Users, New Issues Today, Regressions).
- `GET /api/v1/analytics/trends` - Returns high-performance pre-aggregated hourly rollup timeseries data (eventCount, newIssueCount, affectedUserCount).
- `GET /api/v1/analytics/releases` - Returns release health data (eventCount, newIssueCount, affectedUserCount, regressions, errorRate) for the project.
- `GET /api/v1/analytics/issues` - Returns the top frequency issues in the selected period.
- `GET /api/v1/analytics/environments` - Returns breakdown metrics for environments, browsers, operating systems, devices, and top affected users.

## 14. Settings and Audit

- `GET /me`
- `PATCH /me`
- `POST /me/change-password`
- `GET /me/sessions`
- `DELETE /me/sessions/:sessionId`
- `GET /organizations/:orgId/audit-log`

## 15. Permission Matrix

| Resource              | Owner | Admin | Member | Viewer |
| --------------------- | ----: | ----: | -----: | -----: |
| View dashboard/issues |   Yes |   Yes |    Yes |    Yes |
| Triage/comment/assign |   Yes |   Yes |    Yes |     No |
| Manage alerts         |   Yes |   Yes |    Yes |     No |
| Manage projects/keys  |   Yes |   Yes |     No |     No |
| Manage members        |   Yes |   Yes |     No |     No |
| Delete organization   |   Yes |    No |     No |     No |

## 16. Rate-Limit Baseline

- login/reset: 5 attempts / 15 minutes per IP + account,
- ingestion: configurable per project key,
- AI: 10 generations / hour per user and daily organization cap,
- exports: 5 / hour per user,
- API key creation/rotation: 10 / hour per organization.

## 17. Versioning

MVP uses `/api/v1`. Breaking changes require a new major prefix. Additive fields may be introduced without a new version.
