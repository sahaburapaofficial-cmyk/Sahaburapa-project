import { z } from "zod";
import { DOMAINS, ResponseFormat, STACKS } from "./constants.js";

const query = z
  .string()
  .trim()
  .min(2, "Query must be at least 2 characters")
  .max(200, "Query must not exceed 200 characters");

const responseFormat = z
  .nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

const maxResults = z
  .number()
  .int()
  .min(1)
  .max(20)
  .default(5)
  .describe("Maximum results to return, 1-20 (default: 5)");

const dial = (description: string) => z.number().int().min(1).max(10).optional().describe(description);

const designSystemFields = {
  query: query.describe(
    "What is being built: product type, industry and mood, e.g. 'beauty spa wellness booking site' or 'fintech dashboard dark'"
  ),
  project_name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe("Project name shown in the design system, e.g. 'Lotus Spa'"),
  variance: dial("Layout boldness: 1 = centered/minimal, 10 = bold/asymmetric"),
  motion: dial("Animation intensity: 1 = subtle, 10 = complex; adds a matching GSAP snippet"),
  density: dial("Visual density: 1 = spacious, 10 = dense/dashboard; sets the spacing scale"),
};

export const GenerateDesignSystemSchema = z
  .object({
    ...designSystemFields,
    response_format: responseFormat,
  })
  .strict();

export const SaveDesignSystemSchema = z
  .object({
    ...designSystemFields,
    page: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .optional()
      .describe("Optional page name, e.g. 'booking' or 'pricing'; also writes pages/<page>.md with page-specific overrides"),
    output_dir: z
      .string()
      .max(500)
      .default(".")
      .describe("Directory to save into, relative to the project root (default: the project root). Must stay inside the project."),
    force: z
      .boolean()
      .default(false)
      .describe("Overwrite existing MASTER.md / page files. Read the existing files first; they may hold earlier design decisions."),
  })
  .strict();

export const SearchSchema = z
  .object({
    query: query.describe("Keywords to search for, e.g. 'glassmorphism', 'luxury serif', 'form validation'"),
    domain: z
      .enum(DOMAINS)
      .optional()
      .describe(
        "Which database to search. style = UI styles; color = product palettes; chart = chart types; " +
          "landing = landing page patterns; product = product-type recommendations; ux = UX guidelines; " +
          "typography = font pairings; icons = icon picks; gsap = animation presets; react = React performance rules; " +
          "web = web interface guidelines; google-fonts = individual Google Fonts. Omit to auto-detect from the query."
      ),
    max_results: maxResults,
    response_format: responseFormat,
  })
  .strict();

export const SearchStackSchema = z
  .object({
    query: query.describe("Topic to look up, e.g. 'forms', 'navigation', 'image optimization', 'state management'"),
    stack: z.enum(STACKS).describe("Framework or UI stack to get implementation guidelines for"),
    max_results: maxResults,
    response_format: responseFormat,
  })
  .strict();

export type GenerateDesignSystemInput = z.infer<typeof GenerateDesignSystemSchema>;
export type SaveDesignSystemInput = z.infer<typeof SaveDesignSystemSchema>;
export type SearchInput = z.infer<typeof SearchSchema>;
export type SearchStackInput = z.infer<typeof SearchStackSchema>;
