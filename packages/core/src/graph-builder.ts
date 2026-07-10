import * as fs from "fs";
import * as path from "path";

/**
 * @deprecated Phase 13-A: superseded by COMPOSITION with codebase-memory-mcp
 * (github.com/DeusData/codebase-memory-mcp) — a compiled Tree-sitter/LSP/SQLite
 * engine this regex stub can never match. Kept only as a type/interface
 * fallback when CBM is absent; the real structural graph lives in CBM's
 * `.codebase-memory/graph.db.zst` artifact, whose provenance (hash+size) is
 * recorded in shelved books by brain_shelve_project.
 */

/**
 * Interface cho một node trong Knowledge Graph
 */
export interface GraphNode {
  id: string;
  label: string; // 'File', 'Class', 'Function', 'Route'
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
  type: string; // 'CALLS', 'IMPORTS', 'DEFINES', 'EMITS'
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
export class GraphBuilder {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: GraphEdge[] = [];
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  public addNode(node: GraphNode) {
    this.nodes.set(node.id, node);
  }

  public addEdge(edge: GraphEdge) {
    this.edges.push(edge);
  }

  /**
   * Quét một file và tự động tạo node/edge.
   */
  public parseFile(filePath: string, content: string) {
    const fileId = `file:${filePath}`;
    this.addNode({
      id: fileId,
      label: "File",
      name: path.basename(filePath),
      metadata: { ext: path.extname(filePath) }
    });

    // Mô phỏng Tree-Sitter: Tìm kiếm các hàm (Function)
    const funcRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      const funcName = match[1];
      const funcId = `func:${filePath}#${funcName}`;
      this.addNode({
        id: funcId,
        label: "Function",
        name: funcName
      });
      // File defines Function
      this.addEdge({
        source: fileId,
        target: funcId,
        type: "DEFINES"
      });
    }

    // Mô phỏng Hybrid LSP: Tìm import
    const importRegex = /import\s+.*\s+from\s+["']([^"']+)["']/g;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      this.addEdge({
        source: fileId,
        target: `file:${importPath}`,
        type: "IMPORTS"
      });
    }
  }

  /**
   * Xuất Đồ thị thành JSON-LD/Graph Blob để nén và đẩy lên Walrus.
   */
  public exportBlob(): GraphBlob {
    return {
      version: "1.0",
      projectId: this.projectId,
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      timestamp: Date.now()
    };
  }

  /**
   * (Dự phòng) Hàm nén ZST giả lập
   */
  public exportCompressed(): string {
    const blob = this.exportBlob();
    const str = JSON.stringify(blob);
    // Ở môi trường thực tế, dùng thư viện fflate hoặc zstd để nén
    const compressed = Buffer.from(str).toString("base64");
    return compressed;
  }
}
