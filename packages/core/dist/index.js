import { MemWal } from "@mysten-incubation/memwal";
// Canonical book id from a title — MUST match scripts/book-evolve.mjs slug()
// so pre-book_id records resolve to the same neuron as later versions.
const bookIdFromTitle = (t) => `book:${String(t || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
/**
 * Project the universal identity into a framework-native shape. Reads V2
 * sections, falling back to legacy flat fields, so v1/v2/V2 identities all work.
 */
export function projectIdentity(id, format = "full") {
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
const CONSOLIDATE_BATCH = 15; // traces per analyze() call (avoid context overflow)
// Topology graph tuning (edges via term-overlap; see fetchBrainTopology)
const TOPO_MAX_NODES = 40; // cap nodes for a readable graph
const TOPO_EDGES_PER_NODE = 2; // K nearest neighbours per node
const TOPO_MIN_JACCARD = 0.12; // min significant-term Jaccard to draw an edge
export class WalrusEternalBrain {
    eternalLibrary; // Eternal Library (Left Brain - Logic)
    thinkingBrain; // Thinking Brain (Right Brain - Intuition)
    cfg;
    constructor(config) {
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
        this.thinkingBrain = MemWal.create({
            key: config.delegateKeyHex,
            accountId: config.accountId,
            serverUrl: config.serverUrl,
            namespace: `eternal:project:${projId}`,
        });
    }
    /** Spin up a client for any brain namespace (identity, semantic, ...). */
    clientFor(namespace) {
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
    async fetchIdentityHistory() {
        const c = this.clientFor("NS_BRAIN_identity");
        const res = await c.recall({ query: "agent identity dev wallet project version", limit: 30, maxDistance: 0.98 });
        return res.results
            .map((r) => { try {
            return JSON.parse(r.text);
        }
        catch {
            return null;
        } })
            .filter((x) => x && x.type === "BRAIN_IDENTITY")
            .sort((a, b) => (a.version || 0) - (b.version || 0));
    }
    /**
     * LIBRARY VIEW: the neuron map. Each book = a neuron (latest version per
     * book_id); each BOOK_LINK = a lineage synapse. Returns {nodes, links}.
     */
    async fetchLibraryNeurons() {
        const res = await this.eternalLibrary.recall({
            query: "LIBRARY_BOOK book knowledge reference project neuron link",
            limit: 100,
            maxDistance: 0.98,
        });
        const latest = new Map();
        const links = [];
        for (const r of res.results) {
            let j = null;
            try {
                j = JSON.parse(r.text);
            }
            catch {
                continue;
            }
            if (j?.type === "LIBRARY_BOOK") {
                const id = j.book_id || bookIdFromTitle(j.title);
                const cur = latest.get(id);
                if (!cur || (j.version || 1) > (cur.version || 1))
                    latest.set(id, { ...j, book_id: id });
            }
            else if (j?.type === "BOOK_LINK" && j.from_book_id && j.to_book_id) {
                links.push({ source: j.from_book_id, target: j.to_book_id, reason: j.reason });
            }
        }
        const nodes = [...latest.values()].map((b) => {
            const status = b.status || "complete";
            const building = status === "building";
            return {
                id: b.book_id,
                label: b.title,
                version: b.version || 1,
                tags: b.tags || [],
                origin: b.origin,
                content: b.content,
                status,
                building,
                // building neurons render bigger; base size scales with content length
                val: (building ? 4 : 1) + Math.min(3, (b.content?.length || 0) / 2000),
            };
        });
        const nodeIds = new Set(nodes.map((n) => n.id));
        return { nodes, links: links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target)) };
    }
    /** ADD BOOK: shelve a new manual book-neuron (v1) into the Eternal Library. */
    async createBook(title, content, tags = [], status = "complete") {
        const book_id = `book:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
        const book = {
            type: "LIBRARY_BOOK", book_id, version: 1, prev_version: 0,
            title, content, tags, status, origin: "manual", changed_at: Date.now(),
        };
        const job = await this.eternalLibrary.remember(JSON.stringify(book));
        await this.eternalLibrary.waitForRememberJob(job.job_id);
        return book_id;
    }
    /**
     * LIBRARY LEDGER: what the librarian has been DOING — shelf events (books
     * shelved/evolved, synapses formed) plus recent working traces with model
     * provenance. This is the UI's proof-of-work feed.
     */
    async fetchLedger(limit = 30) {
        const shelf = [];
        const res = await this.eternalLibrary.recall({
            query: "LIBRARY_BOOK BOOK_LINK project book link", limit: 100, maxDistance: 0.98,
        });
        for (const r of res.results) {
            let j = null;
            try {
                j = JSON.parse(r.text);
            }
            catch {
                continue;
            }
            if (j?.type === "LIBRARY_BOOK") {
                shelf.push({
                    ts: j.changed_at || j.promoted_at || 0,
                    kind: (j.version || 1) > 1 ? "book evolved" : "book shelved",
                    label: j.title,
                    detail: `v${j.version || 1} · ${j.status || "complete"} · ${j.origin || "?"}${j.source_model ? ` · ${j.source_model}` : ""}`,
                });
            }
            else if (j?.type === "BOOK_LINK") {
                shelf.push({ ts: j.created_at || 0, kind: "synapse formed", label: `${j.from_book_id} → ${j.to_book_id}`, detail: j.reason || "" });
            }
        }
        shelf.sort((a, b) => b.ts - a.ts);
        // Recent working traces (thinking brain) — carry [source_model] provenance.
        const traces = [];
        try {
            const th = await this.thinkingBrain.recall({ query: "trace lesson fix work step", limit: 15, maxDistance: 0.95 });
            for (const r of th.results) {
                const t = String(r.text || "");
                const m = t.match(/^\[([^\]]+)\]\s*/);
                traces.push({ model: m ? m[1] : "agent", detail: t.replace(/^\[[^\]]+\]\s*/, "").slice(0, 140) });
            }
        }
        catch { /* thinking brain may be empty for a fresh project */ }
        return { shelf: shelf.slice(0, limit), traces };
    }
    /** Latest ETERNAL_HEALTH snapshot (Phase 8) from NS_BRAIN_meta, or null. */
    async fetchBrainHealth() {
        try {
            const res = await this.clientFor("NS_BRAIN_meta").recall({ query: "ETERNAL_HEALTH brain health identity ttl", limit: 10, maxDistance: 0.95 });
            const snaps = res.results
                .map((r) => { try {
                return JSON.parse(r.text);
            }
            catch {
                return null;
            } })
                .filter((x) => x?.subtype === "ETERNAL_HEALTH")
                .sort((a, b) => (a.generated_at || 0) - (b.generated_at || 0));
            return snaps[snaps.length - 1] || null;
        }
        catch {
            return null;
        }
    }
    /** BOOK DETAIL: every version of one book_id, oldest → newest. */
    async fetchBookHistory(bookId) {
        const res = await this.eternalLibrary.recall({ query: bookId, limit: 40, maxDistance: 0.98 });
        return res.results
            .map((r) => { try {
            return JSON.parse(r.text);
        }
        catch {
            return null;
        } })
            .filter((x) => x?.type === "LIBRARY_BOOK" && (x.book_id || bookIdFromTitle(x.title)) === bookId)
            .sort((a, b) => (a.version || 1) - (b.version || 1));
    }
    /**
     * INGESTION PATH 1: Process and ingest Markdown (.md) Files from Dashboard
     */
    async ingestMarkdownBook(markdownContent) {
        const rawChunks = this.chunkByMarkdownHeaders(markdownContent);
        let successfullyStoredFacts = 0;
        for (const chunk of rawChunks) {
            if (chunk.trim().length < 40)
                continue; // Skip very short chunks
            // Fact extraction (Concept Cells): the relayer distills each chunk into
            // one or more atomic facts, then embeds + Seal-encrypts + stores each.
            // Per-chunk try/catch so one bad chunk (network/relayer error) doesn't
            // abort the whole book — the rest still gets ingested.
            try {
                const res = await this.eternalLibrary.analyzeAndWait(chunk);
                successfullyStoredFacts += res.facts.length;
            }
            catch (err) {
                console.error("[ingestMarkdownBook] chunk failed, skipping:", err);
            }
        }
        return successfullyStoredFacts;
    }
    /**
     * INGESTION PATH 2: Record background working traces from IDEs
     */
    async recordExecutionTrace(actionTrace) {
        const job = await this.thinkingBrain.remember(actionTrace);
        await this.thinkingBrain.waitForRememberJob(job.job_id);
    }
    /**
     * INTEGRATED RETRIEVAL: Pull context-optimized knowledge, saving API tokens
     */
    async retrieveOptimizedContext(query) {
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
        const contextBuffer = [];
        if (libraryMemories.results.length > 0) {
            contextBuffer.push("=== ACCUMULATED EXPERIENCE FROM PAST PROJECTS (WALRUS ETERNAL LIBRARY) ===");
            libraryMemories.results.forEach((m) => contextBuffer.push(`* [Verified]: ${m.text}`));
        }
        if (sessionMemories.results.length > 0) {
            contextBuffer.push("=== CURRENT PROJECT CONTEXT (ACTIVE THINKING BRAIN) ===");
            sessionMemories.results.forEach((m) => contextBuffer.push(`- ${m.text}`));
        }
        return contextBuffer.join("\n");
    }
    /**
     * CROSS-PROJECT CONSULT (Phase 6): a new or stuck project pulls reference
     * "books" from the Eternal Library FIRST — accumulated wisdom that outlives
     * any single project — before touching its own session memory.
     */
    async consultLibrary(problem, limit = 8) {
        // TWO-TIER retrieval — the "keyword wakes the book" mechanic:
        //  Tier 1 (keyword): exact token matches on tags/title. Precise, cheap,
        //          and the ONLY thing that can wake a SLEEPING book.
        //  Tier 2 (vector): semantic recall for association — but sleeping books
        //          stay asleep here (forgetting is a privilege, not data loss).
        const keywords = problem.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
        const kwScore = (b) => {
            const hay = [String(b.title || "").toLowerCase(), ...(b.tags || []).map((t) => String(t).toLowerCase())];
            let score = 0;
            for (const kw of keywords)
                if (hay.some((h) => h.includes(kw)))
                    score++;
            return score;
        };
        // Full shelf (latest version per book) for the keyword tier.
        const shelf = await this.fetchLibraryNeurons();
        const byId = new Map(shelf.nodes.map((n) => [n.id, n]));
        // Vector tier for association.
        const hits = await this.eternalLibrary.recall({ query: problem, maxDistance: LIBRARY_MAX_DISTANCE, limit });
        const vecIds = new Set();
        const plain = [];
        for (const h of hits.results) {
            let rec = null;
            try {
                rec = JSON.parse(h.text);
            }
            catch { /* plain distilled fact */ }
            if (rec?.type === "LIBRARY_BOOK")
                vecIds.add(rec.book_id || bookIdFromTitle(rec.title));
            else if (rec?.type !== "BOOK_LINK")
                plain.push(`\n• ${h.text}`);
        }
        // Merge & rank: keyword hits first (they also WAKE sleeping books);
        // vector-only hits follow, but skip books that are asleep.
        const ranked = [];
        for (const b of byId.values()) {
            const score = kwScore(b);
            const inVec = vecIds.has(b.id);
            const sleeping = b.status === "sleeping";
            if (score > 0)
                ranked.push({ book: b, score: score + (inVec ? 0.5 : 0), woke: sleeping });
            else if (inVec && !sleeping)
                ranked.push({ book: b, score: 0, woke: false });
        }
        ranked.sort((a, z) => z.score - a.score);
        const top = ranked.slice(0, limit);
        if (!top.length && !plain.length) {
            return "📚 The Eternal Library has no relevant books for this problem yet.";
        }
        const lines = ["=== 📚 REFERENCE BOOKS FROM THE ETERNAL LIBRARY (cross-project) ==="];
        for (const { book, score, woke } of top) {
            const prov = [book.origin].filter(Boolean).join("/");
            const badges = [
                score > 0 ? `🔑 keyword×${Math.floor(score)}` : "≈ semantic",
                woke ? "😴→⏰ woke from sleep" : "",
                book.status === "building" ? "🚧 building" : "",
            ].filter(Boolean).join(" · ");
            lines.push(`\n📖 ${book.label || book.title}  v${book.version || 1}  [${(book.tags || []).join(", ")}]  (${badges}${prov ? ` · ${prov}` : ""})`);
            lines.push(String(book.content ?? "").trim());
        }
        lines.push(...plain);
        return lines.join("\n");
    }
    /**
     * KNOWLEDGE CONSOLIDATION: Transform short-term memory into Eternal Library
     */
    async consolidateAndCleanSession() {
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
        const texts = activeMemories.results.map((m) => m.text);
        let totalFacts = 0;
        for (let i = 0; i < texts.length; i += CONSOLIDATE_BATCH) {
            const batch = texts.slice(i, i + CONSOLIDATE_BATCH).join("\n");
            try {
                const res = await this.eternalLibrary.analyzeAndWait(batch);
                totalFacts += res.facts.length;
            }
            catch (err) {
                console.error(`[consolidate] batch ${i / CONSOLIDATE_BATCH} failed, skipping:`, err);
            }
        }
        // NOTE (#2 Active Forgetting — not yet enabled): the SDK does not expose a
        // namespace-clear primitive, so the Thinking Brain is not wiped here. Until
        // that lands, repeated consolidation is idempotent-ish because analyze()
        // dedupes facts, but working memory still accumulates. Tracked separately.
        return `Consolidated ${totalFacts} durable knowledge neurons into the Eternal Library.`;
    }
    /**
     * COGNITIVE RECOVERY: Download and rebuild index if cache is cleared
     */
    async recoverCognitiveIndex() {
        await this.eternalLibrary.restore("eternal:global:associative-core");
        // @ts-ignore
        await this.thinkingBrain.restore(this.thinkingBrain.namespace);
    }
    /**
     * Helper: Markdown (.md) Header Splitter
     */
    chunkByMarkdownHeaders(markdown) {
        const headerRegex = /^(#{1,4}\s+.*)$/gm;
        const chunks = [];
        const parts = markdown.split(headerRegex);
        let currentChunk = "";
        for (const part of parts) {
            if (part.startsWith("#")) {
                if (currentChunk)
                    chunks.push(currentChunk.trim());
                currentChunk = part + "\n";
            }
            else {
                currentChunk += part;
            }
        }
        if (currentChunk)
            chunks.push(currentChunk.trim());
        return chunks;
    }
    /**
     * TOPOLOGY GRAPH: Fetch raw facts to visualize in the 2D Knowledge Graph
     */
    async fetchBrainTopology() {
        // 1. Fetch a diverse sample from both Brain namespaces.
        const libraryMemories = await this.eternalLibrary.recall({ query: "agent AI memory walrus sui system code", limit: 60 });
        const sessionMemories = await this.thinkingBrain.recall({ query: "agent AI memory walrus sui system code", limit: 30 });
        const nodes = [];
        libraryMemories.results.forEach((m, index) => {
            nodes.push({ id: `lib_${m.blob_id || index}`, val: 1.5, group: 1, label: m.text.substring(0, 40) + "...", fullText: m.text });
        });
        sessionMemories.results.forEach((m, index) => {
            nodes.push({ id: `ses_${m.blob_id || index}`, val: 1, group: 2, label: m.text.substring(0, 40) + "...", fullText: m.text });
        });
        const capped = nodes.slice(0, TOPO_MAX_NODES);
        // 2. Edges via significant-term Jaccard overlap. This runs IN THE BROWSER,
        //    so it must be instant and network-free: this relayer does not expose
        //    /embed (404), and one recall per node would blow the 30 req/min limit
        //    on every graph refresh. Term-overlap is lexical (not vector) but
        //    reliable; upgrade to cosine over embeddings if /embed lands.
        const termSets = capped.map((n) => new Set(String(n.fullText).toLowerCase().split(/\W+/).filter((w) => w.length > 4)));
        const jaccard = (a, b) => {
            if (!a.size || !b.size)
                return 0;
            let inter = 0;
            for (const w of a)
                if (b.has(w))
                    inter++;
            return inter / (a.size + b.size - inter);
        };
        const links = [];
        const seen = new Set();
        for (let i = 0; i < capped.length; i++) {
            const sims = [];
            for (let j = 0; j < capped.length; j++) {
                if (i === j)
                    continue;
                const sim = jaccard(termSets[i], termSets[j]);
                if (sim > 0)
                    sims.push({ j, sim });
            }
            sims.sort((a, b) => b.sim - a.sim);
            for (const { j, sim } of sims.slice(0, TOPO_EDGES_PER_NODE)) {
                if (sim < TOPO_MIN_JACCARD)
                    continue;
                const key = i < j ? `${i}-${j}` : `${j}-${i}`;
                if (seen.has(key))
                    continue;
                seen.add(key);
                links.push({ source: capped[i].id, target: capped[j].id, value: sim });
            }
        }
        return { nodes: capped, links };
    }
}
