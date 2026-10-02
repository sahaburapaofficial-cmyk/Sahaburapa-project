# ui-ux-pro-max-mcp-server

A local (stdio) MCP server that exposes the UI UX Pro Max design database from
`.claude/skills/ui-ux-pro-max` as tools. Any MCP client can use it to generate a
design system, save one as files in the project, or look up styles, palettes, font
pairings, UX guidelines and framework-specific rules. The data is local, so it
needs no API key and no network access.

## Tools

| Tool | What it does | Writes files? |
|------|--------------|---------------|
| `uiux_generate_design_system` | Full design system for a product: pattern, style, colour palette (CSS variables), fonts, effects, anti-patterns, checklist | No |
| `uiux_save_design_system` | Same, saved as `design-system/<project>/MASTER.md` (plus `pages/<page>.md` overrides) | Yes, inside the project only. Existing files are kept unless `force=true` |
| `uiux_search` | Search one domain: `style`, `color`, `chart`, `landing`, `product`, `ux`, `typography`, `icons`, `gsap`, `react`, `web`, `google-fonts` (or auto-detect) | No |
| `uiux_search_stack` | Implementation guidelines for a stack: `react`, `nextjs`, `vue`, `svelte`, `astro`, `html-tailwind`, `shadcn`, `flutter`, `swiftui` and more | No |

Every tool takes `response_format`: `markdown` (default) or `json` (also returned as structured content).

Examples:

- `uiux_generate_design_system { "query": "beauty spa wellness service", "project_name": "Lotus Spa" }`
- `uiux_save_design_system { "query": "beauty spa wellness service", "project_name": "Lotus Spa", "page": "booking" }`
- `uiux_search { "query": "luxury elegant", "domain": "typography" }`
- `uiux_search_stack { "query": "forms", "stack": "nextjs" }`

## Setup

It is already registered for Claude Code in the repository's `.mcp.json` as `ui-ux-pro-max`.
`run.sh` builds the server the first time it starts, and the SessionStart hook
(`scripts/install-skills.sh`) builds it in cloud sessions. Requirements: Node.js 18+,
Python 3, and the ui-ux-pro-max skill (`bash scripts/install-skills.sh`).

For another MCP client, run `bash mcp-servers/ui-ux-pro-max-mcp-server/run.sh` as a stdio server.

Environment variables (all optional):

- `UIUX_SKILL_DIR`: ui-ux-pro-max skill folder (default: `<repo>/.claude/skills/ui-ux-pro-max`)
- `UIUX_PROJECT_ROOT`: folder that saved design systems must stay inside (default: the repository root)
- `UIUX_PYTHON`: Python 3 executable (default: `python3`)

## Development

```bash
npm install
npm run build   # compile src/ to dist/
npm test        # build, then end-to-end tests over stdio
npx @modelcontextprotocol/inspector node dist/index.js   # try the tools interactively
```

The tools run the skill's `scripts/search.py` with `execFile`. There is no shell, and the query
is passed after `--`, so it can't run commands or be read as an option. `evaluation.xml` holds 10
verified questions for the mcp-builder evaluation harness.
