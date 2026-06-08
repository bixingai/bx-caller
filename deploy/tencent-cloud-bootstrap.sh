#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/bx-caller}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"
HEALTH_API_URL="${HEALTH_API_URL:-http://127.0.0.1:8102/api/health}"
HEALTH_WEB_URL="${HEALTH_WEB_URL:-http://127.0.0.1:3102/bx-caller}"

cd "$APP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "$APP_DIR/$ENV_FILE is missing. Create it from .env.prod.example before deploy." >&2
  exit 1
fi

for volume in bx-caller_redis_data bx-caller_agent_data bx-caller_logs_data; do
  docker volume inspect "$volume" >/dev/null 2>&1 || docker volume create "$volume" >/dev/null
done

if ! grep -q '^PORTAL_JWT_SECRET=.' "$ENV_FILE"; then
  echo "PORTAL_JWT_SECRET must be set in $APP_DIR/$ENV_FILE." >&2
  exit 1
fi

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config >/dev/null

if [ "${SKIP_IMAGE_PULL:-0}" = "1" ]; then
  echo "Using preloaded container images"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans --pull never
else
  if [ "${REGISTRY_USERNAME:-}" != "" ] && [ "${REGISTRY_PASSWORD:-}" != "" ]; then
    echo "$REGISTRY_PASSWORD" | docker login "${REGISTRY:-docker.io}" -u "$REGISTRY_USERNAME" --password-stdin
  fi

  pulled=0
  for attempt in 1 2 3 4 5; do
    if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull; then
      pulled=1
      break
    fi
    echo "pull attempt $attempt failed, waiting 15s..."
    sleep 15
  done

  if [ "$pulled" != "1" ]; then
    echo "image pull failed after 5 attempts" >&2
    exit 1
  fi

  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans
fi

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl --noproxy "*" -fsS "$HEALTH_API_URL" >/dev/null &&
    curl --noproxy "*" -fsS "$HEALTH_WEB_URL" >/dev/null; then
    docker image prune -f >/dev/null
    echo "Tencent Cloud deploy OK"
    exit 0
  fi
  echo "health check attempt $attempt failed, waiting 6s..."
  sleep 6
done

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
echo "deployment did not become healthy" >&2
exit 1
