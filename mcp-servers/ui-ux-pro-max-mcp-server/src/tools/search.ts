import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResponseFormat } from "../constants.js";
import { SearchSchema, SearchStackSchema, type SearchInput, type SearchStackInput } from "../schemas.js";
import { fitSearchResult, searchResultToMarkdown } from "../services/format.js";
import { errorMessage, runSearchScriptJson } from "../services/search-cli.js";
import type { SearchResult } from "../types.js";

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    "uiux_search",
    {
      title: "Search UI/UX Design Database",
      description: `Search one part of the UI UX Pro Max database: UI styles, colour palettes, font pairings, UX guidelines, chart types, landing page patterns, product-type recommendations, icons, GSAP animation presets, React performance rules, web interface guidelines or Google Fonts.

Ranks rows by keyword relevance (BM25). Read-only.

Args:
  - query (string): Keywords, e.g. "glassmorphism", "luxury serif", "form validation"
  - domain (optional): style | color | chart | landing | product | ux | typography | icons | gsap | react | web | google-fonts. Omit to auto-detect.
  - max_results (number): 1-20 (default: 5)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  JSON: { domain, query, file, count, results: [ {<column>: <value>, ...} ], auto_detected?, suggestions?, truncated? }
  Columns depend on the domain, e.g. typography rows have "Font Pairing Name", "Heading Font", "Body Font", "Google Fonts URL", "CSS Import".
  When nothing matches, count is 0 and "suggestions" may list close keywords.

Examples:
  - "Which fonts suit a luxury brand?" -> query="luxury elegant", domain="typography"
  - "Palette for a fintech app" -> query="fintech banking", domain="color"
  - "Accessibility rules for forms" -> query="form accessibility", domain="ux"
  - Don't use when: you want a whole design system (use uiux_generate_design_system) or framework-specific advice (use uiux_search_stack)`,
      inputSchema: SearchSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params: SearchInput) => {
      const flags = ["--max-results", String(params.max_results)];
      if (params.domain) flags.push("--domain", params.domain);
      return searchResponse(params.query, flags, params.response_format);
    }
  );

  server.registerTool(
    "uiux_search_stack",
    {
      title: "Search Framework UI Guidelines",
      description: `Search implementation guidelines for one UI framework or stack (React, Next.js, Vue, Svelte, Astro, Tailwind, shadcn/ui, Flutter, SwiftUI and more) in the UI UX Pro Max database.

Each row is a do/don't guideline with code examples and severity. Read-only.

Args:
  - query (string): Topic, e.g. "forms", "navigation", "image optimization"
  - stack: react | nextjs | vue | svelte | astro | swiftui | react-native | flutter | nuxtjs | nuxt-ui | html-tailwind | shadcn | jetpack-compose | threejs | angular | laravel | javafx | wpf | winui | avalonia | uno | uwp
  - max_results (number): 1-20 (default: 5)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  JSON: { domain: "stack", stack, query, file, count, results: [ {Category, Guideline, Description, Do, Don't, "Code Good", "Code Bad", Severity, Docs URL, ...} ], suggestions? }
  When nothing matches, count is 0 and "suggestions" may list close keywords (e.g. "buttons" for "button").

Examples:
  - "Best way to build forms in Next.js" -> query="forms", stack="nextjs"
  - "Tailwind responsive layout tips" -> query="responsive layout", stack="html-tailwind"
  - Don't use when: the question isn't tied to a framework (use uiux_search)`,
      inputSchema: SearchStackSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (params: SearchStackInput) =>
      searchResponse(params.query, ["--stack", params.stack, "--max-results", String(params.max_results)], params.response_format)
  );
}

async function searchResponse(query: string, flags: string[], format: ResponseFormat) {
  try {
    const result = fitSearchResult(await runSearchScriptJson<SearchResult>(query, flags));
    if (format === ResponseFormat.JSON) {
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }], structuredContent: result };
    }
    return { content: [{ type: "text" as const, text: searchResultToMarkdown(result) }] };
  } catch (error) {
    return { isError: true, content: [{ type: "text" as const, text: errorMessage(error) }] };
  }
}
