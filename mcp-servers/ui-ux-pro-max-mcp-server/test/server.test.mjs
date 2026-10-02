// End-to-end tests: start the built server over stdio and call each tool.
// Requires the ui-ux-pro-max skill (bash scripts/install-skills.sh) and `npm run build`.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const SERVER = fileURLToPath(new URL("../dist/index.js", import.meta.url));

async function connect(env = {}) {
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(
    new StdioClientTransport({ command: process.execPath, args: [SERVER], env: { ...process.env, ...env }, stderr: "ignore" })
  );
  return client;
}

const text = (result) => result.content.map((c) => c.text).join("\n");

describe("ui-ux-pro-max MCP server", () => {
  let client;
  let projectRoot;

  before(async () => {
    projectRoot = mkdtempSync(path.join(tmpdir(), "uiux-mcp-"));
    client = await connect({ UIUX_PROJECT_ROOT: projectRoot });
  });

  after(async () => {
    await client?.close();
    rmSync(projectRoot, { recursive: true, force: true });
  });

  test("lists the four tools with annotations", async () => {
    const { tools } = await client.listTools();
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    assert.deepEqual(Object.keys(byName).sort(), [
      "uiux_generate_design_system",
      "uiux_save_design_system",
      "uiux_search",
      "uiux_search_stack",
    ]);
    assert.equal(byName.uiux_search.annotations.readOnlyHint, true);
    assert.equal(byName.uiux_save_design_system.annotations.readOnlyHint, false);
  });

  test("generates a design system as markdown", async () => {
    const result = await client.callTool({
      name: "uiux_generate_design_system",
      arguments: { query: "beauty spa wellness service", project_name: "Lotus Spa" },
    });
    assert.ok(!result.isError, text(result));
    assert.match(text(result), /## Design System: Lotus Spa/);
    assert.match(text(result), /### Colors[\s\S]*#[0-9A-F]{6}/);
  });

  test("generates a design system as JSON with dials", async () => {
    const result = await client.callTool({
      name: "uiux_generate_design_system",
      arguments: { query: "saas analytics dashboard", project_name: "Metrics", density: 9, response_format: "json" },
    });
    assert.ok(!result.isError, text(result));
    assert.equal(result.structuredContent.project_name, "Metrics");
    assert.match(result.structuredContent.colors.primary, /^#[0-9A-F]{6}$/i);
    assert.equal(result.structuredContent.dials.density, 9);
  });

  test("searches a domain", async () => {
    const result = await client.callTool({
      name: "uiux_search",
      arguments: { query: "luxury serif", domain: "typography", max_results: 1, response_format: "json" },
    });
    assert.ok(!result.isError, text(result));
    assert.equal(result.structuredContent.count, 1);
    assert.equal(result.structuredContent.results[0]["Heading Font"], "Cormorant");
  });

  test("treats a query starting with '-' as text, not a flag", async () => {
    const result = await client.callTool({
      name: "uiux_search",
      arguments: { query: "-ds luxury", domain: "typography", response_format: "json" },
    });
    assert.ok(!result.isError, text(result));
    assert.equal(result.structuredContent.query, "-ds luxury");
  });

  test("explains when nothing matches", async () => {
    const result = await client.callTool({ name: "uiux_search_stack", arguments: { query: "button", stack: "react" } });
    assert.ok(!result.isError, text(result));
    assert.match(text(result), /No matches/);
    assert.match(text(result), /Did you mean: "buttons"/);
  });

  test("searches stack guidelines as markdown", async () => {
    const result = await client.callTool({ name: "uiux_search_stack", arguments: { query: "forms", stack: "nextjs", max_results: 2 } });
    assert.ok(!result.isError, text(result));
    assert.match(text(result), /^# UI UX Pro Max: nextjs stack results for "forms"/);
    assert.match(text(result), /## 1\. /);
  });

  test("saves a design system, keeps existing files, and overwrites with force", async () => {
    const args = { query: "beauty spa wellness service", project_name: "Lotus Spa", page: "booking" };
    const master = path.join(projectRoot, "design-system/lotus-spa/MASTER.md");

    const first = await client.callTool({ name: "uiux_save_design_system", arguments: args });
    assert.ok(!first.isError, text(first));
    assert.equal(first.structuredContent.status, "success");
    assert.deepEqual(first.structuredContent.files_written, [
      "design-system/lotus-spa/MASTER.md",
      "design-system/lotus-spa/pages/booking.md",
    ]);
    assert.ok(existsSync(master));
    assert.ok(existsSync(path.join(projectRoot, "design-system/lotus-spa/pages/booking.md")));

    const second = await client.callTool({ name: "uiux_save_design_system", arguments: args });
    assert.equal(second.structuredContent.status, "skipped_exists");
    assert.match(text(second), /Nothing was saved/);

    const forced = await client.callTool({ name: "uiux_save_design_system", arguments: { ...args, force: true } });
    assert.equal(forced.structuredContent.status, "success");
    assert.match(readFileSync(master, "utf8"), /Lotus Spa/i);
  });

  test("refuses to save outside the project", async () => {
    const result = await client.callTool({
      name: "uiux_save_design_system",
      arguments: { query: "spa", project_name: "Escape", output_dir: "../outside" },
    });
    assert.equal(result.isError, true);
    assert.match(text(result), /outside the project/);
    assert.ok(!existsSync(path.join(projectRoot, "../outside")));
  });

  test("rejects invalid arguments", async () => {
    const result = await client
      .callTool({ name: "uiux_search", arguments: { query: "spa", domain: "nope" } })
      .catch((error) => ({ isError: true, content: [{ text: String(error) }] }));
    assert.equal(result.isError, true);
    assert.match(text(result), /domain/);
  });

  test("tells the agent how to install the skill when it is missing", async () => {
    const missing = await connect({ UIUX_SKILL_DIR: path.join(projectRoot, "no-skill") });
    try {
      const result = await missing.callTool({ name: "uiux_search", arguments: { query: "spa" } });
      assert.equal(result.isError, true);
      assert.match(text(result), /install-skills\.sh/);
    } finally {
      await missing.close();
    }
  });
});
