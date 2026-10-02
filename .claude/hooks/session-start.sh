#!/bin/bash
# SessionStart hook: installs the project's Claude Code skills in cloud sessions.
# Run scripts/install-skills.sh yourself to install them locally.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

bash "$CLAUDE_PROJECT_DIR/scripts/install-skills.sh"
