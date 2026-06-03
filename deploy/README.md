# bx-caller deployment

`bx-caller` is a backend-only satellite for `tools.bixingai.com`.

Production routing follows the same pattern as `wx-article-agent`:

- portal owns login and sets the host-scoped `access_token` cookie
- bx-caller verifies that cookie with the same `PORTAL_JWT_SECRET`
- nginx strips `/bx-caller` before proxying API and WebSocket traffic
- the container binds only to `127.0.0.1:8102`

## Server setup

```bash
mkdir -p /opt/bx-caller
cp .env.prod.example /opt/bx-caller/.env.prod

docker volume create bx-caller_redis_data
docker volume create bx-caller_agent_data
docker volume create bx-caller_logs_data
```

Set `PORTAL_JWT_SECRET` to the exact value used by `bixingai-tools`.

If external telephony callbacks cannot carry the portal cookie, set
`WEBSOCKET_ACCESS_TOKEN` and append `?token=<value>` to `/bx-caller/chat/v1/{agent_id}`
callback URLs.

## Portal catalog

Add this entry to `bixingai-tools/apps/api/app/api/v1/tools.py` when exposing
the tool in the portal:

```python
{
    "slug": "bx-caller",
    "name": "BX Caller",
    "description": "Voice calling agent runtime and call WebSocket endpoints",
    "path": "/bx-caller",
    "status": "active",
}
```

