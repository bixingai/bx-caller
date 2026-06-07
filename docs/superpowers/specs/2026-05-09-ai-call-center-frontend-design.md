# AI Call Center Frontend Design Spec

Date: 2026-05-09
Status: Draft for review

## Approved Direction

Build a real AI call-center frontend inside the `bx-caller` repo as a new
satellite web app. The MVP connects to the current backend for health checks and
agent CRUD, while scaffolded role workspaces establish the full product shape.

## Product Documents

- [PRD](../../product/ai-call-center-prd.md)
- [Frontend Architecture](../../architecture/frontend-architecture.md)
- [Staged Roadmap](../../product/staged-roadmap.md)

## MVP Definition

The MVP includes:

- `frontend/` app in this repo
- production path `/bx-caller`
- local standalone dev mode
- role-based workspaces
- real backend health checks
- real agent CRUD connected to existing `bx-caller` API
- mock outbound campaign scaffold
- mock live call cockpit
- mock CRM call desk
- mock executive dashboard with real health status
- typed service contracts for all modules

## Architecture Summary

The app is a single product with five workspaces:

- Executive Command Center
- Agent Builder Studio
- Live Support Cockpit
- CRM Call Desk
- Outbound Campaign Control

These are not separate apps or purely cosmetic themes. They are role-specific
workspaces using one app shell, one visual system, and shared service
boundaries.

## Scaffold-First Rule

Every major feature starts as:

1. typed domain model
2. service interface
3. mock adapter or API adapter
4. UI module
5. tests around the interface and critical user path

Only Agent Builder and Health use real backend adapters in the MVP.

## Backend Integration

MVP real integrations:

- `GET /api/health`
- `GET /api/health/ready`
- `GET /api/agents`
- `GET /api/agent/{agent_id}`
- `POST /api/agent`
- `PUT /api/agent/{agent_id}`
- `DELETE /api/agent/{agent_id}`

The frontend must include credentials on API requests so the production portal
cookie is sent. Local development can rely on backend `DEV_BYPASS_AUTH=1`.

## Implementation Gate

Do not begin frontend implementation until:

- this spec is reviewed
- MVP scope is accepted
- the implementation plan is written
- initial tests are defined before production code

