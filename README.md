# Sahaburapa-project
For Webdesign

## Claude Code skills

This project uses the UI UX Pro Max skill set (ui-ux-pro-max, design-system,
design, ui-styling, brand, slides, banner-design) plus Anthropic's
frontend-design and mcp-builder skills. They are not stored in the repo:

- In Claude Code cloud sessions they are installed automatically at session
  start by `.claude/hooks/session-start.sh`.
- Locally, run `bash scripts/install-skills.sh` once (needs Node.js, git and
  Python 3).

## MCP server

`mcp-servers/ui-ux-pro-max-mcp-server` exposes the UI UX Pro Max design database
as MCP tools: generate or save a design system, and search styles, palettes,
fonts, UX guidelines and framework rules. It is registered in `.mcp.json` as
`ui-ux-pro-max` and builds itself on first start. See its README for details.
