# Sahaburapa-project
For Webdesign

## SBP AirCare website (`sbp-aircare/`)

Website prototypes A / B / C for SBP AirCare (บริษัท สหบูรพากรุ๊ป จำกัด): air-conditioner cleaning, installation,
repair and sales, with standard prices from the company Pricebook and interactive 3D explanations.

- **Live site (GitHub Pages):** https://sahaburapaofficial-cmyk.github.io/Sahaburapa-project/ · works on computer, tablet and phone
  (`a.html` · `b.html` · `c.html` for each design). Built by `.github/workflows/sbp-aircare-pages.yml` on every push to `main`.
- **Start here:** `sbp-aircare/HANDOFF.md` (status, rules, todo) → `sbp-aircare/CLAUDE.md` (technical spec).
- **Requests from the site** (quote, contact, feedback) go to a Google Sheet + e-mail once the Apps Script in
  `sbp-aircare/backend/` is deployed (see its README).

## Claude Code skills

This project uses the UI UX Pro Max skill set (ui-ux-pro-max, design-system,
design, ui-styling, brand, slides, banner-design) plus Anthropic's
frontend-design and mcp-builder skills, all committed under `.claude/skills/`.

`scripts/install-skills.sh` reinstalls any skill that is missing (`--force`
reinstalls all of them from their sources) and builds the MCP server below. In
Claude Code cloud sessions it runs automatically at session start via
`.claude/hooks/session-start.sh`. It needs Node.js, git and Python 3.

## MCP server

`mcp-servers/ui-ux-pro-max-mcp-server` exposes the UI UX Pro Max design database
as MCP tools: generate or save a design system, and search styles, palettes,
fonts, UX guidelines and framework rules. It is registered in `.mcp.json` as
`ui-ux-pro-max` and builds itself on first start. See its README for details.
