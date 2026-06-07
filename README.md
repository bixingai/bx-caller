# bx-caller

`bx-caller` is the BixingAI voice-calling agent satellite for
`tools.bixingai.com`.

It reuses the Bolna voice-agent runtime in `bolna/`, but runs as an independent
tool service:

- the Bixing Tools portal handles login and sets the `access_token` JWT cookie
- bx-caller verifies that cookie with the same `PORTAL_JWT_SECRET`
- each portal user gets an isolated Redis agent namespace
- nginx mounts the service under `tools.bixingai.com/bx-caller/*`
- frontend API calls and navigation remain under the `/bx-caller` path mount
- external telephony WebSocket callbacks can use an optional shared callback token

## Architecture

```text
tools.bixingai.com/
├── /api/*                 -> bixingai-tools portal API
├── /wx-article/*          -> wx-article-agent satellite
├── /bx-caller/*           -> bx-caller frontend
├── /bx-caller/api/*       -> bx-caller FastAPI API
└── /bx-caller/chat/*      -> bx-caller voice WebSocket
```

The frontend includes role-specific workspaces for executives, operations,
supervisors, account reps, and marketing managers.

## Local setup

```bash
cp .env.example .env
# Set PORTAL_JWT_SECRET to match bixingai-tools apps/api JWT_SECRET.
# For local-only smoke tests, set DEV_BYPASS_AUTH=1.

docker compose up --build
```

The frontend listens on `http://localhost:3102`; the API listens on
`http://localhost:8102`.

Frontend-only development:

```bash
cd frontend
npm install
npm run dev
```

API-only development without Docker/Redis:

```bash
# In .env:
# DEV_BYPASS_AUTH=1
# REDIS_URL=memory://local

uvicorn app.main:app --host 127.0.0.1 --port 8102 --reload
```

Useful endpoints:

- `GET /api/health`
- `GET /api/health/ready`
- `GET /api/provider-readiness`
- `POST /api/agent`
- `GET /api/agent/{agent_id}`
- `PUT /api/agent/{agent_id}`
- `DELETE /api/agent/{agent_id}`
- `GET /api/agents`
- `GET|POST /api/contacts`
- `GET|PUT|DELETE /api/contacts/{contact_id}`
- `GET|POST /api/campaigns`
- `GET|PUT /api/campaigns/{campaign_id}`
- `POST /api/campaigns/{campaign_id}/launch`
- `GET /api/call-sessions`
- `GET /api/audit-logs`
- `POST /api/calls/outbound`
- `GET|POST /api/telephony/twilio/connect`
- `WS /chat/v1/{agent_id}`

Legacy Bolna agent payloads are still accepted. See [API.md](API.md) for the
agent config shape.

## Portal integration

Add bx-caller to the portal tool catalog in
`bixingai-tools/apps/api/app/api/v1/tools.py`:

```python
{
    "slug": "bx-caller",
    "name": "BX Caller",
    "description": "Voice calling agent runtime and call WebSocket endpoints",
    "path": "/bx-caller",
    "status": "active",
}
```

Add the nginx locations from
`deploy/tools.bixingai.com.bx-caller.conf` to the `tools.bixingai.com` vhost.

## Production

Production is intended to deploy automatically to Tencent Cloud as the
self-contained `BX Caller` tool mounted at:

```text
https://tools.bixingai.com/bx-caller
```

The production deployment still runs as a self-contained Docker tool: FastAPI
API, Next.js web, and Redis behind the host `tools.bixingai.com` nginx vhost. On
the server:

```bash
mkdir -p /opt/bx-caller
cp .env.prod.example /opt/bx-caller/.env.prod

docker volume create bx-caller_redis_data
docker volume create bx-caller_agent_data
docker volume create bx-caller_logs_data
```

Set `PORTAL_JWT_SECRET` to the exact value used by the portal.

If a telephony provider cannot carry the portal cookie on WebSocket callbacks,
set `WEBSOCKET_ACCESS_TOKEN` and append `?token=<value>` to callback URLs:

```text
https://tools.bixingai.com/bx-caller/chat/v1/{agent_id}?token=<value>
```

Outbound calling uses a provider adapter boundary. Twilio is the first adapter:

```env
TELEPHONY_PROVIDER=twilio
PUBLIC_BASE_URL=https://tools.bixingai.com/bx-caller
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

The Twilio callback endpoint returns TwiML that streams the call to the
provider-neutral bx-caller voice WebSocket. Future SIP, Plivo, or China/APAC
carrier adapters should implement the same outbound call service contract.

## Development notes

The old Bolna local telephony setup remains under `local_setup/` for provider
experiments. New portal-facing work should use `app/main.py` and the root
Docker/compose files.

Branching rules live in
`docs/development/branching-strategy.md`. In short, branch feature work from
`develop`, merge back into `develop`, and release/deploy from `develop`.

MVP frontend notes:

- Agent Builder uses real backend health and agent CRUD APIs.
- Campaign Control uses persisted contacts, campaigns, provider readiness, and
  explicit compliance acknowledgment before placing outbound calls.
- Live Cockpit, CRM Desk, and Executive workspaces read persisted launch
  records, call sessions, and audit logs.
- Remaining advanced call-center scope is transcript persistence, pacing/retry
  workers, CRM integrations, enterprise roles, and analytics aggregation.
