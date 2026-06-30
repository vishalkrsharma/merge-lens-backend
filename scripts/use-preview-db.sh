#!/usr/bin/env bash
# Switch .env.local DATABASE_URL to the Neon preview branch for the current git branch.
# Usage: pnpm db:preview
# Also called automatically by .git/hooks/post-checkout when switching branches.

set -euo pipefail

NEON_PROJECT_ID="falling-field-21678175"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
PREVIEW_BRANCH="preview/${BRANCH}"

# Skip on detached HEAD or master/main
if [[ "$BRANCH" == "HEAD" || "$BRANCH" == "master" || "$BRANCH" == "main" ]]; then
  echo "[db:preview] On ${BRANCH} — keeping DATABASE_URL unchanged."
  exit 0
fi

if ! command -v neonctl &> /dev/null; then
  echo "[db:preview] neonctl not found. Install with: npm i -g neonctl"
  exit 1
fi

echo "[db:preview] Fetching connection string for branch: ${PREVIEW_BRANCH}"

NEON_CS=$(neonctl cs "$PREVIEW_BRANCH" \
  --project-id "$NEON_PROJECT_ID" \
  --role-name neondb_owner \
  --database-name neondb \
  --ssl require \
  --pooled \
  -o json 2>/dev/null) || {
  echo "[db:preview] Preview branch '${PREVIEW_BRANCH}' not found on Neon."
  echo "             Push this branch and open a PR to create it, then re-run."
  exit 1
}

DB_URL=$(echo "$NEON_CS" | jq -r '.connection_string')

if [[ -z "$DB_URL" || "$DB_URL" == "null" ]]; then
  echo "[db:preview] Could not parse connection string from neonctl output."
  exit 1
fi

ENV_FILE=".env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[db:preview] ${ENV_FILE} not found."
  exit 1
fi

# Replace the DATABASE_URL line in-place
if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DB_URL}\"|" "$ENV_FILE"
else
  echo "DATABASE_URL=\"${DB_URL}\"" >> "$ENV_FILE"
fi

echo "[db:preview] DATABASE_URL updated to preview branch: ${PREVIEW_BRANCH}"
