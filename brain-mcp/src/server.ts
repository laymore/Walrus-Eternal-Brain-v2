/**
 * ═══════════════════════════════════════════════════════════════════
 *  brain-mcp — Phase 10: Uniform Model Access
 * ═══════════════════════════════════════════════════════════════════
 *
 *  The universal socket: exposes the Walrus Eternal Brain as MCP tools so
 *  ANY model-client (Claude Code, Antigravity, Cursor, GPT, Gemini) can use
 *  the SAME sovereign brain with zero glue code.
 *
 *  Reads credentials from env (never hardcoded):
 *    MEMWAL_ACCOUNT_ID   (or VITE_MEMWAL_ACCOUNT_ID)
 *    MEMWAL_DELEGATE_KEY (or VITE_MEMWAL_DELEGATE_KEY)
 *    MEMWAL_SERVER_URL   (default: https://relayer.memory.walrus.xyz)
 *    BRAIN_PROJECT_ID    (default: mcp-session)
 *    BRAIN_SOURCE_MODEL  (tag which model wrote a trace; provenance)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { WalrusEternalBrain, projectIdentity } from "eternal-agent-brain-core";

const accountId = process.env.MEMWAL_ACCOUNT_ID || process.env.VITE_MEMWAL_ACCOUNT_ID;
const delegateKeyHex = process.env.MEMWAL_DELEGATE_KEY || process.env.VITE_MEMWAL_DELEGATE_KEY;
const serverUrl = process.env.MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz";
const sourceModel = process.env.BRAIN_SOURCE_MODEL || "unknown-model";

if (!accountId || !delegateKeyHex) {
  // stderr so it doesn't corrupt the stdio JSON-RPC stream
  console.error("[brain-mcp] Missing MEMWAL_ACCOUNT_ID / MEMWAL_DELEGATE_KEY in env.");
  process.exit(1);
}

const brain = new WalrusEternalBrain({
  delegateKeyHex,
  accountId,
  serverUrl,
  currentProjectId: process.env.BRAIN_PROJECT_ID || "mcp-session",
});

const server = new McpServer({ name: "brain-mcp", version: "1.0.0" });
const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

// ── recall: token-saving context pull (library + session) ────────────
server.tool(
  "brain_recall",
  "Pull context-optimized memory for a query — verified Eternal Library facts + current session context. Use this BEFORE acting to avoid re-learning what the brain already knows (saves LLM tokens).",
  { query: z.string().describe("What you need context about") },
  async ({ query }) => text(await brain.retrieveOptimizedContext(query)),
);

// ── consult library: cross-project reference books ───────────────────
server.tool(
  "brain_consult_library",
  "When stuck on a problem, pull cross-project reference 'books' (distilled reusable knowledge) from the Eternal Library.",
  { problem: z.string().describe("The problem or topic you're stuck on") },
  async ({ problem }) => text(await brain.consultLibrary(problem)),
);

// ── remember: record a working trace to the Thinking Brain ───────────
server.tool(
  "brain_remember",
  "Record a successful working trace / reasoning step / fix into the active Thinking Brain (short-term project memory).",
  { trace: z.string().describe("The trace or lesson to remember") },
  async ({ trace }) => {
    await brain.recordExecutionTrace(`[${sourceModel}] ${trace}`);
    return text("Recorded to the Thinking Brain.");
  },
);

// ── consolidate: crystallize session → Eternal Library ───────────────
server.tool(
  "brain_consolidate",
  "Crystallize the current session's working memory into durable distilled facts in the Eternal Library (end-of-session 'sleep').",
  {},
  async () => text(await brain.consolidateAndCleanSession()),
);

// ── identity: who the brain is ───────────────────────────────────────
server.tool(
  "brain_identity",
  "Who this brain is — the Universal Identity. Pass `format` to get it in YOUR framework's shape so any model recognizes the same soul: 'system-prompt' (ready-to-use behavioural directive — recommended), 'eliza' (bio/lore/style), 'openhands' (runtime/capabilities/constraints), 'crewai' (role/goal/backstory), or 'full' (raw universal object).",
  { format: z.enum(["system-prompt", "eliza", "openhands", "crewai", "full"]).optional() },
  async ({ format }) => {
    const h = await brain.fetchIdentityHistory();
    const cur = h[h.length - 1];
    if (!cur) return text("No identity recorded.");
    const projected = projectIdentity(cur, format ?? "system-prompt");
    const body = typeof projected === "string" ? projected : JSON.stringify(projected, null, 2);
    return text(`# Identity v${cur.version} (of ${h.length})\n\n${body}`);
  },
);

// ── library: list the book-neurons ───────────────────────────────────
server.tool(
  "brain_library",
  "List the book-neurons in the Eternal Library (title, version, tags) and the number of lineage synapses.",
  {},
  async () => {
    const g = await brain.fetchLibraryNeurons();
    const list = g.nodes.map((n: any) => `• ${n.label} v${n.version} [${(n.tags || []).join(", ")}]`).join("\n");
    return text(`${g.nodes.length} neurons · ${g.links.length} synapses\n${list}`);
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[brain-mcp] connected over stdio.");
