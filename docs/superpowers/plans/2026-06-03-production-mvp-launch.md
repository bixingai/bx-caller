# Production MVP Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the persisted operational launch layer for bx-caller: contacts, campaigns, call sessions, audit logs, provider readiness, and frontend launch workflows.

**Architecture:** Add Redis-compatible portal-user-scoped domain records behind FastAPI endpoints, then replace mock-only frontend services with typed launch service adapters. Keep launch synchronous and provider-boundary based for MVP reliability.

**Tech Stack:** FastAPI, Pydantic, Redis-compatible async store, Next.js, TypeScript, Vitest, Testing Library, pytest.

---

## Files And Responsibilities

- Create `app/launch.py`: Pydantic launch domain models, key helpers, CRUD helpers, audit helper, provider readiness helper.
- Modify `app/main.py`: route handlers for contacts, campaigns, launch, call sessions, audit logs, provider readiness.
- Create `tests/test_launch_operations.py`: backend contract tests for launch domain APIs.
- Create `frontend/src/types/launch.ts`: frontend launch domain types.
- Create `frontend/src/services/launch-service.ts`: typed API service for contacts, campaigns, sessions, audit, provider readiness.
- Create `frontend/src/services/launch-service.test.ts`: frontend service contract tests.
- Modify `frontend/src/features/campaigns/campaign-control-workspace.tsx`: real campaign/contact/agent launch workflow.
- Modify `frontend/src/features/live/live-cockpit-workspace.tsx`: real call session list.
- Modify `frontend/src/features/desk/crm-call-desk-workspace.tsx`: real contacts and recent sessions.
- Modify `frontend/src/features/executive/executive-workspace.tsx`: derived summary metrics.
- Modify `API.md`, `README.md`, and roadmap docs with launch APIs and status.

## Task 1: Backend Launch Domain Contracts

**Files:**
- Create: `tests/test_launch_operations.py`
- Create: `app/launch.py`
- Modify: `app/main.py`

- [ ] **Step 1: Write failing backend API tests**

Create tests covering contact CRUD, campaign creation, launch validation, call session creation, audit logging, and provider readiness.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
pytest tests/test_launch_operations.py -q
```

Expected: fail because launch endpoints do not exist.

- [ ] **Step 3: Implement launch models and storage helpers**

Add portal-user-scoped key helpers, JSON CRUD helpers, and audit append helper.

- [ ] **Step 4: Add FastAPI routes**

Wire contacts, campaigns, call sessions, audit logs, provider readiness, and campaign launch routes.

- [ ] **Step 5: Run backend tests**

Run:

```bash
pytest tests/test_launch_operations.py tests/test_portal_auth.py tests/test_telephony.py -q
```

Expected: pass.

## Task 2: Frontend Launch Services

**Files:**
- Create: `frontend/src/types/launch.ts`
- Create: `frontend/src/services/launch-service.ts`
- Create: `frontend/src/services/launch-service.test.ts`

- [ ] **Step 1: Write failing service tests**

Cover mapping for contacts, campaigns, sessions, audit logs, provider readiness, and campaign launch.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
cd frontend && npm test -- --run src/services/launch-service.test.ts
```

Expected: fail because service does not exist.

- [ ] **Step 3: Implement launch service**

Add `createLaunchService(fetcher = apiFetch)` with typed methods for all launch endpoints.

- [ ] **Step 4: Run service tests**

Run:

```bash
cd frontend && npm test -- --run src/services/launch-service.test.ts
```

Expected: pass.

## Task 3: Frontend Workspace Wiring

**Files:**
- Modify: `frontend/src/features/campaigns/campaign-control-workspace.tsx`
- Modify: `frontend/src/features/live/live-cockpit-workspace.tsx`
- Modify: `frontend/src/features/desk/crm-call-desk-workspace.tsx`
- Modify: `frontend/src/features/executive/executive-workspace.tsx`
- Test: existing and new component tests under `frontend/src/features`

- [ ] **Step 1: Write component tests for launch workflow**

Cover campaign launch disabled until compliance acknowledgment and session list rendering.

- [ ] **Step 2: Run tests and verify RED**

Run targeted Vitest tests for changed workspaces.

- [ ] **Step 3: Implement real launch workspace UI**

Use launch service data and preserve safe disabled states when provider readiness is incomplete.

- [ ] **Step 4: Run frontend tests and typecheck**

Run:

```bash
cd frontend && npm test -- --run
cd frontend && npm run typecheck
```

Expected: pass.

## Task 4: Docs And Verification

**Files:**
- Modify: `API.md`
- Modify: `README.md`
- Modify: `docs/product/staged-roadmap.md`

- [ ] **Step 1: Document launch endpoints and status**

Add contact, campaign, call session, audit, and provider readiness endpoints.

- [ ] **Step 2: Run full verification**

Run:

```bash
pytest
cd frontend && npm test -- --run
cd frontend && npm run typecheck
cd frontend && npm run build
docker compose config
```

Expected: all pass.

- [ ] **Step 3: Commit**

Commit with:

```bash
git add app tests frontend API.md README.md docs
git commit -m "feat(call-center): add production launch operations"
```
