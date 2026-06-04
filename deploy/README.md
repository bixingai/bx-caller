# bx-caller deployment

`bx-caller` is a self-contained launchable BixingAI tool for
`tools.bixingai.com`, deployed to Tencent Cloud behind the shared portal.

Production routing follows the same pattern as `wx-article-agent`:

- portal owns login and sets the host-scoped `access_token` cookie
- bx-caller verifies that cookie with the same `PORTAL_JWT_SECRET`
- nginx strips `/bx-caller` before proxying API and WebSocket traffic
- frontend traffic keeps `/bx-caller` because Next.js is built with that base path
- the API container binds only to `127.0.0.1:8102`
- the web container binds only to `127.0.0.1:3102`

## Server setup

```bash
mkdir -p /opt/bx-caller
cp .env.prod.example /opt/bx-caller/.env.prod

docker volume create bx-caller_redis_data
docker volume create bx-caller_agent_data
docker volume create bx-caller_logs_data
```

Set `PORTAL_JWT_SECRET` to the exact value used by `bixingai-tools`.

Production compose expects published images unless deployment automation
overrides them:

```text
${REGISTRY:-docker.io}/${IMAGE_NAMESPACE:-pmtmyaggy}/bx-caller-api:${IMAGE_TAG:-prod}
${REGISTRY:-docker.io}/${IMAGE_NAMESPACE:-pmtmyaggy}/bx-caller-web:${IMAGE_TAG:-prod}
```

## GitHub deployment configuration

Set these repository variables for Tencent Cloud Container Registry:

```text
CONTAINER_REGISTRY=ccr.ccs.tencentyun.com
IMAGE_NAMESPACE=<tencent-registry-namespace>
```

Set these repository secrets:

```text
REGISTRY_USERNAME=<tencent-registry-username>
REGISTRY_PASSWORD=<tencent-registry-password-or-token>
TENCENT_CLOUD_HOST=<server-ip-or-hostname>
TENCENT_CLOUD_USER=<ssh-user>
DEPLOY_SSH_KEY=<private-key-for-server>
```

The workflow keeps backwards-compatible `DOCKERHUB_USERNAME`,
`DOCKERHUB_TOKEN`, `SERVER_HOST`, and `SERVER_USER` fallbacks.

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
