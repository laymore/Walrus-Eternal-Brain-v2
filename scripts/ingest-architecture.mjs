/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Ingest Architecture Document
 *  Lưu tài liệu thiết kế hệ thống vào docs và nạp lên Walrus Memory
 * ═══════════════════════════════════════════════════════════════════
 */

import { MemWal } from "@mysten-incubation/memwal";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Load .env ──────────────────────────────────────────────────────
function loadDotEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadDotEnv();

const ACCOUNT_ID = process.env.VITE_MEMWAL_ACCOUNT_ID;
const DELEGATE_KEY = process.env.VITE_MEMWAL_DELEGATE_KEY;
const SERVER_URL = process.env.VITE_MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz";

if (!ACCOUNT_ID || !DELEGATE_KEY) {
  console.error("❌ Missing VITE_MEMWAL_ACCOUNT_ID or VITE_MEMWAL_DELEGATE_KEY in .env");
  process.exit(1);
}

// ── Retry wrapper ──────────────────────────────────────────────────
async function rememberWithRetry(client, payload, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const job = await client.remember(payload);
      return await client.waitForRememberJob(job.job_id);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      console.log(`      ⚠️ Error: ${err.message}. Retrying in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

async function main() {
  console.log("🧠 ═══ Antigravity Brain — Ingesting Architecture ═══\n");

  const sourceFile = "C:\\Users\\admin\\Desktop\\nghiên cứu mempry walrus.md";
  const targetFile = path.join(__dirname, "..", "docs", "antigravity_architecture.md");

  // 1. Đọc nội dung file gốc
  console.log(`📄 Step 1: Reading research document...`);
  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ File not found: ${sourceFile}`);
    process.exit(1);
  }
  let content = fs.readFileSync(sourceFile, "utf-8");

  // Bỏ qua dòng hướng dẫn copy đầu file nếu có
  if (content.includes("Dưới đây là toàn bộ nội dung báo cáo nghiên cứu")) {
      content = content.replace(/^.*---\n\n/, ""); // Remove everything before the first ---
  }

  // 2. Lưu vào thư mục docs/ của dự án
  console.log(`💾 Step 2: Saving to ${targetFile}...`);
  fs.writeFileSync(targetFile, content, "utf-8");
  console.log("   ✅ File saved.");

  // 3. Nạp vào NS_BRAIN_semantic
  console.log(`\n📚 Step 3: Uploading architecture to NS_BRAIN_semantic on Walrus Memory...`);
  
  const semanticClient = MemWal.create({
    key: DELEGATE_KEY,
    accountId: ACCOUNT_ID,
    serverUrl: SERVER_URL,
    namespace: "NS_BRAIN_semantic",
  });

  const memoryPayload = JSON.stringify({
    type: "BRAIN_SEMANTIC",
    concept: "Antigravity Brain Complete Architecture Blueprint",
    knowledge: "Tài liệu thiết kế gốc (Whitepaper) của hệ thống bộ não Antigravity. Mô tả kiến trúc 5 lớp (Working, Session, Active, Deep, Archival), các namespaces chuyên biệt, và lộ trình 6 giai đoạn.",
    category: "architecture",
    full_document: content,
    confidence: 1.0,
    tags: ["architecture", "whitepaper", "blueprint", "walrus-memory", "sui"]
  });

  const result = await rememberWithRetry(semanticClient, memoryPayload);
  console.log(`   ✅ Architecture document ingested successfully!`);
  console.log(`   🔗 Blob ID: ${result.blob_id}`);

  console.log("\n🔍 Step 4: Verifying — recalling architecture document...\n");
  const recallResult = await semanticClient.recall({ 
    query: "Antigravity Brain Complete Architecture Blueprint", 
    limit: 1 
  });
  
  if (recallResult.results.length > 0) {
    try {
      const item = JSON.parse(recallResult.results[0].text);
      console.log(`   📌 Recalled: ${item.concept}`);
      console.log(`      Found ${item.full_document.length} bytes of architectural knowledge.`);
    } catch { /* skip */ }
  }

  console.log("\n🚀 Done!");
}

main().catch((err) => {
  console.error("❌ Failed to ingest architecture:", err);
  process.exit(1);
});
