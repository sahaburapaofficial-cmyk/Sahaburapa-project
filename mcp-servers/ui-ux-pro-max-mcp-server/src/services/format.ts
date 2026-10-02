import { CHARACTER_LIMIT } from "../constants.js";
import type { SearchResult, SearchRow } from "../types.js";

/** Renders search results as Markdown, one section per row, skipping empty columns. */
export function searchResultToMarkdown(result: SearchResult): string {
  const scope = result.stack ? `${result.stack} stack` : `${result.domain} domain`;
  const lines = [`# UI UX Pro Max: ${scope} results for "${result.query}"`, ""];

  if (result.count === 0) {
    lines.push(`No matches in ${result.file}.`);
    if (result.suggestions?.length) {
      lines.push("", `Did you mean: ${result.suggestions.map((s) => `"${s}"`).join(", ")}?`);
    }
    lines.push("", "Try broader keywords, or search a different domain.");
    return lines.join("\n");
  }

  const detected = result.auto_detected ? " (domain auto-detected from the query)" : "";
  lines.push(`Showing ${result.results.length} result(s) from \`${result.file}\`${detected}.`, "");
  result.results.forEach((row, i) => {
    lines.push(`## ${i + 1}. ${rowTitle(row)}`);
    for (const [key, value] of Object.entries(row)) {
      if (isFilled(value)) lines.push(`- **${key}**: ${value}`);
    }
    lines.push("");
  });
  if (result.truncation_message) lines.push(`_${result.truncation_message}_`);
  return lines.join("\n").trimEnd();
}

/**
 * Drops rows from the end until both renderings fit within CHARACTER_LIMIT,
 * marking the result as truncated when anything was removed.
 */
export function fitSearchResult(result: SearchResult): SearchResult {
  const total = result.results.length;
  let fitted = result;
  while (
    fitted.results.length > 1 &&
    (JSON.stringify(fitted, null, 2).length > CHARACTER_LIMIT ||
      searchResultToMarkdown(fitted).length > CHARACTER_LIMIT)
  ) {
    const results = fitted.results.slice(0, Math.ceil(fitted.results.length / 2));
    fitted = {
      ...result,
      results,
      count: results.length,
      truncated: true,
      truncation_message:
        `Response truncated from ${total} to ${results.length} results to stay under ` +
        `${CHARACTER_LIMIT} characters. Lower max_results or use more specific keywords.`,
    };
  }
  return fitted;
}

function rowTitle(row: SearchRow): string {
  return Object.values(row).find(isFilled) ?? "Untitled";
}

// Short CSV rows come back with null cells, so don't trust the declared string type.
function isFilled(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim() !== "";
}
