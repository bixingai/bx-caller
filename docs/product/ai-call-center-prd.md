# AI Call Center Product Requirements

Date: 2026-05-09
Status: Draft for review
Repo: `bx-caller`

## Summary

Build a professional AI call-center application inside the `bx-caller` repo.
The product will run as a Bixing Tools satellite under `/bx-caller`, with a new
frontend web app connected to the existing `bx-caller` FastAPI backend.

The frontend will use role-specific workspaces instead of a one-size-fits-all
dashboard. Each role starts in the workspace that best matches its job, while
shared navigation, entities, permissions, and service contracts keep the app
coherent.

## Goals

- Provide a real, backend-connected MVP for agent CRUD and service health.
- Establish the full product information architecture for a professional AI
  call center.
- Use scaffold-first modular design so each major product area has a blackbox
  contract before the backend is complete.
- Support local standalone frontend development without running the Bixing
  Tools portal.
- Keep production auth aligned with the portal `access_token` cookie and shared
  `PORTAL_JWT_SECRET`.

## Non-Goals For MVP

- No real outbound dialing campaigns.
- No real live-call transcript streaming UI from production call events.
- No human agent console connected to a live queue.
- No CRM, billing, compliance, DNC, or analytics backend persistence.
- No replacement of the Bolna runtime internals unless required to connect the
  frontend safely.

## Target Users And Workspaces

### CEO / Founder

Default workspace: Executive Command Center.

Primary needs:

- Understand business health at a glance.
- See live call volume, containment, resolution, escalation, and campaign
  results.
- Identify risk areas without configuring agents directly.

MVP status: scaffolded with realistic mock metrics and backend health status.

### Operations Manager

Default workspace: Agent Builder Studio.

Primary needs:

- Create and manage AI phone agents.
- Edit agent identity, welcome message, model/provider settings, and simple
  conversation task configuration.
- Test and review agent readiness before deployment.

MVP status: real backend-connected agent CRUD.

### Live Support Supervisor

Default workspace: Live Support Cockpit.

Primary needs:

- Monitor active calls and sentiment.
- Inspect streaming transcript and call state.
- Listen, transfer, or intervene when escalation is needed.

MVP status: scaffolded with mock calls and disabled live intervention actions.

### Support Rep / Account Manager

Default workspace: CRM-native Call Desk.

Primary needs:

- Review customer context, call history, AI summary, and next actions.
- Follow up on call outcomes.

MVP status: scaffolded with mock customer and call summary data.

### Marketing / Growth Manager

Default workspace: Outbound Campaign Control.

Primary needs:

- Plan outbound campaigns.
- Select audience, agent, script, pacing, and compliance checks.
- Review campaign outcomes.

MVP status: scaffolded with mock campaigns and no real dialing.

## Product Principles

- Role-specific workspaces, not unrelated apps.
- Shared app shell, shared components, shared data contracts.
- Scaffold first, then replace mocks module by module.
- Make backend state explicit: connected, degraded, unavailable, mock-only.
- Prefer typed service interfaces over direct ad hoc API calls.
- Keep local dev useful without the portal, but block bypass auth in production.
- Build operational UI, not a marketing page.

## MVP Scope

### Included

- `frontend/` web app inside this repo.
- Production path: `/bx-caller`.
- Local dev path: frontend dev server proxying to backend API.
- Local standalone dev mode with persona/role selector.
- Portal-cookie auth assumption in production.
- App shell with role-aware default workspace.
- Executive Command Center scaffold.
- Agent Builder Studio connected to:
  - `GET /api/health`
  - `GET /api/health/ready`
  - `GET /api/agents`
  - `POST /api/agent`
  - `GET /api/agent/{agent_id}`
  - `PUT /api/agent/{agent_id}`
  - `DELETE /api/agent/{agent_id}`
- Outbound Campaign Control scaffold with mock data and no dialing.
- Live Support Cockpit scaffold with mock data and clear mock-only states.
- CRM Call Desk scaffold with mock data.
- Shared typed API client and service interfaces.
- Focused tests for API client behavior, agent CRUD UI flow, role routing, and
  mock service boundaries.

### Excluded

- Real campaign dialing.
- Real campaign persistence.
- Real-time call event ingestion.
- Recordings/transcript backend persistence.
- User/team management beyond local persona selection.
- Portal catalog updates in `bixingai-tools`.

## MVP User Stories

### Health And Connectivity

As an operator, I can see whether the `bx-caller` backend is reachable and
ready, so I know whether agent operations are safe.

Acceptance criteria:

- The UI calls `/api/health` and `/api/health/ready`.
- The app shows connected, degraded, or unavailable states.
- Readiness failures display which dependency failed when returned by the API.

### Role-Aware Entry

