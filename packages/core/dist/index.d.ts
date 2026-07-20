import { MemWal } from "@mysten-incubation/memwal";
export { GraphBuilder, GraphBlob, GraphNode, GraphEdge } from "./graph-builder.js";
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
export declare function extractWikiLinks(content: unknown): string[];
export declare function deriveTlDr(content: unknown, maxChars?: number): string;
export interface UniversalIdentity {
    type?: string;
    version?: number;
    signature?: string;
    ownership?: {
        dev_wallet?: string;
        project_sui_name?: string;
        walrus_site_object_id?: string;
        delegated_keys?: string[];
    };
    persona?: {
        agent_name?: string;
        role?: string;
        goal?: string;
        lore?: string[];
        style?: string[];
    };
    runtime?: {
        tech_stack?: string[];
        capabilities?: string[];
        safety_constraints?: string[];
    };
    collaborators?: {
        allowed_models?: string[];
        can_delegate?: boolean;
    };
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
export declare function projectIdentity(id: UniversalIdentity, format?: IdentityFormat): unknown;
export declare class WalrusEternalBrain {
    eternalLibrary: MemWal;
    thinkingBrain: MemWal;
    private cfg;
    private thinkingBrainNamespace;
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
     * book_id); each BOOK_LINK = a lineage synapse. Returns {nodes, links,
     * corrections}. `corrections` maps a flawed book_id → its errata entries
     * (Phase 12 "Garbage Vault" — Walrus is immutable, so wrong books can't be
     * deleted; a CORRECTION_BOOK links back to the original instead).
     */
    fetchLibraryNeurons(): Promise<{
        nodes: any[];
        links: any[];
        corrections: Record<string, any[]>;
    }>;
    /** ADD BOOK: shelve a new book-neuron (v1) into the Eternal Library (agent-driven). */
    createBook(title: string, content: string, tags?: string[], status?: "building" | "complete", opts?: {
        tlDr?: string;
        domainContext?: string;
        origin?: string;
        sourceModel?: string;
    }): Promise<string>;
    /**
     * brain_read_book: pull the FULL text of one book on demand — the agent
     * calls this only after the TL;DR card (from consultLibrary) looks relevant,
     * so the context window isn't blown by every book's full content up front.
     */
    getBookContent(bookId: string): Promise<{
        title: string;
        content: string;
        version: number;
    } | null>;
    /**
     * LIBRARY LEDGER: what the librarian has been DOING — shelf events (books
     * shelved/evolved, synapses formed) plus recent working traces with model
     * provenance. This is the UI's proof-of-work feed.
     */
    fetchLedger(limit?: number): Promise<{
        shelf: any[];
        traces: any[];
    }>;
    /** Latest ETERNAL_HEALTH snapshot (Phase 8) from NS_BRAIN_meta, or null. */
    fetchBrainHealth(): Promise<any | null>;
    /**
     * LIBRARIAN MATURITY (Phase 13-C): growth stages computed from REAL on-chain
     * metrics — never self-declared. A rank crossing is recorded as a signed
     * identity version (see identity-evolve --promote), so the librarian's
     * coming-of-age story lives in the same append-only history as everything else.
     */
    computeMaturity(): Promise<{
        rank: string;
        level: number;
        metrics: Record<string, number>;
        next: {
            rank: string;
            missing: string[];
        } | null;
    }>;
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
     * SELECTIVE INGESTION (Phase 13-B): the write-gate for working traces.
     * Every model already has its own short-term memory — the brain persists
     * only what is genuinely worth keeping:
     *  - importance gate: below the threshold, the write is refused with
     *    guidance to keep it in the model's own context.
     *  - dedup-before-write: recall first; if a near-duplicate trace already
     *    exists, skip the write and say so (no piling identical traces).
     */
    rememberSelective(trace: string, importance: number): Promise<{
        written: boolean;
        reason: string;
    }>;
    /**
     * INTEGRATED RETRIEVAL: Pull context-optimized knowledge, saving API tokens
     */
    retrieveOptimizedContext(query: string): Promise<string>;
    /**
     * CROSS-PROJECT CONSULT (Phase 6): a new or stuck project pulls reference
     * "books" from the Eternal Library FIRST — accumulated wisdom that outlives
     * any single project — before touching its own session memory.
     */
    consultLibrary(problem: string, limit?: number, opts?: {
        domain?: string;
    }): Promise<string>;
    /**
     * KNOWLEDGE CONSOLIDATION: Transform short-term memory into Eternal Library
     */
    consolidateAndCleanSession(): Promise<string>;
    /**
     * ACTIVE FORGETTING: Wipe current working memory by migrating to a new epoch namespace.
     * This prevents context bloat and rate-limit issues after consolidation.
     */
    clearThinkingBrain(): Promise<void>;
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
