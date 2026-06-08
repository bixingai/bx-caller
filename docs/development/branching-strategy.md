# Branching Strategy

Date: 2026-06-03
Status: Active

## Branch Roles

```text
master
  Stable production branch. Release promotions deploy from here.

develop
  Integration branch. Feature work merges here before release promotion.

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
6. After integration verification passes, open a release PR from `develop` to
   `master`.
7. Merge the release PR to trigger production deployment from `master`.

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

`master` is the only branch that should trigger production deployment
automation for bx-caller. Feature branches and `develop` may run tests and
preview checks, but must not deploy production.
