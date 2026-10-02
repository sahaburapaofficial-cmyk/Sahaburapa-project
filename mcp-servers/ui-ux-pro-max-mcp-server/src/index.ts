#!/usr/bin/env node
/**
 * MCP server for the UI UX Pro Max design database.
 *
 * Exposes the installed ui-ux-pro-max skill (.claude/skills/ui-ux-pro-max) as tools:
 * design system generation, saving design systems as files, and search across
 * styles, palettes, font pairings, UX guidelines and framework-specific rules.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PROJECT_ROOT, SKILL_DIR } from "./constants.js";
import { registerDesignSystemTools } from "./tools/design-system.js";
import { registerSearchTools } from "./tools/search.js";

const USAGE = `ui-ux-pro-max-mcp-server: stdio MCP server for the UI UX Pro Max design database.

Usage: node dist/index.js

Environment:
  UIUX_SKILL_DIR     ui-ux-pro-max skill folder (default: <repo>/.claude/skills/ui-ux-pro-max)
  UIUX_PROJECT_ROOT  folder saved design systems must stay inside (default: <repo>)
  UIUX_PYTHON        Python 3 executable (default: python3)

Tools: uiux_generate_design_system, uiux_save_design_system, uiux_search, uiux_search_stack`;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.error(USAGE);
  process.exit(0);
}

const server = new McpServer({ name: "ui-ux-pro-max-mcp-server", version: "1.0.0" });
registerDesignSystemTools(server);
registerSearchTools(server);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  console.error(`ui-ux-pro-max MCP server running via stdio (skill: ${SKILL_DIR}, project: ${PROJECT_ROOT})`);
}

main().catch((error: unknown) => {
  console.error("Server error:", error);
  process.exit(1);
});
