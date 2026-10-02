import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PROJECT_ROOT, ResponseFormat } from "../constants.js";
import {
  GenerateDesignSystemSchema,
  SaveDesignSystemSchema,
  type GenerateDesignSystemInput,
  type SaveDesignSystemInput,
} from "../schemas.js";
import { SearchCliError, dialArgs, errorMessage, runSearchScript, runSearchScriptJson } from "../services/search-cli.js";
import type { DesignSystem, DesignSystemOutput } from "../types.js";

export function registerDesignSystemTools(server: McpServer): void {
  server.registerTool(
    "uiux_generate_design_system",
    {
      title: "Generate UI Design System",
      description: `Generate a complete design system recommendation for a product from the UI UX Pro Max database.

Picks a landing page pattern, UI style, colour palette (with CSS variables), font pairing (with Google Fonts import), key effects, anti-patterns to avoid and a pre-delivery checklist, based on the product type and mood in the query. Nothing is written to disk; use uiux_save_design_system to save it as files.

Args:
  - query (string): What is being built, e.g. "beauty spa wellness booking site"
  - project_name (string): Name shown in the output, e.g. "Lotus Spa"
  - variance, motion, density (1-10, optional): Layout boldness, animation intensity, visual density
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Markdown: headed sections (Pattern, Style, Colors table, Typography, Key Effects, Avoid, Checklist).
  JSON: { project_name, category, pattern: {name, sections, cta_placement, ...}, style: {id, name, keywords, ...},
          colors: {primary, secondary, accent, background, foreground, ...}, typography: {heading, body, google_fonts_url, css_import, ...},
          key_effects, anti_patterns, decision_rules, dials, motion_snippet, spacing_scale, ... }

Examples:
  - "Design a site for a day spa" -> query="beauty spa wellness service", project_name="Lotus Spa"
  - "Dense analytics dashboard" -> query="saas analytics dashboard", density=9
  - Don't use when: you only need one thing, like a font pairing (use uiux_search with domain="typography")`,
      inputSchema: GenerateDesignSystemSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params: GenerateDesignSystemInput) => {
      try {
        const flags = designSystemFlags(params);
        if (params.response_format === ResponseFormat.JSON) {
          const { design_system } = await runSearchScriptJson<DesignSystemOutput>(params.query, flags);
          return {
            content: [{ type: "text", text: JSON.stringify(design_system, null, 2) }],
            structuredContent: design_system,
          };
        }
        const markdown = await runSearchScript(params.query, [...flags, "--format", "markdown"]);
        return { content: [{ type: "text", text: markdown.trim() }] };
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: errorMessage(error) }] };
      }
    }
  );

  server.registerTool(
    "uiux_save_design_system",
    {
      title: "Save UI Design System to Files",
      description: `Generate a design system (same as uiux_generate_design_system) and save it in the project as Markdown files.

Writes <output_dir>/design-system/<project-slug>/MASTER.md, plus pages/<page>.md with page-specific overrides when page is given. When building a page, read pages/<page>.md first (its rules override MASTER.md), otherwise MASTER.md. Existing files are left alone unless force=true.

Args:
  - query (string): What is being built, e.g. "beauty spa wellness booking site"
  - project_name (string): Project name; also names the folder, e.g. "Lotus Spa" -> design-system/lotus-spa/
  - page (string, optional): Page name, e.g. "booking"
  - output_dir (string): Folder relative to the project root (default: ".")
  - force (boolean): Overwrite existing files (default: false)
  - variance, motion, density (1-10, optional): Layout boldness, animation intensity, visual density

Returns:
  { status: "success" | "skipped_exists", design_system_dir, files_written: string[], message?,
    summary: { category, pattern, style, colors: {primary, secondary, accent, background, foreground}, fonts: {heading, body} } }
  Paths are relative to the project root.

Examples:
  - "Set up the design system for the spa site" -> query="beauty spa wellness service", project_name="Lotus Spa"
  - "Add booking page rules" -> same query and project_name, page="booking"

Error Handling:
  - status "skipped_exists" means nothing was written because the file exists: read it, then retry with force=true only if it should be replaced
  - Returns an error if output_dir points outside the project`,
      inputSchema: SaveDesignSystemSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (params: SaveDesignSystemInput) => {
      try {
        const outputDir = resolveInsideProject(params.output_dir);
        const flags = [...designSystemFlags(params), "--persist", "--output-dir", outputDir];
        if (params.page) flags.push("--page", params.page);
        if (params.force) flags.push("--force");

        const { design_system, persistence } = await runSearchScriptJson<DesignSystemOutput>(params.query, flags);
        if (!persistence) throw new SearchCliError("The script did not report what it saved.");

        const output = {
          status: persistence.status,
          design_system_dir: relative(persistence.design_system_dir),
          files_written: persistence.created_files.map(relative),
          ...(persistence.message ? { message: persistence.message.replaceAll(PROJECT_ROOT + path.sep, "") } : {}),
          summary: summarize(design_system),
        };
        return {
          content: [{ type: "text", text: saveResultToMarkdown(output, relative(persistence.master_file)) }],
          structuredContent: output,
        };
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: errorMessage(error) }] };
      }
    }
  );
}

