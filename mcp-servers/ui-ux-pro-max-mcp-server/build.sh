#!/bin/bash
# Installs dependencies and builds the server if dist/ is missing or older than src/.
# Safe to run concurrently (SessionStart hook and run.sh): builds are serialized with flock.
# All output goes to stderr so run.sh can call this before speaking MCP on stdout.
set -euo pipefail
cd "$(dirname "$0")"

if command -v flock >/dev/null 2>&1; then
  exec 9>".build.lock"
  flock 9
fi

if [ "${1:-}" != "--force" ] && [ -f dist/index.js ] && [ -z "$(find src package.json -newer dist/index.js -print -quit)" ]; then
  exit 0
fi

echo "Building ui-ux-pro-max MCP server..." >&2
npm install --no-audit --no-fund >&2
npm run build >&2
