# bx-caller agent notes

## Project shape

`bx-caller` is a Bixing Tools satellite mounted under `/bx-caller/*`.

- `app/` is the portal-facing FastAPI service.
- `frontend/` is the Next.js AI call-center frontend.
- `bolna/` is the voice-agent runtime.
- `local_setup/` is legacy/provider experimentation support.
- Production deploy files are root `Dockerfile`, `docker-compose.prod.yml`, and
  `deploy/tools.bixingai.com.bx-caller.conf`.

## Auth invariants

- HTTP API routes must depend on portal JWT cookie auth.
- `PORTAL_JWT_SECRET` must match `bixingai-tools` exactly.
- Do not enable `DEV_BYPASS_AUTH=1` in production.
- Redis agent keys must remain portal-user scoped:
  `agent:{portal_user_id}:{agent_id}`.
- WebSocket callbacks may use `WEBSOCKET_ACCESS_TOKEN` only for telephony
  providers that cannot send the portal cookie.

## Common commands

```bash
cp .env.example .env
pip install -r requirements.txt
docker compose up --build
pytest
python -m compileall app
cd frontend && npm test -- --run
cd frontend && npm run typecheck
```

## Branching strategy

- `develop` is the integration and official release branch.
- Production release/deploy automation must run from `develop`, not feature
  branches.
- `master` tracks the upstream baseline/stable history and should not receive
  direct feature work.
- Feature work branches must branch from `develop`.
- Use `codex/*` for Codex work branches and `feat/*`, `fix/*`, `chore/*`,
  `docs/*`, or `test/*` for human-readable feature branches.
- Merge feature branches back into `develop` through PR/review after focused
  verification.
- Keep commits organized by concern where practical: backend/API, frontend,
  telephony adapters, docs/deploy/CI, and test/harness fixes.

## Change discipline

Keep portal integration changes in `app/` unless the Bolna runtime itself needs
to change. Preserve the legacy `local_setup/` flow unless the task explicitly
asks to remove it.

Frontend feature modules must communicate through typed services in
`frontend/src/services/`. Mock-only workspaces must remain visibly labeled and
must not perform destructive actions.
