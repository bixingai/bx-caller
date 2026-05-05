# Production API service scaffold

This service is the secure control-plane/API layer on top of the core `bolna` orchestration package.

## Features included
- Token-based auth and role checks (`admin`, `ops`, `viewer`)
- Environment-based CORS allowlist
- Security headers middleware
- Request validation with Pydantic models
- Basic per-key rate limiting
- Idempotent call creation (`Idempotency-Key`)
- Tenant/workspace/agent/call lifecycle endpoints
- Signed telephony webhook endpoint
- Authenticated websocket monitor endpoint

## Run locally
```bash
cd /home/runner/work/bx-caller/bx-caller
export BX_API_KEYS="dev-admin-token:admin,dev-ops-token:ops,dev-view-token:viewer"
export BX_CORS_ALLOW_ORIGINS="http://localhost:3000"
export BX_TELEPHONY_WEBHOOK_SECRET="change-me"
uvicorn services.api.main:app --host 0.0.0.0 --port 7001
```