As a local developer or tester, I can choose a role/persona and land in the
right workspace.

Acceptance criteria:

- Local dev mode shows a persona selector.
- Selected role changes the default workspace.
- Production mode does not expose a fake login screen as a security boundary.

### Agent List

As an operations manager, I can view existing AI phone agents from the backend.

Acceptance criteria:

- The UI calls `GET /api/agents`.
- Empty, loading, error, and populated states are visible.
- Agent rows expose edit, duplicate-local-draft, and delete actions.

### Create Agent

As an operations manager, I can create a basic AI phone agent.

Acceptance criteria:

- The create form produces a Bolna-compatible payload.
- The UI calls `POST /api/agent`.
- On success, the agent list refreshes and the new agent is visible.
- Validation prevents missing agent name, prompt, provider, or model fields.

### Edit Agent

As an operations manager, I can edit a basic AI phone agent.

Acceptance criteria:

- The UI loads the selected agent.
- The edit form calls `PUT /api/agent/{agent_id}`.
- On success, the list and detail panel show updated values.

### Delete Agent

As an operations manager, I can delete an agent after confirmation.

Acceptance criteria:

- Delete requires confirmation.
- The UI calls `DELETE /api/agent/{agent_id}`.
- On success, the agent is removed from the list.

### Campaign Scaffold

As a marketing manager, I can review outbound campaign concepts and planned
campaign state without triggering real calls.

Acceptance criteria:

- Campaigns are clearly marked as mock/scaffold data.
- Launch/dial actions are disabled or produce a non-destructive local preview.
- Campaign service is behind an interface that can later be replaced by a real
  backend.

## Full Product Roadmap

### Stage 1: Backend-Connected MVP

Deliver this PRD's MVP.

### Stage 2: Agent Builder Depth

- Structured graph/flow editor for voice agents.
- Test call simulator.
- Provider settings validation.
- Agent versions and publish states.
- Prompt templates and reusable policies.

### Stage 3: Live Call Operations

- Real call sessions endpoint.
- Active call list and streaming transcript.
- Sentiment and escalation signals.
- Listen, transfer, pause AI, and takeover workflows.
- Recording and transcript review.

### Stage 4: Outbound Campaigns

- Campaign backend model.
- Audience import.
- Pacing and schedule controls.
- DNC/compliance checks.
- Dialer integration.
- Outcome tracking.

### Stage 5: Analytics And QA

- Resolution, containment, escalation, latency, cost, and conversion analytics.
- QA scoring.
- Call summaries, tags, and coaching insights.
- Executive reporting.

### Stage 6: Enterprise Readiness

- Teams, permissions, and audit logs.
- CRM/helpdesk integrations.
- Compliance controls and retention policies.
- Multi-region deployment, observability, and load testing.

## Key Data Entities

MVP entities:

- `Agent`
- `AgentDraft`
- `BackendHealth`
- `Persona`
- `Workspace`
- `CampaignMock`
- `LiveCallMock`
- `ContactMock`

Future entities:

- `PhoneNumber`
- `CallSession`
- `Transcript`
- `Recording`
- `Handoff`
- `Campaign`
- `AudienceSegment`
- `CompliancePolicy`
- `QAReview`
- `Integration`

## Backend Contracts

Current backend:

- `GET /api/health`
- `GET /api/health/ready`
- `GET /api/agents`
- `GET /api/agent/{agent_id}`
- `POST /api/agent`
- `PUT /api/agent/{agent_id}`
- `DELETE /api/agent/{agent_id}`
- `WS /chat/v1/{agent_id}`

Frontend services must treat these as blackbox contracts and normalize the
Bolna payload shape into UI-facing types.

## UX Direction

The app will include five role workspaces:

- Executive Command Center
- Agent Builder Studio
- Live Support Cockpit
- CRM Call Desk
- Outbound Campaign Control

The visual system should be clean, operational, and polished:

- quiet enterprise base colors
- strong but sparse accents
- compact tables and panels
- clear selected states
- no marketing hero sections
- no decorative fake dashboards
- no unrelated card-heavy landing page patterns

## Risks

- The existing backend agent payload is flexible and complex; the MVP form must
  start with a narrow supported subset.
- WebSocket and telephony flows are not enough for campaign/live-call product
  behavior yet.
- Mock campaign/live-call data could be mistaken for real state unless clearly
  labeled.
- Auth bypass is useful locally but must never become production auth.

## Success Metrics

MVP is successful when:

- A developer can run backend and frontend locally.
- The frontend can show backend health.
- The frontend can create, list, edit, and delete real agents.
- Each role has a coherent workspace with clear MVP/future boundaries.
- Mock-only modules are isolated behind service interfaces.
- Tests cover the critical API/client and CRUD workflow contracts.

