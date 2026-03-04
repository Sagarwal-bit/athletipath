# AthletiPath V2 Architecture

## 1) Multi-role distributed platform
- Roles: `student`, `coach`, `admin` (legacy `teacher` mapped to `coach`).
- RBAC middleware: `middleware/rbac.js`.
- Role-scoped APIs: `routes/v2/student.routes.js`, `routes/v2/coach.routes.js`, `routes/v2/admin.routes.js`.

## 2) Rule-based validation engine
- Activity validation in `services/validation.service.js`:
  - unrealistic speed detection
  - abnormal GPS jump detection
  - duplicate video filename heuristic
- Automatic trust penalties logged in `trust_penalties`.

## 3) Trust-driven progression control
- Trust recomputation service: `services/trust.service.js`.
- Milestone gating service: `services/roadmap.service.js` with:
  - trust threshold rules
  - minimum performance rules
  - mandatory coach approval for advanced milestones
- Milestone approval workflow in `milestone_approvals`.

## 4) Data-driven recommendation system (rule-based)
- `services/recommendation.service.js` uses measurable inputs:
  - weekly frequency
  - speed trend slope
  - consistency score
  - trust score
  - completion + approval blockers
- Output recommendations include explicit reason statements.

## 5) Automation layer
- Scheduler: `jobs/scheduler.js`.
- Automation service: `services/automation.service.js`:
  - upcoming event notifications
  - inactivity reminders
  - low-trust progression lock warnings

## 6) Modular scalable backend structure
- Middleware layer: auth, RBAC, error handling.
- Service layer: trust, validation, recommendation, roadmap, analytics, notifications, auth, automation.
- Route layer: versioned API `routes/v2`.
- DB schema: `db/schema.v2.sql` with indexes and normalized workflow tables.

## 7) Production-readiness measures
- Refresh-token flow (`services/auth.service.js`, `routes/v2/auth.routes.js`).
- Structured error handling (`middleware/errors.js`).
- Secure upload filters (`middleware/upload.js`).
- Frontend token refresh and persistent session (`frontend/src/utils/auth.js`).

