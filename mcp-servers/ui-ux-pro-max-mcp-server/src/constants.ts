import path from "node:path";
import { fileURLToPath } from "node:url";

// dist/constants.js -> server dir -> mcp-servers/ -> repository root
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** Root that saved design systems must stay inside. */
export const PROJECT_ROOT = path.resolve(process.env.UIUX_PROJECT_ROOT ?? REPO_ROOT);

/** Installed ui-ux-pro-max skill (see scripts/install-skills.sh). */
export const SKILL_DIR = path.resolve(
  process.env.UIUX_SKILL_DIR ?? path.join(REPO_ROOT, ".claude/skills/ui-ux-pro-max")
);
export const SEARCH_SCRIPT = path.join(SKILL_DIR, "scripts/search.py");
export const PYTHON = process.env.UIUX_PYTHON ?? "python3";

export const SCRIPT_TIMEOUT_MS = 30_000;
export const CHARACTER_LIMIT = 25_000;

export const DOMAINS = [
  "style",
  "color",
  "chart",
  "landing",
  "product",
  "ux",
  "typography",
  "icons",
  "gsap",
  "react",
  "web",
  "google-fonts",
] as const;

export const STACKS = [
  "react",
  "nextjs",
  "vue",
  "svelte",
  "astro",
  "swiftui",
  "react-native",
  "flutter",
  "nuxtjs",
  "nuxt-ui",
  "html-tailwind",
  "shadcn",
  "jetpack-compose",
  "threejs",
  "angular",
  "laravel",
  "javafx",
  "wpf",
  "winui",
  "avalonia",
  "uno",
  "uwp",
] as const;

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}
