/**
 * Interface cho một node trong Knowledge Graph
 */
export interface GraphNode {
    id: string;
    label: string;
    name: string;
    content?: string;
    metadata?: Record<string, any>;
}
/**
 * Interface cho một edge (cạnh) trong Knowledge Graph
 */
export interface GraphEdge {
    source: string;
    target: string;
    type: string;
    weight?: number;
}
/**
 * Graph Blob format (Lưu trữ trên Walrus)
 */
export interface GraphBlob {
    version: string;
    projectId: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    timestamp: number;
}
/**
 * Trình phân tích mã nguồn cơ bản.
 * Ở môi trường production, nó sẽ dùng Tree-Sitter / Hybrid LSP.
 * Ở đây dùng regex cơ bản để mô phỏng (stub).
 */
export declare class GraphBuilder {
    private nodes;
    private edges;
    private projectId;
    constructor(projectId: string);
    addNode(node: GraphNode): void;
    addEdge(edge: GraphEdge): void;
    /**
     * Quét một file và tự động tạo node/edge.
     */
    parseFile(filePath: string, content: string): void;
    /**
     * Xuất Đồ thị thành JSON-LD/Graph Blob để nén và đẩy lên Walrus.
     */
    exportBlob(): GraphBlob;
    /**
     * (Dự phòng) Hàm nén ZST giả lập
     */
    exportCompressed(): string;
}