function designSystemFlags(params: GenerateDesignSystemInput | SaveDesignSystemInput): string[] {
  return ["--design-system", "--project-name", params.project_name, ...dialArgs(params)];
}

/** Resolves a directory against the project root, refusing anything that escapes it. */
function resolveInsideProject(dir: string): string {
  const resolved = path.resolve(PROJECT_ROOT, dir);
  const rel = path.relative(PROJECT_ROOT, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new SearchCliError(
      `output_dir "${dir}" is outside the project. Use a path relative to the project root, such as "." or "docs".`
    );
  }
  return resolved;
}

function relative(file: string): string {
  return path.relative(PROJECT_ROOT, file) || ".";
}

function summarize(ds: DesignSystem) {
  const colors = ds.colors ?? {};
  return {
    category: ds.category,
    pattern: ds.pattern?.name ?? null,
    style: ds.style?.name ?? null,
    colors: {
      primary: colors.primary ?? null,
      secondary: colors.secondary ?? null,
      accent: colors.accent ?? null,
      background: colors.background ?? null,
      foreground: colors.foreground ?? null,
    },
    fonts: { heading: ds.typography?.heading ?? null, body: ds.typography?.body ?? null },
  };
}

function saveResultToMarkdown(output: {
  status: string;
  design_system_dir: string;
  files_written: string[];
  message?: string;
  summary: ReturnType<typeof summarize>;
}, masterFile: string): string {
  if (output.status === "skipped_exists") {
    return [
      "Nothing was saved: the file already exists and force was not set.",
      "",
      output.message ?? "",
      "",
      "Read the existing file first. Call again with force=true only if it should be replaced.",
    ].join("\n").trim();
  }

  const { summary } = output;
  const lines = [`# Design system saved to \`${output.design_system_dir}/\``, "", "Files written:"];
  lines.push(...output.files_written.map((f) => `- \`${f}\``));
  if (!output.files_written.includes(masterFile)) {
    lines.push(`- (\`${masterFile}\` already existed and was kept)`);
  }
  lines.push(
    "",
    `When building a page, read \`${output.design_system_dir}/pages/<page>.md\` first if it exists; its rules override MASTER.md.`,
    "",
    "## Summary",
    `- **Category**: ${summary.category}`,
    `- **Pattern**: ${summary.pattern}`,
    `- **Style**: ${summary.style}`,
    `- **Colors**: primary ${summary.colors.primary}, secondary ${summary.colors.secondary}, accent ${summary.colors.accent}, ` +
      `background ${summary.colors.background}, text ${summary.colors.foreground}`,
    `- **Fonts**: ${summary.fonts.heading} (headings), ${summary.fonts.body} (body)`
  );
  return lines.join("\n");
}
