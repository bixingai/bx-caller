# AI Call Center Frontend MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Stage 1 AI Call Center frontend MVP inside `frontend/`, connected to the existing `bx-caller` backend for health checks and agent CRUD.

**Architecture:** Create a Next.js + TypeScript frontend with a role-aware app shell and blackbox feature modules. Health and Agent Builder use real API adapters; Executive, Live Cockpit, CRM Desk, and Campaign Control use typed mock services that can later be replaced module by module.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Vitest, Testing Library, Docker, FastAPI backend API.

---

## Files And Responsibilities

- Create `frontend/package.json`: frontend scripts and dependencies.
- Create `frontend/next.config.ts`: `/bx-caller` base path and local `/api` rewrite.
- Create `frontend/tailwind.config.ts`, `frontend/postcss.config.mjs`, `frontend/src/app/globals.css`: design tokens and styling.
- Create `frontend/src/app/layout.tsx`: root metadata and global shell.
- Create `frontend/src/app/page.tsx`: workspace router entry.
- Create `frontend/src/app/(workspaces)/*/page.tsx`: workspace routes.
- Create `frontend/src/components/*`: shared app shell and UI primitives.
- Create `frontend/src/types/*`: domain types.
- Create `frontend/src/lib/api-client.ts`: fetch wrapper with credentials and normalized errors.
- Create `frontend/src/services/*`: blackbox service interfaces, API adapters, and mock adapters.
- Create `frontend/src/features/*`: workspace UI modules.
- Create `frontend/src/test/*`: test setup and helpers.
- Modify root `docker-compose.yml`, `docker-compose.prod.yml`, `Dockerfile` or add `frontend/Dockerfile`: add web service.
- Modify `deploy/tools.bixingai.com.bx-caller.conf`: route `/bx-caller/*` to the frontend while preserving API/WebSocket routes.
- Modify `README.md` and `AGENTS.md`: document frontend commands and architecture.

## Task 1: Frontend Scaffold

**Files:**

- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/next-env.d.ts`
- Create: `frontend/next.config.ts`
- Create: `frontend/postcss.config.mjs`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/globals.css`
- Create: `frontend/src/app/page.tsx`
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: Write a scaffold smoke test**

Create `frontend/src/app/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import Page from "./page";
import { describe, expect, it } from "vitest";

describe("AI Call Center home", () => {
  it("renders the product shell entry", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: /ai call center/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd frontend
npm test -- --run src/app/page.test.tsx
```

Expected: FAIL because the frontend scaffold or page implementation does not exist yet.

- [ ] **Step 3: Create minimal Next scaffold**

Create `frontend/package.json`:

```json
{
  "name": "bx-caller-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3102",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.468.0",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.1",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

Create the minimal config files with strict TypeScript, Tailwind content paths, `basePath: "/bx-caller"` when `NEXT_PUBLIC_BASE_PATH` is set, and a local rewrite from `/api/:path*` to `http://localhost:8102/api/:path*`.

Create `frontend/src/app/page.tsx` with:

```tsx
export default function Page() {
  return (
    <main>
      <h1>AI Call Center</h1>
    </main>
  );
}
```

- [ ] **Step 4: Run scaffold test**

Run:

```bash
cd frontend
npm test -- --run src/app/page.test.tsx
```

Expected: PASS.

## Task 2: Domain Types And Agent Payload Mapper

**Files:**

- Create: `frontend/src/types/agent.ts`
- Create: `frontend/src/services/agent-payload.ts`
- Create: `frontend/src/services/agent-payload.test.ts`

- [ ] **Step 1: Write failing payload mapper tests**

Test cases:

- `agentDraftToBolnaPayload` creates one conversation task with LLM, transcriber, synthesizer, and `task_1.system_prompt`.
- `bolnaAgentToDraft` reads a backend agent payload into the narrow `AgentDraft` model.
- `bolnaAgentToSummary` handles missing nested provider/model values by returning `"unknown"`.

- [ ] **Step 2: Run mapper tests to verify failure**

Run:

```bash
cd frontend
npm test -- --run src/services/agent-payload.test.ts
```

