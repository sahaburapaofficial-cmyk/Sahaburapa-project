#!/bin/bash
# SessionStart hook: installs the project's Claude Code skills in cloud sessions.
# Run scripts/install-skills.sh yourself to install them locally.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

bash "$CLAUDE_PROJECT_DIR/scripts/install-skills.sh"

# SBP AirCare website: test tools (Playwright uses the pre-installed Chromium; never run `npx playwright install` here)
if [ -f "$CLAUDE_PROJECT_DIR/sbp-aircare/package.json" ]; then
  (cd "$CLAUDE_PROJECT_DIR/sbp-aircare" && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-audit --no-fund >&2)
  echo "SBP AirCare: read sbp-aircare/HANDOFF.md first. Tests: npm run serve, then smoke / smoke:mobile / textscan / submit."
fi
