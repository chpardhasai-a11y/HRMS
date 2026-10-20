#!/usr/bin/env bash
set -euo pipefail
# Resets ONLY the disposable test database in the dedicated test container.
cd "$(dirname "$0")/.."
container=hrms-flow-platform-test
if ! docker inspect "$container" >/dev/null 2>&1; then
  docker run --name "$container" -e POSTGRES_USER=flowtest -e POSTGRES_PASSWORD=flowtest -e POSTGRES_DB=flowtest -p 127.0.0.1:5544:5432 -d postgres:16-alpine
else
  docker start "$container" >/dev/null
fi
for attempt in $(seq 1 30); do
  if docker exec "$container" pg_isready -U flowtest -d flowtest >/dev/null 2>&1; then break; fi
  sleep 1
done
# The database and container names are deliberately fixed, never read from DATABASE_URL.
docker exec "$container" psql -v ON_ERROR_STOP=1 -U flowtest -d flowtest -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;' >/dev/null
for migration in prisma/migrations/*/migration.sql; do
  if [[ "$migration" != *20261020000000_generic_workflow_platform* ]]; then
    docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U flowtest -d flowtest < "$migration" >/dev/null
  fi
done
docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U flowtest -d flowtest < test/workflow-legacy-fixtures.sql >/dev/null
docker exec -i "$container" psql -v ON_ERROR_STOP=1 -U flowtest -d flowtest < prisma/migrations/20261020000000_generic_workflow_platform/migration.sql >/dev/null
printf 'Disposable workflow database ready on 127.0.0.1:5544/flowtest.\n'
