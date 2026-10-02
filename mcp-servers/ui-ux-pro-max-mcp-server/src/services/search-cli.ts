import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { PYTHON, SCRIPT_TIMEOUT_MS, SEARCH_SCRIPT } from "../constants.js";
import type { DesignDials } from "../types.js";

/** An error whose message is safe and useful to show to the calling agent. */
export class SearchCliError extends Error {}

/**
 * Runs the ui-ux-pro-max search script and returns stdout.
 * Arguments go straight to execFile (no shell), and the query follows `--`,
 * so query text can neither inject commands nor be read as a flag.
 */
export async function runSearchScript(query: string, flags: string[]): Promise<string> {
  try {
    await access(SEARCH_SCRIPT);
  } catch {
    throw new SearchCliError(
      `The ui-ux-pro-max skill is not installed (missing ${SEARCH_SCRIPT}). ` +
        "Run `bash scripts/install-skills.sh` from the repository root, or set UIUX_SKILL_DIR."
    );
  }

  return new Promise((resolve, reject) => {
    execFile(
      PYTHON,
      [SEARCH_SCRIPT, ...flags, "--", query],
      {
        timeout: SCRIPT_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONDONTWRITEBYTECODE: "1" },
      },
      (error, stdout, stderr) => {
        if (!error) {
          resolve(stdout);
          return;
        }
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
          reject(new SearchCliError(`Python was not found ("${PYTHON}"). Install Python 3 or set UIUX_PYTHON.`));
        } else if (error.killed) {
          reject(new SearchCliError(`The search timed out after ${SCRIPT_TIMEOUT_MS / 1000}s. Try a shorter query.`));
        } else {
          const detail = lastLine(stderr) || error.message;
          console.error(`search.py failed: ${stderr || error.message}`);
          reject(new SearchCliError(`The search script failed: ${detail}`));
        }
      }
    );
  });
}

/** Runs the script with `--json` and parses its output. */
export async function runSearchScriptJson<T>(query: string, flags: string[]): Promise<T> {
  const stdout = await runSearchScript(query, [...flags, "--json"]);
  try {
    return JSON.parse(stdout) as T;
  } catch {
    throw new SearchCliError("The search script returned output that is not valid JSON.");
  }
}

/** CLI flags for the optional design dials. */
export function dialArgs(dials: DesignDials): string[] {
  const args: string[] = [];
  for (const name of ["variance", "motion", "density"] as const) {
    const value = dials[name];
    if (value !== undefined) args.push(`--${name}`, String(value));
  }
  return args;
}

/** Formats any thrown value as a tool error message. */
export function errorMessage(error: unknown): string {
  if (error instanceof SearchCliError) return `Error: ${error.message}`;
  console.error(error);
  return `Error: Unexpected failure: ${error instanceof Error ? error.message : String(error)}`;
}

function lastLine(text: string): string {
  const lines = text.trim().split("\n");
  return lines[lines.length - 1]?.trim() ?? "";
}
