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
    constructor(config: EternalBrainConfig);
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
