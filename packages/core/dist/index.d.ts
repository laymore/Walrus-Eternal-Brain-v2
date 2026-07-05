import { MemWal } from "@mysten-incubation/memwal";
export interface EternalBrainConfig {
    delegateKeyHex: string;
    accountId: string;
    serverUrl: string;
    currentProjectId?: string;
}
export interface ConceptCell {
    cellId: string;
    sourceNamespace: string;
    factPayload: string;
    timestamp: number;
}
export declare class WalrusEternalBrain {
    eternalLibrary: MemWal;
    thinkingBrain: MemWal;
    private cfg;
    constructor(config: EternalBrainConfig);
    /** Spin up a client for any brain namespace (identity, semantic, ...). */
    clientFor(namespace: string): MemWal;
    /**
     * BRAIN VIEW: the identity's development history (append-only versions).
     * Returns versions oldest → newest so the UI can render a timeline.
     */
    fetchIdentityHistory(): Promise<any[]>;
    /**
     * LIBRARY VIEW: the neuron map. Each book = a neuron (latest version per
     * book_id); each BOOK_LINK = a lineage synapse. Returns {nodes, links}.
     */
    fetchLibraryNeurons(): Promise<{
        nodes: any[];
        links: any[];
    }>;
    /** ADD BOOK: shelve a new manual book-neuron (v1) into the Eternal Library. */
    createBook(title: string, content: string, tags?: string[]): Promise<string>;
    /** BOOK DETAIL: every version of one book_id, oldest → newest. */
    fetchBookHistory(bookId: string): Promise<any[]>;
    /**
     * INGESTION PATH 1: Process and ingest Markdown (.md) Files from Dashboard
     */
    ingestMarkdownBook(markdownContent: string): Promise<number>;
    /**
     * INGESTION PATH 2: Record background working traces from IDEs
     */
    recordExecutionTrace(actionTrace: string): Promise<void>;
    /**
     * INTEGRATED RETRIEVAL: Pull context-optimized knowledge, saving API tokens
     */
    retrieveOptimizedContext(query: string): Promise<string>;
    /**
     * CROSS-PROJECT CONSULT (Phase 6): a new or stuck project pulls reference
     * "books" from the Eternal Library FIRST — accumulated wisdom that outlives
     * any single project — before touching its own session memory.
     */
    consultLibrary(problem: string, limit?: number): Promise<string>;
    /**
     * KNOWLEDGE CONSOLIDATION: Transform short-term memory into Eternal Library
     */
    consolidateAndCleanSession(): Promise<string>;
    /**
     * COGNITIVE RECOVERY: Download and rebuild index if cache is cleared
     */
    recoverCognitiveIndex(): Promise<void>;
    /**
     * Helper: Markdown (.md) Header Splitter
     */
    private chunkByMarkdownHeaders;
    /**
     * TOPOLOGY GRAPH: Fetch raw facts to visualize in the 2D Knowledge Graph
     */
    fetchBrainTopology(): Promise<{
        nodes: any[];
        links: any[];
    }>;
}
