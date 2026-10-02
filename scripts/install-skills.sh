#!/bin/bash
# Installs the Claude Code skills this project uses into .claude/skills/:
#   - UI UX Pro Max (ui-ux-pro-max-cli >= 2.15.0): ui-ux-pro-max, design-system,
#     design, ui-styling, brand, slides, banner-design
#   - From anthropics/skills: frontend-design, mcp-builder
# and builds the ui-ux-pro-max MCP server in mcp-servers/ (registered in .mcp.json).
# Safe to run repeatedly; skills already present are left alone.
# Pass --force to reinstall everything.
set -euo pipefail

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
SKILLS="$ROOT/.claude/skills"
ANTHROPIC_SKILLS_REF="8a1541c4a3ffa5a20a5a91de0dcf3f0bab1d1ef4"
FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

mkdir -p "$SKILLS"

if [ "$FORCE" = 1 ] || [ ! -f "$SKILLS/ui-ux-pro-max/SKILL.md" ]; then
  echo "Installing UI UX Pro Max skills..." >&2
  (cd "$ROOT" && npx -y --package='ui-ux-pro-max-cli@^2.15.0' uipro init --ai claude) >&2
fi

missing=()
for s in frontend-design mcp-builder; do
  if [ "$FORCE" = 1 ] || [ ! -f "$SKILLS/$s/SKILL.md" ]; then missing+=("$s"); fi
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "Installing from anthropics/skills: ${missing[*]}..." >&2
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  git -C "$tmp" init -q
  git -C "$tmp" remote add origin https://github.com/anthropics/skills
  git -C "$tmp" sparse-checkout set "${missing[@]/#/skills/}"
  git -C "$tmp" fetch -q --depth 1 --filter=blob:none origin "$ANTHROPIC_SKILLS_REF"
  git -C "$tmp" checkout -q FETCH_HEAD
  for s in "${missing[@]}"; do
    rm -rf "${SKILLS:?}/$s"
    cp -r "$tmp/skills/$s" "$SKILLS/$s"
  done
fi

find "$SKILLS" -name __pycache__ -type d -prune -exec rm -rf {} +

if [ "$FORCE" = 1 ]; then
  bash "$ROOT/mcp-servers/ui-ux-pro-max-mcp-server/build.sh" --force
else
  bash "$ROOT/mcp-servers/ui-ux-pro-max-mcp-server/build.sh"
fi
echo "Skills ready: $(ls "$SKILLS" | tr '\n' ' '); MCP server: mcp-servers/ui-ux-pro-max-mcp-server"
