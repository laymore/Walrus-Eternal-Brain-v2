import { MemWal } from "@mysten-incubation/memwal";
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
                const id = j.book_id || `book:${String(j.title || "untitled").toLowerCase()}`;
                const cur = latest.get(id);
                if (!cur || (j.version || 1) > (cur.version || 1))
                    latest.set(id, { ...j, book_id: id });
            }
            else if (j?.type === "BOOK_LINK" && j.from_book_id && j.to_book_id) {
                links.push({ source: j.from_book_id, target: j.to_book_id, reason: j.reason });
            }
        }
        const nodes = [...latest.values()].map((b) => ({
            id: b.book_id,
            label: b.title,
            version: b.version || 1,
            tags: b.tags || [],
            origin: b.origin,
            content: b.content,
            val: 1 + Math.min(3, (b.content?.length || 0) / 2000),
        }));
        const nodeIds = new Set(nodes.map((n) => n.id));
        return { nodes, links: links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target)) };
    }
    /** ADD BOOK: shelve a new manual book-neuron (v1) into the Eternal Library. */
    async createBook(title, content, tags = []) {
        const book_id = `book:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
        const book = {
            type: "LIBRARY_BOOK", book_id, version: 1, prev_version: 0,
            title, content, tags, origin: "manual", changed_at: Date.now(),
        };
        const job = await this.eternalLibrary.remember(JSON.stringify(book));
        await this.eternalLibrary.waitForRememberJob(job.job_id);
        return book_id;
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
            .filter((x) => x?.type === "LIBRARY_BOOK" && (x.book_id || `book:${String(x.title || "").toLowerCase()}`) === bookId)
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
            contextBuffer.push("=== KINH NGHIỆM ĐÃ TÍCH LŨY TỪ CÁC DỰ ÁN TRƯỚC (WALRUS ETERNAL LIBRARY) ===");
            libraryMemories.results.forEach((m) => contextBuffer.push(`* [Đã kiểm chứng]: ${m.text}`));
        }
        if (sessionMemories.results.length > 0) {
            contextBuffer.push("=== BỐI CẢNH DỰ ÁN HIỆN TẠI (ACTIVE THINKING BRAIN) ===");
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
        const hits = await this.eternalLibrary.recall({
            query: problem,
            maxDistance: LIBRARY_MAX_DISTANCE,
            limit,
        });
        if (!hits.results.length) {
            return "📚 Thư viện vĩnh cửu chưa có sách liên quan đến vấn đề này.";
        }
        // Resolve each book_id to its LATEST version (books are append-only /
        // versioned — a neuron can evolve; only the newest page is authoritative).
        const latestByBook = new Map();
        const plain = [];
        for (const h of hits.results) {
            let book = null;
            try {
                book = JSON.parse(h.text);
            }
            catch { /* plain distilled fact */ }
            if (book && book.type === "LIBRARY_BOOK") {
                const id = book.book_id || `book:${String(book.title || "untitled").toLowerCase()}`;
                const cur = latestByBook.get(id);
                if (!cur || (book.version || 1) > (cur.version || 1))
                    latestByBook.set(id, book);
            }
            else if (book?.type === "BOOK_LINK") {
                /* lineage edges are for the graph, not consult text */
            }
            else {
                plain.push(`\n• ${h.text}`);
            }
        }
        const lines = ["=== 📚 SÁCH THAM KHẢO TỪ THƯ VIỆN VĨNH CỬU (cross-project) ==="];
        for (const book of latestByBook.values()) {
            const prov = [book.origin, book.source_model].filter(Boolean).join("/");
            lines.push(`\n📖 ${book.title}  v${book.version || 1}  [${(book.tags || []).join(", ")}]${prov ? `  (nguồn: ${prov})` : ""}`);
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
            return "Không tìm thấy tri thức mới cần củng cố.";
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
        return `Đã kết tinh thành công ${totalFacts} nơ-ron tri thức vĩnh cửu lên Walrus.`;
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
