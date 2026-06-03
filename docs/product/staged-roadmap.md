# AI Call Center Staged Development Roadmap

Date: 2026-05-09
Status: Draft for review

## Development Philosophy

Use scaffold-first, blackbox modular delivery:

1. Define contracts and module boundaries.
2. Create navigable UI scaffolds for the complete product shape.
3. Connect only the MVP backend-supported flows.
4. Replace mock services with real services one module at a time.
5. Add tests at each boundary before broadening scope.

## Stage 0: Product And Architecture Docs

Artifacts:

- PRD
- frontend architecture
- staged roadmap
- implementation plan

Exit criteria:

- User approves product scope and MVP.
- Module boundaries are explicit.
- MVP and future scope are separated.

## Stage 1: Frontend Scaffold And Real Agent CRUD MVP

Scope:

- create `frontend/`
- app shell and role workspaces
- local dev persona selector
- backend health panel
- typed API client
- real Agent Builder CRUD
- mock Executive, Live Cockpit, CRM Desk, and Campaign Control
- root Docker and compose updates for web service

Tests:

- TypeScript checks
- lint
- unit tests for API client and payload mapping
- component tests for agent CRUD states
- browser smoke test for core navigation and agent screen

Exit criteria:

- Local developer can create, edit, list, and delete real agents.
- Mock-only modules are visibly marked and isolated.
- App can be deployed under `/bx-caller`.

## Stage 2: Agent Builder Production Depth

Scope:

- agent versioning model
- publish/draft states
- provider configuration validation
- richer task templates
- graph/flow editor scaffold
- test conversation simulator

Backend needs:

- optional agent metadata fields
- version/publish endpoints
- validation endpoint

Exit criteria:

- Ops manager can safely configure and test a useful AI phone agent.

## Stage 3: Live Call Operations

Scope:

- call session model
- active call API
- transcript streaming
- sentiment/escalation signals
- supervisor actions: listen, transfer, pause AI, takeover

Backend needs:

- call session persistence
- event stream endpoint
- transcript/recording storage
- handoff action endpoints

Exit criteria:

- Supervisor can monitor live calls and handle escalations.

## Stage 4: Outbound Campaigns

Scope:

- campaign CRUD
- audience import
- compliance checks
- pacing controls
- campaign-to-agent assignment
- dialing integration
- outcome tracking

Backend needs:

- campaign tables
- audience tables
- dialer job orchestration
- DNC/compliance checks
- call result ingestion

Exit criteria:

- Marketing manager can launch a controlled outbound AI campaign.

## Stage 5: CRM Desk And Follow-Up

Scope:

- contact model
- call history
- call summaries
- task creation
- manual notes
- CRM/helpdesk integration hooks

Backend needs:

- contact persistence
- summary storage
- integration credentials and sync jobs

Exit criteria:

- Rep can review customer context and complete follow-up workflows.

## Stage 6: Analytics, QA, And Executive Reporting

Scope:

- containment and resolution analytics
- campaign conversion
- escalation analytics
- QA scoring
- cost and latency reporting
- executive dashboard backed by real data

Backend needs:

- analytics aggregation jobs
- event taxonomy
- cost tracking
- QA scoring pipeline

Exit criteria:

- CEO dashboard reflects real operational and business outcomes.

## Stage 7: Enterprise Readiness

Scope:

- teams and permissions
- audit logs
- retention policies
- secrets management
- observability
- rate limits and quotas
- load testing

Exit criteria:

- App can support production call-center operations beyond a single internal
  team.