Expected: FAIL because mapper functions do not exist.

- [ ] **Step 3: Implement domain types and mapper**

Create `AgentDraft`, `AgentSummary`, `BolnaCreateAgentPayload`, and mapper functions. Defaults:

- transcriber provider: `deepgram`
- transcriber model: `nova-2`
- LLM provider: `openai`
- LLM model: `gpt-4o-mini`
- synthesizer provider: `elevenlabs`
- welcome message: user draft value
- prompt stored in `agent_prompts.task_1.system_prompt`

- [ ] **Step 4: Run mapper tests**

Run:

```bash
cd frontend
npm test -- --run src/services/agent-payload.test.ts
```

Expected: PASS.

## Task 3: API Client And Backend Services

**Files:**

- Create: `frontend/src/lib/api-client.ts`
- Create: `frontend/src/lib/api-client.test.ts`
- Create: `frontend/src/services/health-service.ts`
- Create: `frontend/src/services/agent-service.ts`
- Create: `frontend/src/services/backend-services.test.ts`

- [ ] **Step 1: Write failing API client tests**

Test cases:

- `apiFetch` includes `credentials: "include"`.
- non-2xx JSON error responses throw `ApiError` with status and message.
- readiness adapter maps a 503 response with `detail.failures` to `state: "degraded"`.

- [ ] **Step 2: Run API tests to verify failure**

Run:

```bash
cd frontend
npm test -- --run src/lib/api-client.test.ts src/services/backend-services.test.ts
```

Expected: FAIL because client and adapters do not exist.

- [ ] **Step 3: Implement API client and real service adapters**

Implement:

- `ApiError`
- `apiFetch<T>(path, options)`
- `createHealthService(apiFetch)`
- `createAgentService(apiFetch)`

Agent service must call the existing backend endpoints and use the payload
mapper from Task 2.

- [ ] **Step 4: Run API tests**

Run:

```bash
cd frontend
npm test -- --run src/lib/api-client.test.ts src/services/backend-services.test.ts
```

Expected: PASS.

## Task 4: Mock Services And Role Routing

**Files:**

- Create: `frontend/src/types/workspace.ts`
- Create: `frontend/src/services/mock-services.ts`
- Create: `frontend/src/services/workspaces.ts`
- Create: `frontend/src/services/workspaces.test.ts`

- [ ] **Step 1: Write failing role routing tests**

Test cases:

