/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Phase 3: Semantic Memory & Relations Graph
 *  Ghi lại đồ thị liên kết giữa các ký ức và logic củng cố
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Namespace: NS_BRAIN_relations
 *  Chạy:      node scripts/init-brain-relations.mjs
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

function brainClient(namespace) {
  return MemWal.create({
    key: DELEGATE_KEY,
    accountId: ACCOUNT_ID,
    serverUrl: SERVER_URL,
    namespace,
  });
}

// ═══════════════════════════════════════════════════════════════════
//  RELATIONS GRAPH — Đồ thị liên kết ký ức
// ═══════════════════════════════════════════════════════════════════

const RELATIONS = [
  {
    type: "BRAIN_RELATION",
    source_id: "EP_001",
    target_id: "EP_002",
    relation_type: "followed_by",
    weight: 1.0,
    context: "Triển khai Walrus Sites xong phải gắn SuiNS ngay",
  },
  {
    type: "BRAIN_RELATION",
    source_id: "EP_005",
    target_id: "EP_004",
    relation_type: "enhances",
    weight: 0.9,
    context: "Branding Autobots mở rộng hệ thống theme",
  },
  {
    type: "BRAIN_RELATION",
    source_id: "EP_007",
    target_id: "Identity_Core",
    relation_type: "defines",
    weight: 1.0,
    context: "Quy tắc ví dev là một phần bất biến của Identity",
  },
];

// ═══════════════════════════════════════════════════════════════════
//  NEW SEMANTIC MEMORIES — Từ consolidation các episodes
// ═══════════════════════════════════════════════════════════════════

const CONSOLIDATED_SEMANTICS = [
  {
    type: "BRAIN_SEMANTIC",
    concept: "User Documentation Preference",
    knowledge: "User cực kỳ coi trọng tính chính xác và việc ghi chú chi tiết vào file. Không được lơ là việc cập nhật AGENT.md.",
    category: "pattern",
    confidence: 0.9,
    times_confirmed: 2,
    times_contradicted: 0,
    derived_from: ["EP_007"],
    first_learned: Date.now(),
    tags: ["documentation", "user-preference", "accuracy"],
  },
  {
    type: "BRAIN_SEMANTIC",
    concept: "Project Naming Accuracy",
    knowledge: "Suirobo khác với Mini Forum. Các dự án phải được phân định danh tính rõ ràng, không giả định.",
    category: "gotcha",
    confidence: 0.95,
    times_confirmed: 2,
    times_contradicted: 0,
    derived_from: ["EP_006"],
    first_learned: Date.now(),
    tags: ["naming", "project-identity", "accuracy"],
  }
];

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

// ═══════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log("🧠 ═══ Antigravity Brain — Phase 3: Semantic & Relations ═══\n");

  // ── Step 1: Write Relations ─────────────────────────────────────
  console.log(`🔗 Step 1: Writing ${RELATIONS.length} relations to NS_BRAIN_relations...\n`);
  const relationsClient = brainClient("NS_BRAIN_relations");
  
  for (const rel of RELATIONS) {
    const payload = JSON.stringify(rel);
    const result = await rememberWithRetry(relationsClient, payload);
    console.log(`   ✅ [${rel.source_id}] --(${rel.relation_type})--> [${rel.target_id}] → ${result.blob_id}`);
  }
  console.log();

  // ── Step 2: Write Consolidated Semantics ────────────────────────
  console.log(`📚 Step 2: Writing ${CONSOLIDATED_SEMANTICS.length} consolidated semantic memories to NS_BRAIN_semantic...\n`);
  const semanticClient = brainClient("NS_BRAIN_semantic");
  
  for (const sem of CONSOLIDATED_SEMANTICS) {
    const payload = JSON.stringify(sem);
    const result = await rememberWithRetry(semanticClient, payload);
    console.log(`   ✅ "${sem.concept}" → ${result.blob_id}`);
  }
  console.log();

  // ── Step 3: Verify recall ───────────────────────────────────────
  console.log("🔍 Step 3: Verifying — recalling relations graph...\n");
  
  const recallResult = await relationsClient.recall({ 
    query: "Identity rule dev wallet", 
    limit: 2 
  });
  
  if (recallResult.results.length > 0) {
    for (const r of recallResult.results) {
      try {
        const rel = JSON.parse(r.text);
        console.log(`   📌 [${rel.source_id}] --(${rel.relation_type})--> [${rel.target_id}]`);
        console.log(`      Context: ${rel.context} (Weight: ${rel.weight})`);
      } catch { /* skip parse errors */ }
    }
  } else {
    console.log("   ⚠️  No relations recalled — may need indexing time");
  }

  // ── Summary ─────────────────────────────────────────────────────
  console.log("\n🧠 ═══ Phase 3 Complete! Antigravity has established connections. ═══\n");
  console.log("Brain Namespaces status:");
  console.log("  • NS_BRAIN_identity   → ✅ Phase 1");
  console.log("  • NS_BRAIN_semantic   → ✅ Phase 1 & 3 (7 entries)");
  console.log("  • NS_BRAIN_procedural → ✅ Phase 1 (1 entry)");
  console.log("  • NS_BRAIN_episodic   → ✅ Phase 2 (8 episodes)");
  console.log("  • NS_BRAIN_emotional  → ✅ Phase 2 (4 signals)");
  console.log(`  • NS_BRAIN_relations  → ✅ Phase 3 (${RELATIONS.length} edges)`);
  console.log("  • NS_BRAIN_meta       → ⏳ Phase 5");
}

main().catch((err) => {
  console.error("❌ Phase 3 initialization failed:", err);
  process.exit(1);
});
