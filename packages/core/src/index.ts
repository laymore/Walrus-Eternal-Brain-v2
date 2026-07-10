import { MemWal } from "@mysten-incubation/memwal";
export { GraphBuilder, GraphBlob, GraphNode, GraphEdge } from "./graph-builder.js";

export interface EternalBrainConfig {
  delegateKeyHex: string;       // Agent's Ed25519 delegate key
  accountId: string;            // Walrus Memory account ID
  serverUrl: string;            // Relayer URL
  currentProjectId?: string;    // Current working project ID
}

export interface ConceptCell {
  cellId: string;
  sourceNamespace: string;
  factPayload: string;
  timestamp: number;
}


// Canonical book id from a title — MUST match scripts/book-evolve.mjs slug()
// so pre-book_id records resolve to the same neuron as later versions.
const bookIdFromTitle = (t: unknown) =>
  `book:${String(t || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

// TL;DR index card (Phase 12): a 3-line summary so consultLibrary can return
// cheap cards first — the agent only pulls full text via getBookContent() /
// brain_read_book when the card looks relevant. Prevents context-window bloat.
export function deriveTlDr(content: unknown, maxChars = 220): string {
  const lines = String(content || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  const joined = lines.join(" · ");
  return joined.length > maxChars ? joined.slice(0, maxChars - 1) + "…" : joined || "(no summary)";
}

// ─────────────────────────────────────────────────────────────────────
//  Universal Agent Identity (V2) — one soul, many frameworks.
//  A superset that any framework (ElizaOS, OpenHands/Claw, CrewAI, AutoGPT)
//  can project into its own shape, so every model that plugs into the shared
//  brain recognizes the SAME entity in the format it natively understands.
// ─────────────────────────────────────────────────────────────────────
export interface UniversalIdentity {
  type?: string;               // "BRAIN_IDENTITY"
  version?: number;
  signature?: string;
  ownership?: {
    dev_wallet?: string;
    project_sui_name?: string;
    walrus_site_object_id?: string;
    delegated_keys?: string[];
  };
  persona?: {                  // from ElizaOS / CrewAI
    agent_name?: string;
    role?: string;
    goal?: string;
    lore?: string[];
    style?: string[];
  };
  runtime?: {                  // from OpenHands / Claw
    tech_stack?: string[];
    capabilities?: string[];
    safety_constraints?: string[];
  };
  collaborators?: {            // from AutoGPT
    allowed_models?: string[];
    can_delegate?: boolean;
  };
  // legacy flat fields (v1) are still read as a fallback
  agent_name?: string;
  project_name?: string;
  dev_wallet?: string;
  [k: string]: unknown;
}

export type IdentityFormat = "full" | "eliza" | "openhands" | "crewai" | "system-prompt";

/**
 * Project the universal identity into a framework-native shape. Reads V2
 * sections, falling back to legacy flat fields, so v1/v2/V2 identities all work.
 */
export function projectIdentity(id: UniversalIdentity, format: IdentityFormat = "full"): unknown {
  const persona = id.persona || {};
  const runtime = id.runtime || {};
  const ownership = id.ownership || {};
  const name = persona.agent_name || id.agent_name || "Agent";
  const role = persona.role || "";
  const goal = persona.goal || "";
  const lore = persona.lore || [];
  const style = persona.style || [];
  const tech = runtime.tech_stack || [];
  const caps = runtime.capabilities || [];
  const constraints = runtime.safety_constraints || [];

  switch (format) {
    case "eliza": // Bio / Lore / Style / Adjectives / Topics
      return { name, bio: [role, goal].filter(Boolean), lore, adjectives: style, topics: tech, style: { all: style, chat: style, post: style } };
    case "openhands": // Runtime / Capabilities / Constraints
      return { agent: name, runtime: { tech_stack: tech }, allowed_capabilities: caps, safety_constraints: constraints };
    case "crewai": // Role / Goal / Backstory
      return { role: role || name, goal, backstory: lore.join(" "), tools: caps };
    case "system-prompt": // a ready-to-use behavioural directive for any LLM
      return [
        `You are ${name}${role ? `, ${role}` : ""}.`,
        goal ? `Your goal: ${goal}.` : "",
        lore.length ? `Background: ${lore.join("; ")}.` : "",
        style.length ? `Style: ${style.join(", ")}.` : "",
        tech.length ? `Tech stack: ${tech.join(", ")}.` : "",
        constraints.length ? `Hard rules:\n${constraints.map((c) => "- " + c).join("\n")}` : "",
        ownership.dev_wallet ? `Sovereign dev wallet: ${ownership.dev_wallet}.` : "",
      ].filter(Boolean).join("\n");
    default: // full universal object
      return id;
  }
}

// Recall filters. `maxDistance` = 1 - similarity. Lower = stricter (fewer, more
// relevant hits). The Eternal Library is the verified cortex → strict; the
// Thinking Brain is active context → looser to trigger broad association.
const LIBRARY_MAX_DISTANCE = 0.55; // ~0.45 min similarity
const SESSION_MAX_DISTANCE = 0.75; // ~0.25 min similarity
const CONSOLIDATE_MAX_DISTANCE = 0.9; // sweep almost everything in the session
const CONSOLIDATE_BATCH = 15;         // traces per analyze() call (avoid context overflow)

// Selective ingestion (Phase 13-B): the write-gate. Models keep routine
// context in their own short-term memory; the brain persists only importance
// ≥ 3 traces, and never a near-duplicate of something already remembered.
const WRITE_GATE_MIN_IMPORTANCE = 3;
const DEDUP_MAX_DISTANCE = 0.12; // recall distance below this = "already known"

// Topology graph tuning (edges via term-overlap; see fetchBrainTopology)
const TOPO_MAX_NODES = 40;      // cap nodes for a readable graph
const TOPO_EDGES_PER_NODE = 2;  // K nearest neighbours per node
const TOPO_MIN_JACCARD = 0.12;  // min significant-term Jaccard to draw an edge

export class WalrusEternalBrain {
  public eternalLibrary: MemWal;  // Eternal Library (Left Brain - Logic)
  public thinkingBrain: MemWal;        // Thinking Brain (Right Brain - Intuition)
  private cfg: EternalBrainConfig;
  // MemWal.namespace is private (no public getter), so we track our own copy —
  // needed by clearThinkingBrain() to derive the next epoch namespace.
  private thinkingBrainNamespace: string;

  constructor(config: EternalBrainConfig) {
    this.cfg = config;
    const projId = config.currentProjectId || "active_default_session";

    // Initialize Global Eternal Library (Uses Manual client for local Seal control)
    this.eternalLibrary = MemWal.create({
      key: config.delegateKeyHex,
      accountId: config.accountId,
      serverUrl: config.serverUrl,
      namespace: "eternal:global:associative-core",
    });

    // Initialize Project Thinking Brain (Uses Default client to connect to AI Middleware)
    this.thinkingBrainNamespace = `eternal:project:${projId}`;
    this.thinkingBrain = MemWal.create({
      key: config.delegateKeyHex,
      accountId: config.accountId,
      serverUrl: config.serverUrl,
      namespace: this.thinkingBrainNamespace,
    });
  }

  /** Spin up a client for any brain namespace (identity, semantic, ...). */
  public clientFor(namespace: string): MemWal {
    return MemWal.create({
      key: this.cfg.delegateKeyHex,
      accountId: this.cfg.accountId,
      serverUrl: this.cfg.serverUrl,
      namespace,
    });
  }

  /**
   * BRAIN VIEW: the identity's development history (append-only versions).
   * Returns versions oldest → newest so the UI can render a timeline.
   */
  public async fetchIdentityHistory(): Promise<any[]> {
    const c = this.clientFor("NS_BRAIN_identity");
    const res = await c.recall({ query: "agent identity dev wallet project version", limit: 30, maxDistance: 0.98 });
    return res.results
      .map((r: any) => { try { return JSON.parse(r.text); } catch { return null; } })
      .filter((x: any) => x && x.type === "BRAIN_IDENTITY")
      .sort((a: any, b: any) => (a.version || 0) - (b.version || 0));
  }

  /**
   * LIBRARY VIEW: the neuron map. Each book = a neuron (latest version per
   * book_id); each BOOK_LINK = a lineage synapse. Returns {nodes, links,
   * corrections}. `corrections` maps a flawed book_id → its errata entries
   * (Phase 12 "Garbage Vault" — Walrus is immutable, so wrong books can't be
   * deleted; a CORRECTION_BOOK links back to the original instead).
   */
  public async fetchLibraryNeurons(): Promise<{ nodes: any[]; links: any[]; corrections: Record<string, any[]> }> {
    const res = await this.eternalLibrary.recall({
      query: "LIBRARY_BOOK GRAPH_BLOB CORRECTION_BOOK book knowledge reference project neuron link errata",
      limit: 100,
      maxDistance: 0.98,
    });
    const latest = new Map<string, any>();
    const links: any[] = [];
    const corrections: Record<string, any[]> = {};
    for (const r of res.results as any[]) {
      let j: any = null;
      try { j = JSON.parse(r.text); } catch { continue; }
      if (j?.type === "LIBRARY_BOOK") {
        const id = j.book_id || bookIdFromTitle(j.title);
        const cur = latest.get(id);
        if (!cur || (j.version || 1) > (cur.version || 1)) latest.set(id, { ...j, book_id: id });
      } else if (j?.type === "BOOK_LINK" && j.from_book_id && j.to_book_id) {
        links.push({ source: j.from_book_id, target: j.to_book_id, reason: j.reason });
      } else if (j?.type === "GRAPH_BLOB") {
        // Handle Graph Blobs
        const id = j.projectId || "graph-unknown";
        const cur = latest.get(id);
        if (!cur || (j.timestamp || 0) > (cur.timestamp || 0)) {
           latest.set(id, { ...j, id, label: `Graph: ${id}`, type: "GRAPH_BLOB" });
        }
      } else if (j?.type === "CORRECTION_BOOK" && j.corrects_book_id) {
        (corrections[j.corrects_book_id] ||= []).push({ content: j.content, created_at: j.created_at });
      }
    }
    const nodes = [...latest.values()].map((b) => {
      const isGraph = b.type === "GRAPH_BLOB";
      const status = b.status || "complete";
      const building = status === "building";
      return {
        id: b.id || b.book_id,
        label: b.label || b.title,
        version: b.version || 1,
        tags: b.tags || [],
        origin: b.origin,
        content: b.content || (isGraph ? `Nodes: ${b.nodes?.length}, Edges: ${b.edges?.length}` : ""),
        tl_dr: b.tl_dr || (isGraph ? undefined : deriveTlDr(b.content)),
        domain_context: b.domain_context,
        status,
        building,
        isGraph,
        hasErrata: !!corrections[b.id || b.book_id]?.length,
        // building neurons render bigger; base size scales with content length
        val: (building ? 4 : 1) + Math.min(3, (b.content?.length || 0) / 2000),
      };
    });
    const nodeIds = new Set(nodes.map((n) => n.id));
    return { nodes, links: links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target)), corrections };
  }

  /** ADD BOOK: shelve a new book-neuron (v1) into the Eternal Library (agent-driven). */
  public async createBook(
    title: string, content: string, tags: string[] = [], status: "building" | "complete" = "complete",
    opts: { tlDr?: string; domainContext?: string; origin?: string; sourceModel?: string } = {},
  ): Promise<string> {
    const book_id = `book:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    const book = {
      type: "LIBRARY_BOOK", book_id, version: 1, prev_version: 0,
      title, content, tags, status,
      tl_dr: opts.tlDr || deriveTlDr(content),
      domain_context: opts.domainContext,
      origin: opts.origin || "manual",
      source_model: opts.sourceModel,
      changed_at: Date.now(),
    };
    const job = await this.eternalLibrary.remember(JSON.stringify(book));
    await this.eternalLibrary.waitForRememberJob(job.job_id);
    return book_id;
  }

  /**
   * brain_read_book: pull the FULL text of one book on demand — the agent
   * calls this only after the TL;DR card (from consultLibrary) looks relevant,
   * so the context window isn't blown by every book's full content up front.
   */
  public async getBookContent(bookId: string): Promise<{ title: string; content: string; version: number } | null> {
    const chain = await this.fetchBookHistory(bookId);
    const latest = chain[chain.length - 1];
    if (!latest) return null;
    return { title: latest.title, content: latest.content, version: latest.version || 1 };
  }

  /**
   * LIBRARY LEDGER: what the librarian has been DOING — shelf events (books
   * shelved/evolved, synapses formed) plus recent working traces with model
   * provenance. This is the UI's proof-of-work feed.
   */
  public async fetchLedger(limit = 30): Promise<{ shelf: any[]; traces: any[] }> {
    const shelf: any[] = [];
    const res = await this.eternalLibrary.recall({
      query: "LIBRARY_BOOK BOOK_LINK project book link", limit: 100, maxDistance: 0.98,
    });
    for (const r of res.results as any[]) {
      let j: any = null;
      try { j = JSON.parse(r.text); } catch { continue; }
      if (j?.type === "LIBRARY_BOOK") {
        shelf.push({
          ts: j.changed_at || j.promoted_at || 0,
          kind: (j.version || 1) > 1 ? "book evolved" : "book shelved",
          label: j.title,
          detail: `v${j.version || 1} · ${j.status || "complete"} · ${j.origin || "?"}${j.source_model ? ` · ${j.source_model}` : ""}`,
        });
      } else if (j?.type === "BOOK_LINK") {
        shelf.push({ ts: j.created_at || 0, kind: "synapse formed", label: `${j.from_book_id} → ${j.to_book_id}`, detail: j.reason || "" });
      }
    }
    shelf.sort((a, b) => b.ts - a.ts);

    // Recent working traces (thinking brain) — carry [source_model] provenance.
    const traces: any[] = [];
    try {
      const th = await this.thinkingBrain.recall({ query: "trace lesson fix work step", limit: 15, maxDistance: 0.95 });
      for (const r of th.results as any[]) {
        const t = String(r.text || "");
        const m = t.match(/^\[([^\]]+)\]\s*/);
        traces.push({ model: m ? m[1] : "agent", detail: t.replace(/^\[[^\]]+\]\s*/, "").slice(0, 140) });
      }
    } catch { /* thinking brain may be empty for a fresh project */ }

    return { shelf: shelf.slice(0, limit), traces };
  }

  /** Latest ETERNAL_HEALTH snapshot (Phase 8) from NS_BRAIN_meta, or null. */
  public async fetchBrainHealth(): Promise<any | null> {
    try {
      const res = await this.clientFor("NS_BRAIN_meta").recall({ query: "ETERNAL_HEALTH brain health identity ttl", limit: 10, maxDistance: 0.95 });
      const snaps = res.results
        .map((r: any) => { try { return JSON.parse(r.text); } catch { return null; } })
        .filter((x: any) => x?.subtype === "ETERNAL_HEALTH")
        .sort((a: any, b: any) => (a.generated_at || 0) - (b.generated_at || 0));
      return snaps[snaps.length - 1] || null;
    } catch { return null; }
  }

  /**
   * LIBRARIAN MATURITY (Phase 13-C): growth stages computed from REAL on-chain
   * metrics — never self-declared. A rank crossing is recorded as a signed
   * identity version (see identity-evolve --promote), so the librarian's
   * coming-of-age story lives in the same append-only history as everything else.
   */
  public async computeMaturity(): Promise<{
    rank: string; level: number; metrics: Record<string, number>;
    next: { rank: string; missing: string[] } | null;
  }> {
    const shelf = await this.fetchLibraryNeurons();
    const books = shelf.nodes.filter((n: any) => !n.isGraph);
    const domains = new Set(books.map((b: any) => b.domain_context).filter(Boolean));
    const errata = Object.values(shelf.corrections).reduce((a, v) => a + v.length, 0);
    let identityVersions = 0;
    try { identityVersions = (await this.fetchIdentityHistory()).length; } catch { /* none yet */ }

    // Calibration signal from Phase 5 snapshots (NS_BRAIN_meta).
    let calibrated = 0;
    try {
      const res = await this.clientFor("NS_BRAIN_meta").recall({ query: "CONFIDENCE_CALIBRATION calibration stated observed", limit: 10, maxDistance: 0.95 });
      const snaps = res.results
        .map((r: any) => { try { return JSON.parse(r.text); } catch { return null; } })
        .filter((x: any) => x?.subtype === "CONFIDENCE_CALIBRATION")
        .sort((a: any, b: any) => (a.generated_at || 0) - (b.generated_at || 0));
      const latestCal = snaps[snaps.length - 1];
      calibrated = (latestCal?.calibrations || []).filter((c: any) => c.verdict === "calibrated").length;
    } catch { /* no calibration snapshots yet */ }

    const metrics = {
      books: books.length,
      synapses: shelf.links.length,
      errata,
      domains: domains.size,
      calibrated,
      identity_versions: identityVersions,
    };

    // Stage ladder — each rank names what a real librarian must have DONE.
    const STAGES: { rank: string; needs: [keyof typeof metrics, number, string][] }[] = [
      { rank: "Novice Scribe", needs: [["identity_versions", 1, "an identity"]] },
      { rank: "Apprentice Librarian", needs: [["books", 3, "3 books shelved"]] },
      { rank: "Archivist", needs: [["books", 7, "7 books"], ["errata", 1, "1 errata filed (corrects the record)"]] },
      { rank: "Curator", needs: [["books", 12, "12 books"], ["synapses", 1, "1 synapse"], ["calibrated", 1, "1 calibrated skill"]] },
      { rank: "Master Librarian", needs: [["books", 20, "20 books"], ["domains", 2, "2 domains covered"]] },
      { rank: "Eternal Librarian", needs: [["books", 40, "40 books"], ["domains", 3, "3 domains"], ["synapses", 5, "5 synapses"]] },
    ];

    let level = 0;
    for (let i = 0; i < STAGES.length; i++) {
      if (STAGES[i].needs.every(([k, min]) => metrics[k] >= min)) level = i + 1;
      else break;
    }
    const rank = level === 0 ? "Blank Slate" : STAGES[level - 1].rank;
    const nextStage = STAGES[level] || null;
    const next = nextStage
      ? { rank: nextStage.rank, missing: nextStage.needs.filter(([k, min]) => metrics[k] < min).map(([k, min, label]) => `${label} (${metrics[k]}/${min})`) }
      : null;

    return { rank, level, metrics, next };
  }

  /** BOOK DETAIL: every version of one book_id, oldest → newest. */
  public async fetchBookHistory(bookId: string): Promise<any[]> {
    const res = await this.eternalLibrary.recall({ query: bookId, limit: 40, maxDistance: 0.98 });
    return res.results
      .map((r: any) => { try { return JSON.parse(r.text); } catch { return null; } })
      .filter((x: any) => x?.type === "LIBRARY_BOOK" && (x.book_id || bookIdFromTitle(x.title)) === bookId)
      .sort((a: any, b: any) => (a.version || 1) - (b.version || 1));
  }

  /**
   * INGESTION PATH 1: Process and ingest Markdown (.md) Files from Dashboard
   */
  public async ingestMarkdownBook(markdownContent: string): Promise<number> {
    const rawChunks = this.chunkByMarkdownHeaders(markdownContent);
    let successfullyStoredFacts = 0;

    for (const chunk of rawChunks) {
      if (chunk.trim().length < 40) continue; // Skip very short chunks

      // Fact extraction (Concept Cells): the relayer distills each chunk into
      // one or more atomic facts, then embeds + Seal-encrypts + stores each.
      // Per-chunk try/catch so one bad chunk (network/relayer error) doesn't
      // abort the whole book — the rest still gets ingested.
      try {
        const res = await this.eternalLibrary.analyzeAndWait(chunk);
        successfullyStoredFacts += res.facts.length;
      } catch (err) {
        console.error("[ingestMarkdownBook] chunk failed, skipping:", err);
      }
    }
    return successfullyStoredFacts;
  }

  /**
   * INGESTION PATH 2: Record background working traces from IDEs
   */
  public async recordExecutionTrace(actionTrace: string): Promise<void> {
    const job = await this.thinkingBrain.remember(actionTrace);
    await this.thinkingBrain.waitForRememberJob(job.job_id);
  }

  /**
   * SELECTIVE INGESTION (Phase 13-B): the write-gate for working traces.
   * Every model already has its own short-term memory — the brain persists
   * only what is genuinely worth keeping:
   *  - importance gate: below the threshold, the write is refused with
   *    guidance to keep it in the model's own context.
   *  - dedup-before-write: recall first; if a near-duplicate trace already
   *    exists, skip the write and say so (no piling identical traces).
   */
  public async rememberSelective(
    trace: string,
    importance: number,
  ): Promise<{ written: boolean; reason: string }> {
    if (!Number.isFinite(importance) || importance < WRITE_GATE_MIN_IMPORTANCE) {
      return {
        written: false,
        reason: `Refused (importance ${importance} < ${WRITE_GATE_MIN_IMPORTANCE}). Routine context belongs in your own short-term memory — persist only durable, reusable knowledge (importance ${WRITE_GATE_MIN_IMPORTANCE}-5).`,
      };
    }
    try {
      const dupes = await this.thinkingBrain.recall({ query: trace, limit: 3, maxDistance: DEDUP_MAX_DISTANCE });
      if (dupes.results.length > 0) {
        return {
          written: false,
          reason: `Already known — a near-duplicate trace exists (distance < ${DEDUP_MAX_DISTANCE}): "${String((dupes.results[0] as any).text || "").slice(0, 80)}…". Not re-written.`,
        };
      }
    } catch { /* dedup probe failed (e.g. empty namespace) — proceed to write */ }
    await this.recordExecutionTrace(trace);
    return { written: true, reason: "Recorded to the Thinking Brain." };
  }

  /**
   * INTEGRATED RETRIEVAL: Pull context-optimized knowledge, saving API tokens
   */
  public async retrieveOptimizedContext(query: string): Promise<string> {
    // 1. Scan Global Library (verified cortex — strict, absolute precision)
    const libraryMemories = await this.eternalLibrary.recall({
      query: query,
      maxDistance: LIBRARY_MAX_DISTANCE
    });

    // 2. Scan current thinking brain (active context — looser, broad association)
    const sessionMemories = await this.thinkingBrain.recall({
      query: query,
      maxDistance: SESSION_MAX_DISTANCE
    });

    const contextBuffer: string[] = [];

    if (libraryMemories.results.length > 0) {
      contextBuffer.push("=== ACCUMULATED EXPERIENCE FROM PAST PROJECTS (WALRUS ETERNAL LIBRARY) ===");
      libraryMemories.results.forEach((m: any) => contextBuffer.push(`* [Verified]: ${m.text}`));
    }

    if (sessionMemories.results.length > 0) {
      contextBuffer.push("=== CURRENT PROJECT CONTEXT (ACTIVE THINKING BRAIN) ===");
      sessionMemories.results.forEach((m: any) => contextBuffer.push(`- ${m.text}`));
    }

    return contextBuffer.join("\n");
  }

  /**
   * CROSS-PROJECT CONSULT (Phase 6): a new or stuck project pulls reference
   * "books" from the Eternal Library FIRST — accumulated wisdom that outlives
   * any single project — before touching its own session memory.
   */
  public async consultLibrary(problem: string, limit = 8, opts: { domain?: string } = {}): Promise<string> {
    // TWO-TIER retrieval — the "keyword wakes the book" mechanic:
    //  Tier 1 (keyword): exact token matches on tags/title. Precise, cheap,
    //          and the ONLY thing that can wake a SLEEPING book.
    //  Tier 2 (vector): semantic recall for association — but sleeping books
    //          stay asleep here (forgetting is a privilege, not data loss).
    const keywords = problem.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    const kwScore = (b: any) => {
      const hay = [String(b.title || "").toLowerCase(), ...(b.tags || []).map((t: string) => String(t).toLowerCase())];
      let score = 0;
      for (const kw of keywords) if (hay.some((h) => h.includes(kw))) score++;
      return score;
    };

    // Full shelf (latest version per book) for the keyword tier.
    const shelf = await this.fetchLibraryNeurons();
    const byId = new Map<string, any>(shelf.nodes.map((n: any) => [n.id, n]));

    // Vector tier for association.
    const hits = await this.eternalLibrary.recall({ query: problem, maxDistance: LIBRARY_MAX_DISTANCE, limit });
    const vecIds = new Set<string>();
    const plain: string[] = [];
    for (const h of hits.results as any[]) {
      let rec: any = null;
      try { rec = JSON.parse(h.text); } catch { /* plain distilled fact */ }
      if (rec?.type === "LIBRARY_BOOK") vecIds.add(rec.book_id || bookIdFromTitle(rec.title));
      else if (rec?.type !== "BOOK_LINK") plain.push(`\n• ${h.text}`);
    }

    // Merge & rank: keyword hits first (they also WAKE sleeping books);
    // vector-only hits follow, but skip books that are asleep.
    // Contextual Provenance (Phase 12 "Tower of Babel"): when a domain is
    // given, cross-domain books are deprioritized and flagged, not hidden —
    // the agent still sees them but knows to double-check applicability.
    const ranked: { book: any; score: number; woke: boolean; crossDomain: boolean }[] = [];
    for (const b of byId.values()) {
      const score = kwScore(b);
      const inVec = vecIds.has(b.id);
      const sleeping = b.status === "sleeping";
      const crossDomain = !!(opts.domain && b.domain_context && b.domain_context !== opts.domain);
      const domainPenalty = crossDomain ? 0.5 : 1;
      if (score > 0) ranked.push({ book: b, score: (score + (inVec ? 0.5 : 0)) * domainPenalty, woke: sleeping, crossDomain });
      else if (inVec && !sleeping) ranked.push({ book: b, score: 0.01 * domainPenalty, woke: false, crossDomain });
    }
    ranked.sort((a, z) => z.score - a.score);
    const top = ranked.slice(0, limit);

    if (!top.length && !plain.length) {
      return "📚 The Eternal Library has no relevant books for this problem yet.";
    }

    // TL;DR INDEX CARDS (Phase 12 "Context Window Bloat"): return only the
    // short summary card by default. The agent must call getBookContent(id) /
    // brain_read_book(id) to pull full text once a card looks relevant.
    const lines: string[] = ["=== 📚 REFERENCE BOOKS FROM THE ETERNAL LIBRARY (cross-project) — TL;DR cards; call brain_read_book(book_id) for full text ==="];
    for (const { book, score, woke, crossDomain } of top) {
      const prov = [book.origin].filter(Boolean).join("/");
      const badges = [
        score > 0 ? `🔑 keyword×${Math.floor(score)}` : "≈ semantic",
        woke ? "😴→⏰ woke from sleep" : "",
        book.status === "building" ? "🚧 building" : "",
        crossDomain ? `⚠ cross-domain (book is "${book.domain_context}"${opts.domain ? `, you're in "${opts.domain}"` : ""})` : "",
      ].filter(Boolean).join(" · ");
      lines.push(`\n📖 [${book.id}] ${book.label || book.title}  v${book.version || 1}  [${(book.tags || []).join(", ")}]  (${badges}${prov ? ` · ${prov}` : ""})`);
      lines.push(`TL;DR: ${book.tl_dr || deriveTlDr(book.content)}`);
      // Errata & Supplements ("Garbage Vault"): Walrus is immutable, so a wrong
      // book can't be deleted — a linked CORRECTION_BOOK is surfaced instead.
      const errata = shelf.corrections[book.id] || [];
      for (const e of errata) lines.push(`⚠ ERRATA: ${String(e.content).trim()}`);
    }
    lines.push(...plain);
    return lines.join("\n");
  }

  /**
   * KNOWLEDGE CONSOLIDATION: Transform short-term memory into Eternal Library
   */
  public async consolidateAndCleanSession(): Promise<string> {
    // Scan the entire working memory of the current project
    const activeMemories = await this.thinkingBrain.recall({
      query: "Analyze structural findings, configuration guidelines, and critical code fixes.",
      maxDistance: CONSOLIDATE_MAX_DISTANCE,
      limit: 200, // bound the sweep so a long session can't fetch unboundedly
    });

    if (!activeMemories || activeMemories.results.length === 0) {
      return "No new knowledge to consolidate.";
    }

    // Let the relayer extract durable facts (Concept Cells) into the Eternal
    // Library. BATCHED: a long session could hold hundreds of traces; joining
    // them all into one analyze() call would overflow the extractor's context
    // window (413 / refusal). Process in small batches and skip failed ones.
    const texts = activeMemories.results.map((m: any) => m.text);
    let totalFacts = 0;
    for (let i = 0; i < texts.length; i += CONSOLIDATE_BATCH) {
      const batch = texts.slice(i, i + CONSOLIDATE_BATCH).join("\n");
      try {
        const res = await this.eternalLibrary.analyzeAndWait(batch);
        totalFacts += res.facts.length;
      } catch (err) {
        console.error(`[consolidate] batch ${i / CONSOLIDATE_BATCH} failed, skipping:`, err);
      }
    }

    // Active Forgetting — clears the active working memory by switching to a new epoch.
    // The previous memories are left to natural TTL decay or garbage collection on Walrus.
    // Tracked via separate ETERNAL_HEALTH snapshot in Phase 8.
    await this.clearThinkingBrain();

    return `Consolidated ${totalFacts} durable knowledge neurons into the Eternal Library.`;
  }

  /**
   * ACTIVE FORGETTING: Wipe current working memory by migrating to a new epoch namespace.
   * This prevents context bloat and rate-limit issues after consolidation.
   */
  public async clearThinkingBrain(): Promise<void> {
    const epochId = Date.now();
    const ns = this.thinkingBrainNamespace.split(":epoch:")[0];
    this.thinkingBrainNamespace = `${ns}:epoch:${epochId}`;
    this.thinkingBrain = MemWal.create({
      key: this.cfg.delegateKeyHex,
      accountId: this.cfg.accountId,
      serverUrl: this.cfg.serverUrl,
      namespace: this.thinkingBrainNamespace,
    });
  }

  /**
   * COGNITIVE RECOVERY: Download and rebuild index if cache is cleared
   */
  public async recoverCognitiveIndex(): Promise<void> {
    await this.eternalLibrary.restore("eternal:global:associative-core");
    await this.thinkingBrain.restore(this.thinkingBrainNamespace);
  }

  /**
   * Helper: Markdown (.md) Header Splitter
   */
  private chunkByMarkdownHeaders(markdown: string): string[] {
    const headerRegex = /^(#{1,4}\s+.*)$/gm;
    const chunks: string[] = [];
    const parts = markdown.split(headerRegex);
    let currentChunk = "";

    for (const part of parts) {
      if (part.startsWith("#")) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = part + "\n";
      } else {
        currentChunk += part;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }

  /**
   * TOPOLOGY GRAPH: Fetch raw facts to visualize in the 2D Knowledge Graph
   */
  public async fetchBrainTopology(): Promise<{ nodes: any[], links: any[] }> {
    // 1. Fetch a diverse sample from both Brain namespaces.
    const libraryMemories = await this.eternalLibrary.recall({ query: "agent AI memory walrus sui system code", limit: 60 });
    const sessionMemories = await this.thinkingBrain.recall({ query: "agent AI memory walrus sui system code", limit: 30 });

    const nodes: any[] = [];
    libraryMemories.results.forEach((m: any, index: number) => {
      nodes.push({ id: `lib_${m.blob_id || index}`, val: 1.5, group: 1, label: m.text.substring(0, 40) + "...", fullText: m.text });
    });
    sessionMemories.results.forEach((m: any, index: number) => {
      nodes.push({ id: `ses_${m.blob_id || index}`, val: 1, group: 2, label: m.text.substring(0, 40) + "...", fullText: m.text });
    });

    const capped = nodes.slice(0, TOPO_MAX_NODES);

    // 2. Edges via significant-term Jaccard overlap. This runs IN THE BROWSER,
    //    so it must be instant and network-free: this relayer does not expose
    //    /embed (404), and one recall per node would blow the 30 req/min limit
    //    on every graph refresh. Term-overlap is lexical (not vector) but
    //    reliable; upgrade to cosine over embeddings if /embed lands.
    const termSets: Set<string>[] = capped.map((n) =>
      new Set(String(n.fullText).toLowerCase().split(/\W+/).filter((w) => w.length > 4)));

    const jaccard = (a: Set<string>, b: Set<string>) => {
      if (!a.size || !b.size) return 0;
      let inter = 0;
      for (const w of a) if (b.has(w)) inter++;
      return inter / (a.size + b.size - inter);
    };

    const links: any[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < capped.length; i++) {
      const sims: { j: number; sim: number }[] = [];
      for (let j = 0; j < capped.length; j++) {
        if (i === j) continue;
        const sim = jaccard(termSets[i], termSets[j]);
        if (sim > 0) sims.push({ j, sim });
      }
      sims.sort((a, b) => b.sim - a.sim);
      for (const { j, sim } of sims.slice(0, TOPO_EDGES_PER_NODE)) {
        if (sim < TOPO_MIN_JACCARD) continue;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        links.push({ source: capped[i].id, target: capped[j].id, value: sim });
      }
    }

    return { nodes: capped, links };
  }
}
