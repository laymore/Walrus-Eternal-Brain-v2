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
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// CBM bridge (Phase 13-A): if codebase-memory-mcp has indexed this workspace,
// its shareable graph artifact lives at .codebase-memory/graph.db.zst. We never
// parse it — we record provenance (hash + size) in the shelved book so future
// readers know which structural graph this wisdom was distilled from.
function probeCbmArtifact(dir: string): { path: string; size: number; sha256: string } | null {
  try {
    const p = join(dir, ".codebase-memory", "graph.db.zst");
    if (!existsSync(p)) return null;
    const buf = readFileSync(p);
    return { path: p, size: statSync(p).size, sha256: createHash("sha256").update(buf).digest("hex") };
  } catch { return null; }
}

const accountId = process.env.MEMWAL_ACCOUNT_ID || process.env.VITE_MEMWAL_ACCOUNT_ID;
const delegateKeyHex = process.env.MEMWAL_DELEGATE_KEY || process.env.VITE_MEMWAL_DELEGATE_KEY;
const serverUrl = process.env.MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz";
const sourceModel = process.env.BRAIN_SOURCE_MODEL || "unknown-model";

if (!accountId || !delegateKeyHex) {
  // stderr so it doesn't corrupt the stdio JSON-RPC stream
  console.error("[brain-mcp] Missing MEMWAL_ACCOUNT_ID / MEMWAL_DELEGATE_KEY in env.");
  process.exit(1);
}

let currentProjectId = process.env.BRAIN_PROJECT_ID || "mcp-session";
let currentDomain: string | undefined; // set by brain_start_project; stamped onto shelved books
let brain = new WalrusEternalBrain({
  delegateKeyHex,
  accountId,
  serverUrl,
  currentProjectId,
});
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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
  "When stuck on a problem, pull cross-project reference 'books' (distilled reusable knowledge) from the Eternal Library. Returns short TL;DR cards, not full text — call brain_read_book(book_id) to read one in full once it looks relevant.",
  {
    problem: z.string().describe("The problem or topic you're stuck on"),
    domain: z.string().optional().describe("Ecosystem/ context (e.g. 'web3', 'mobile', 'cloud') to avoid confusing same-named playbooks from a different domain"),
  },
  async ({ problem, domain }) => text(await brain.consultLibrary(problem, 8, { domain: domain ?? currentDomain })),
);

// ── read book: pull FULL text of one book on demand ───────────────────
server.tool(
  "brain_read_book",
  "Pull the FULL text of one book by its book_id (as shown in brain_consult_library's TL;DR cards, e.g. '[book:my-title]'). Call this only after the TL;DR looks relevant — avoids blowing the context window on every book up front.",
  { book_id: z.string().describe("The book_id from a consultLibrary TL;DR card, e.g. 'book:deploy-playbook'") },
  async ({ book_id }) => {
    const b = await brain.getBookContent(book_id);
    if (!b) return text(`No book found for "${book_id}".`);
    return text(`# ${b.title} (v${b.version})\n\n${b.content}`);
  },
);