- CEO defaults to `/executive`.
- Operations manager defaults to `/agents`.
- Marketing manager defaults to `/campaigns`.
- Supervisor defaults to `/live`.
- Support rep defaults to `/desk`.
- mock campaign launch returns `{ kind: "mock-only" }` and never dials.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd frontend
npm test -- --run src/services/workspaces.test.ts
```

Expected: FAIL because workspace and mock services do not exist.

- [ ] **Step 3: Implement workspace definitions and mocks**

Implement typed personas, workspace definitions, default route resolution, and
mock services for Executive, Live Calls, CRM Desk, and Campaigns.

- [ ] **Step 4: Run tests**

Run:

```bash
cd frontend
npm test -- --run src/services/workspaces.test.ts
```

Expected: PASS.

## Task 5: App Shell And Workspace Screens

**Files:**

- Create: `frontend/src/components/app-shell.tsx`
- Create: `frontend/src/components/ui/*`
- Create: `frontend/src/features/executive/executive-workspace.tsx`
- Create: `frontend/src/features/agents/agent-builder-workspace.tsx`
- Create: `frontend/src/features/live/live-cockpit-workspace.tsx`
- Create: `frontend/src/features/desk/crm-call-desk-workspace.tsx`
- Create: `frontend/src/features/campaigns/campaign-control-workspace.tsx`
- Modify: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/(workspaces)/executive/page.tsx`
- Create: `frontend/src/app/(workspaces)/agents/page.tsx`
- Create: `frontend/src/app/(workspaces)/live/page.tsx`
- Create: `frontend/src/app/(workspaces)/desk/page.tsx`
- Create: `frontend/src/app/(workspaces)/campaigns/page.tsx`
- Create: `frontend/src/features/app-shell.test.tsx`

- [ ] **Step 1: Write failing shell tests**

Test cases:

- App shell renders all five workspace nav items.
- Local persona selector can switch to Marketing and shows Campaign Control as
  the active workspace.
- Campaign launch button is disabled or reports mock-only status.

- [ ] **Step 2: Run shell tests to verify failure**

Run:

```bash
cd frontend
npm test -- --run src/features/app-shell.test.tsx
```

Expected: FAIL because shell/workspaces do not exist.

- [ ] **Step 3: Implement shell and workspace screens**

Build the app shell and all five workspaces using the PRD's visual directions.
Keep the first implementation code-native with realistic data and explicit
mock-only labels for scaffolded modules.

- [ ] **Step 4: Run shell tests**

Run:

```bash
cd frontend
npm test -- --run src/features/app-shell.test.tsx
```

Expected: PASS.

## Task 6: Agent Builder CRUD UI

**Files:**

- Create: `frontend/src/features/agents/agent-builder.test.tsx`
- Modify: `frontend/src/features/agents/agent-builder-workspace.tsx`
- Create: `frontend/src/features/agents/agent-form.tsx`

- [ ] **Step 1: Write failing Agent Builder UI tests**

Test cases:

- loading service data shows existing agents.
- submitting a valid form calls `createAgent`.
- editing an agent calls `updateAgent`.
- delete requires confirmation and calls `deleteAgent`.
- service error shows a readable error panel.

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd frontend
npm test -- --run src/features/agents/agent-builder.test.tsx
```

Expected: FAIL because the CRUD UI is incomplete.

- [ ] **Step 3: Implement Agent Builder CRUD UI**

Use `AgentService` as the only dependency. The component should accept the
service as a prop for tests and use the real service by default in app routes.

- [ ] **Step 4: Run Agent Builder UI tests**

Run:

```bash
cd frontend
npm test -- --run src/features/agents/agent-builder.test.tsx
```

Expected: PASS.

## Task 7: Docker, Compose, Nginx, And Docs

**Files:**

- Create: `frontend/Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `docker-compose.prod.yml`
- Modify: `deploy/tools.bixingai.com.bx-caller.conf`
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Write compose validation expectation**

No code test is needed. Verification command:

```bash
Copy-Item .env.example .env
Copy-Item .env.prod.example .env.prod
docker compose config --quiet
docker compose -f docker-compose.prod.yml --env-file .env.prod config --quiet
Remove-Item .env
Remove-Item .env.prod
```

Expected after implementation: exit code 0.

- [ ] **Step 2: Implement deployment wiring**

Add a `web` service for local and production compose:

- local `web` exposes `3102:3000`
- production `web` exposes `127.0.0.1:3102:3000`
- production image name: `pmtmyaggy/bx-caller-web`
- API routes keep priority over frontend routes in nginx

- [ ] **Step 3: Update docs**

Document:

- frontend commands
- local dev with backend `DEV_BYPASS_AUTH=1`
- production route shape
- mock-only MVP modules

- [ ] **Step 4: Run compose validation**

Run the command from Step 1.

Expected: PASS.

## Task 8: Final Verification And Review

**Files:**

- Modify only files needed to fix verification issues.

- [ ] **Step 1: Run frontend verification**

Run:

```bash
cd frontend
npm test -- --run
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 2: Run backend-focused verification**

Run:

```bash
$env:PORTAL_JWT_SECRET='ci-only-secret-ci-only-secret-123456'; pytest tests/test_portal_auth.py -q
ruff check .
python -m compileall app tests/test_portal_auth.py
```

Expected: all pass.

- [ ] **Step 3: Run browser smoke test**

Start backend and frontend, then verify:

- `/bx-caller` or local frontend root loads
- persona switcher works
- Agent Builder page renders
- campaign page marks mock-only actions

- [ ] **Step 4: Request code review**

Use `superpowers:requesting-code-review` with:

- Description: Stage 1 AI Call Center frontend MVP
- Requirements: this plan and PRD
- Base SHA: current branch base before implementation
- Head SHA: implementation head

Fix Critical and Important findings before final response.

