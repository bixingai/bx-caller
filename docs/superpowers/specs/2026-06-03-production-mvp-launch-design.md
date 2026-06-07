# Production MVP Launch Design

Date: 2026-06-03
Status: Approved for autonomous implementation

## Goal

Turn bx-caller from a full-stack agent CRUD MVP into a launchable AI call-center
MVP with persisted contacts, campaigns, call sessions, audit logs, provider
readiness, and controlled outbound launch workflows.

## Scope

Production MVP Launch includes:

- persisted contacts per portal user
- persisted outbound campaigns per portal user
- campaign-to-agent assignment
- controlled campaign launch with explicit compliance acknowledgment
- call session records created for each attempted outbound call
- audit log records for operational actions
- provider readiness endpoint that reports missing launch settings
- frontend services and workspaces backed by these APIs

Production MVP Launch excludes:

- advanced role/team permissions beyond portal-user scoping
- real transcript streaming persistence from the Bolna runtime
- CRM vendor integrations
- automated retry/pacing workers
- China/APAC telephony adapter implementation
- billing, QA scoring, and enterprise analytics

## Architecture

The backend remains FastAPI with Redis-compatible storage. The current
`memory://local` store is kept for local development and tests. New launch
entities use portal-user-scoped Redis keys:

```text
contact:{portal_user_id}:{contact_id}
campaign:{portal_user_id}:{campaign_id}
call_session:{portal_user_id}:{session_id}
audit:{portal_user_id}:{audit_id}
```

Campaign launch uses the existing `TelephonyProvider` boundary. Launch is
synchronous in this MVP: each target contact creates one outbound call attempt
and one call session record. This avoids adding a background worker before the
product has validated campaign controls.

The frontend keeps the existing blackbox service pattern. Mock-only workspaces
are replaced with launch services where backend support exists:

- Campaign Control uses real campaigns, contacts, agents, and launch status.
- Live Cockpit uses real call session records.
- CRM Desk uses real contacts and recent call sessions.
- Executive Command Center derives summary metrics from launch APIs.

## Backend API

Contacts:

```text
GET /api/contacts
POST /api/contacts
GET /api/contacts/{contact_id}
PUT /api/contacts/{contact_id}
DELETE /api/contacts/{contact_id}
```

Campaigns:

```text
GET /api/campaigns
POST /api/campaigns
GET /api/campaigns/{campaign_id}
PUT /api/campaigns/{campaign_id}
POST /api/campaigns/{campaign_id}/launch
```

Call sessions and audit:

```text
GET /api/call-sessions
GET /api/audit-logs
GET /api/provider-readiness
```

## Launch Controls

Campaign launch requires:

- campaign has at least one contact
- campaign agent exists for the current portal user
- request body includes `compliance_ack=true`
- telephony provider in request matches the configured provider
- provider readiness is checked and reported before launch

The MVP does not silently skip invalid contacts. If a campaign references a
missing contact, launch fails with a 400 response and no calls are placed.

## Audit Events

Audit logs are append-only records scoped to the portal user. The MVP writes
audit records for:

- contact create/update/delete
- campaign create/update
- campaign launch
- outbound call session creation

Audit logs are intentionally simple JSON records so future persistence can move
to Postgres without changing frontend contracts.

## Testing

Backend tests cover:

- portal-user scoping for contacts and campaigns
- campaign launch validation
- call session creation through fake telephony provider
- audit log creation
- provider readiness missing/configured states

Frontend tests cover:

- service mapping for contacts, campaigns, sessions, and audit
- Campaign Control launch disabled until compliance acknowledgment
- Live Cockpit rendering real session state
- Executive metrics derived from backend data

## Success Criteria

Production MVP Launch is complete when:

- full `pytest` passes
- frontend tests and typecheck pass
- a local user can create contacts, create a campaign, assign an agent, launch
  calls through the provider boundary, and see call sessions/audit logs
- mock-only labels are removed from workspaces that now use real launch APIs
- production deploy configuration remains valid
