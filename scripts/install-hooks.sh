#!/usr/bin/env bash
# Install git hooks for this repo. Run once after cloning.
# Usage: pnpm hooks:install

set -euo pipefail

HOOKS_DIR="$(git rev-parse --git-dir)/hooks"
REPO_ROOT="$(git rev-parse --show-toplevel)"

cat > "$HOOKS_DIR/post-checkout" << 'EOF'
#!/usr/bin/env bash
# post-checkout hook: switch Neon preview DB when changing branches.
# $1 = previous HEAD, $2 = new HEAD, $3 = 1 if branch checkout, 0 if file checkout

CHECKOUT_TYPE=$3
if [[ "$CHECKOUT_TYPE" != "1" ]]; then
  exit 0  # file checkout, not a branch switch — skip
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
bash "$REPO_ROOT/scripts/use-preview-db.sh" || true  # non-fatal
EOF

chmod +x "$HOOKS_DIR/post-checkout"
echo "Installed post-checkout hook → ${HOOKS_DIR}/post-checkout"
