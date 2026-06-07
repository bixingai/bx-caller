# Branching Strategy

Date: 2026-06-03
Status: Active

## Branch Roles

```text
master
  Upstream baseline and stable history. Do not start feature work here.

develop
  Integration and official release branch. Production releases deploy from here.

codex/*
  Codex work branches. Branch from develop and merge back through review.

feat/*
fix/*
chore/*
docs/*
test/*
  Focused human-readable work branches. Branch from develop and merge back
  through review.
```

## Required Flow

1. Update `develop` from the remote.
2. Create a focused branch from `develop`.
3. Keep changes scoped to one product or harness concern.
4. Run focused verification before review.
5. Open a PR back to `develop`.
6. Release/deploy from `develop` after integration verification passes.

## Commit Organization

Prefer small commits grouped by concern:

- backend/API and portal integration
- frontend UI and services
- telephony provider adapters
- docs, deployment, and CI
- tests and harness fixes

For larger MVP work, split commits before review when it improves traceability.

## Branch Examples

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feat/live-call-operations
```

Codex branch examples:

```text
codex/ai-call-center-frontend
codex/fix-backend-test-regressions
codex/telephony-provider-adapters
```

## Release Rule

`develop` is the only branch that should trigger production release/deploy
automation for bx-caller. Feature branches may run tests and preview checks, but
must not deploy production.