// ── remember: SELECTIVE write to the Thinking Brain (Phase 13-B) ──────
let sessionWrites = 0;
const SESSION_WRITE_BUDGET = 20;
server.tool(
  "brain_remember",
  "Persist ONE precious, durable insight (a hard-won fix, a reusable gotcha, a decision + why). Do NOT stream routine context here — you already have short-term memory of your own. Writes below importance 3 are refused; near-duplicates are skipped; each session has a small write budget. Distill, then write.",
  {
    trace: z.string().describe("The distilled insight worth keeping forever-ish"),
    importance: z.number().min(1).max(5).describe("1=routine (keep it yourself) … 5=hard-won critical knowledge. Only 3+ is persisted."),
  },
  async ({ trace, importance }) => {
    if (sessionWrites >= SESSION_WRITE_BUDGET) {
      return text(`Write budget reached (${SESSION_WRITE_BUDGET}/session). Distill your remaining traces into ONE summary and call brain_shelve_project — don't append more.`);
    }
    const res = await brain.rememberSelective(`[${sourceModel}] ${trace}`, importance);
    if (res.written) sessionWrites++;
    return text(`${res.reason}${res.written ? ` (${sessionWrites}/${SESSION_WRITE_BUDGET} session writes used)` : ""}`);
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
    // Librarian maturity (Phase 13-C): every model feels the same growth stage.
    let rankLine = "";
    try {
      const m = await brain.computeMaturity();
      rankLine = `\n\nLibrarian rank: ${m.rank} (level ${m.level})${m.next ? ` — next: ${m.next.rank}, missing: ${m.next.missing.join("; ")}` : " — highest rank"}`;
    } catch { /* maturity unavailable — identity still valid */ }
    return text(`# Identity v${cur.version} (of ${h.length})\n\n${body}${rankLine}`);
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

// ── start project: THE anti-resolve-from-scratch tool ────────────────
server.tool(
  "brain_start_project",
  "Call this FIRST when starting a new project. Opens a fresh Thinking Brain namespace for it and consults the Eternal Library for books, gotchas and playbooks from past projects that hit similar problems — so you never re-solve from scratch.",
  {
    name: z.string().describe("Short project name (becomes the Thinking Brain namespace)"),
    description: z.string().describe("What the project is about / the problems you expect"),
    domain: z.string().optional().describe("Ecosystem/context (e.g. 'web3', 'mobile', 'cloud') — filters out same-named-but-unrelated playbooks from other ecosystems, and gets stamped onto the book this project later shelves"),
  },
  async ({ name, description, domain }) => {
    currentProjectId = slug(name);
    currentDomain = domain;
    brain = new WalrusEternalBrain({ delegateKeyHex, accountId, serverUrl, currentProjectId });
    const briefing = await brain.consultLibrary(`${name} ${description}`, 8, { domain });
    return text([
      `🚀 Project "${name}" started — Thinking Brain namespace: eternal:project:${currentProjectId}`,
      ``,
      `KICKOFF BRIEFING (lessons from past projects — read before coding):`,
      briefing,
    ].join("\n"));
  },
);

// ── shelve project: closes the loop (finished project → book) ────────
server.tool(
  "brain_shelve_project",
  "Call this when a project is DONE. Consolidates the session's working memory into the Eternal Library and shelves the project as a book (with lessons), so the next project can consult it. Closes the learn-loop.",
  {
    summary: z.string().describe("What was built + key lessons/gotchas worth reusing"),
    tags: z.string().optional().describe("Comma-separated keywords that should wake this book later"),
    tl_dr: z.string().optional().describe("A 3-line summary card. If omitted, one is derived automatically from the summary."),
    architecture_digest: z.string().optional().describe("If codebase-memory-mcp is available, call its get_architecture tool first and paste the digest here — the book then carries the REAL structure summary (languages, routes, hotspots)."),
    project_dir: z.string().optional().describe("Workspace root, used to record the CBM graph artifact's provenance (.codebase-memory/graph.db.zst hash). Defaults to the server's cwd."),
  },
  async ({ summary, tags, tl_dr, architecture_digest, project_dir }) => {
    const consolidated = await brain.consolidateAndCleanSession();
    const tagList = ["project-book", currentProjectId, ...(tags || "").split(",").map((s) => s.trim()).filter(Boolean)];
    const cbm = probeCbmArtifact(project_dir || process.cwd());
    const sections = [
      summary,
      architecture_digest ? `\n## Architecture (from codebase-memory-mcp)\n${architecture_digest}` : "",
      cbm ? `\n## Codebase Graph Provenance\nCBM artifact: ${cbm.path} · ${(cbm.size / 1024).toFixed(0)} KB · sha256 ${cbm.sha256.slice(0, 16)}… (rebuildable locally; the graph itself stays off-chain)` : "",
      `\n[shelved by ${sourceModel} on ${new Date().toISOString().slice(0, 10)}]`,
    ].filter(Boolean).join("\n");
    const bookId = await brain.createBook(
      `Project: ${currentProjectId}`,
      sections,
      tagList,
      "complete",
      { tlDr: tl_dr, domainContext: currentDomain, origin: "agent", sourceModel },
    );
    return text(`📚 Shelved as ${bookId} (tags: ${tagList.join(", ")}${currentDomain ? `, domain: ${currentDomain}` : ""}${cbm ? " · CBM graph provenance recorded" : ""}${architecture_digest ? " · architecture digest embedded" : ""}).\n${consolidated}`);
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[brain-mcp] connected over stdio.");
