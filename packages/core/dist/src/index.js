import { MemWal } from "@mysten-incubation/memwal";
export class WalrusEternalBrain {
    eternalLibrary; // Eternal Library (Left Brain - Logic)
    thinkingBrain; // Thinking Brain (Right Brain - Intuition)
    constructor(config) {
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
    /**
     * INGESTION PATH 1: Process and ingest Markdown (.md) Files from Dashboard
     */
    async ingestMarkdownBook(markdownContent) {
        const rawChunks = this.chunkByMarkdownHeaders(markdownContent);
        let successfullyStoredFacts = 0;
        for (const chunk of rawChunks) {
            if (chunk.trim().length < 40)
                continue; // Skip very short chunks
            // No built-in analyze in MemWal, just store the chunk directly
            const job = await this.eternalLibrary.remember(chunk);
            await this.eternalLibrary.waitForRememberJob(job.job_id);
            successfullyStoredFacts++;
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
        // 1. Scan Global Library (Past experience - High similarity threshold for absolute precision)
        const libraryMemories = await this.eternalLibrary.recall({
            query: query,
            maxDistance: 1 - 0.45
        });
        // 2. Scan current thinking brain (Current project context - Low similarity threshold)
        const sessionMemories = await this.thinkingBrain.recall({
            query: query,
            maxDistance: 1 - 0.25
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
     * KNOWLEDGE CONSOLIDATION: Transform short-term memory into Eternal Library
     */
    async consolidateAndCleanSession() {
        // Scan the entire working memory of the current project
        const activeMemories = await this.thinkingBrain.recall({
            query: "Analyze structural findings, configuration guidelines, and critical code fixes.",
            maxDistance: 1 - 0.1
        });
        if (!activeMemories || activeMemories.results.length === 0) {
            return "Không tìm thấy tri thức mới cần củng cố.";
        }
        const compiledText = activeMemories.results.map((m) => m.text).join("\n");
        // Use AI to extract core Facts
        // No built-in analyze in MemWal, we just use a generic representation for now
        const facts = [compiledText];
        // Push consolidated Facts into the global Eternal Library
        for (const fact of facts) {
            const job = await this.eternalLibrary.remember(fact);
            await this.eternalLibrary.waitForRememberJob(job.job_id);
        }
        return `Đã kết tinh thành công ${facts.length} nơ-ron tri thức vĩnh cửu lên Walrus.`;
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
        // 1. Fetch a generic sample of memories from both Brain namespaces
        // Using a broad query to retrieve a diverse set of facts
        const libraryMemories = await this.eternalLibrary.recall({ query: "agent AI memory walrus sui system code", limit: 60 });
        const sessionMemories = await this.thinkingBrain.recall({ query: "agent AI memory walrus sui system code", limit: 30 });
        const nodes = [];
        const links = [];
        // Assigning group 1 for Library (Eternal), group 2 for Session (Active)
        libraryMemories.results.forEach((m, index) => {
            nodes.push({
                id: `lib_${m.blob_id || index}`,
                val: 1.5,
                group: 1,
                label: m.text.substring(0, 40) + "...",
                fullText: m.text
            });
        });
        sessionMemories.results.forEach((m, index) => {
            nodes.push({
                id: `ses_${m.blob_id || index}`,
                val: 1,
                group: 2,
                label: m.text.substring(0, 40) + "...",
                fullText: m.text
            });
        });
        // 2. Keyword matching for pseudo-edges (Simple intersection algorithm)
        for (let i = 0; i < nodes.length; i++) {
            const wordsI = new Set(nodes[i].fullText.toLowerCase().split(/\W+/).filter((w) => w.length > 5));
            for (let j = i + 1; j < nodes.length; j++) {
                const wordsJ = new Set(nodes[j].fullText.toLowerCase().split(/\W+/).filter((w) => w.length > 5));
                let intersection = 0;
                for (const w of wordsI) {
                    if (wordsJ.has(w))
                        intersection++;
                }
                // If they share at least 2 significant words, link them!
                if (intersection > 1) {
                    links.push({ source: nodes[i].id, target: nodes[j].id });
                }
            }
        }
        return { nodes, links };
    }
}
