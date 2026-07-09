import * as path from "path";
/**
 * Trình phân tích mã nguồn cơ bản.
 * Ở môi trường production, nó sẽ dùng Tree-Sitter / Hybrid LSP.
 * Ở đây dùng regex cơ bản để mô phỏng (stub).
 */
export class GraphBuilder {
    nodes = new Map();
    edges = [];
    projectId;
    constructor(projectId) {
        this.projectId = projectId;
    }
    addNode(node) {
        this.nodes.set(node.id, node);
    }
    addEdge(edge) {
        this.edges.push(edge);
    }
    /**
     * Quét một file và tự động tạo node/edge.
     */
    parseFile(filePath, content) {
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
    exportBlob() {
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
    exportCompressed() {
        const blob = this.exportBlob();
        const str = JSON.stringify(blob);
        // Ở môi trường thực tế, dùng thư viện fflate hoặc zstd để nén
        const compressed = Buffer.from(str).toString("base64");
        return compressed;
    }
}
