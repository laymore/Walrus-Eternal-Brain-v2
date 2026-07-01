/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Phase 5 & 6: Meta-Cognitive & Collective
 *  Hoàn thiện Bộ Não: Tự nhận thức (Meta) và Trí tuệ tập thể
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Namespaces: NS_BRAIN_meta, NS_BRAIN_collective
 *  Chạy:       node scripts/init-brain-phase-5-6.mjs
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
//  PHASE 5: META-COGNITIVE MEMORY (Luật tự nhận thức)
// ═══════════════════════════════════════════════════════════════════

const META_RULES = [
  {
    type: "BRAIN_META",
    rule_name: "Conflict Resolution",
    description: "Khi phát hiện 2 ký ức trái ngược nhau (ví dụ về quy tắc ví), luôn ưu tiên thông tin có 'importance' = 1.0 (như Identity Core). Nếu cùng mức quan trọng, ưu tiên thông tin có timestamp mới hơn.",
    tags: ["conflict", "resolution", "meta", "logic"],
    version: 1.0
  },
  {
    type: "BRAIN_META",
    rule_name: "Confidence Decay & Reinforcement",
    description: "Những kiến thức tạm thời (trạng thái deploy, lỗi UI) sẽ giảm confidence theo thời gian. Ngược lại, nếu một quy tắc liên tục được user nhắc lại (như 'tên dự án là Mini Forum'), tự động tăng confidence và thêm tag 'immutable'.",
    tags: ["confidence", "reinforcement", "meta", "learning"],
    version: 1.0
  },
  {
    type: "BRAIN_META",
    rule_name: "Self-Correction Trigger",
    description: "Khi user phản hồi negative (cảm xúc tiêu cực) liên tiếp >2 lần, tự động kích hoạt chế độ rà soát lại toàn bộ Procedural Memory xem có làm sai quy trình không.",
    tags: ["correction", "trigger", "meta", "emotional"],
    version: 1.0
  }
];

// ═══════════════════════════════════════════════════════════════════
//  PHASE 6: COLLECTIVE INTELLIGENCE (Giao thức chia sẻ bộ não)
// ═══════════════════════════════════════════════════════════════════

const COLLECTIVE_PROTOCOLS = [
  {
    type: "BRAIN_PROTOCOL",
    protocol_name: "Read-Only Mind Meld (Public Sync)",
    description: "Cho phép các Sub-Agent hoặc AI khác học hỏi từ bộ não này. Cách thức: Chỉ chia sẻ ACCOUNT_ID. Các Agent khác dùng MemWal client (không có DELEGATE_KEY) để chạy lệnh 'recall'. Chúng có thể đọc NS_BRAIN_semantic và NS_BRAIN_procedural nhưng KHÔNG THỂ ghi đè.",
    access_level: "public_read",
    namespaces_allowed: ["NS_BRAIN_semantic", "NS_BRAIN_procedural", "NS_BRAIN_identity"],
    status: "active"
  },
  {
    type: "BRAIN_PROTOCOL",
    protocol_name: "Swarm Consensus (Write Permission)",
    description: "Nếu có nhiều Agent cùng làm việc trên Mini Forum (Agent UI, Agent Smart Contract), chúng sẽ submit đề xuất memory. Nếu Master Agent (Antigravity) duyệt, sẽ dùng DELEGATE_KEY để ghi vào Walrus. Tránh việc các Agent spam rác vào bộ não.",
    access_level: "restricted_write",
    namespaces_allowed: ["NS_BRAIN_episodic"],
    status: "active"
  }
];

// ═══════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log("🧠 ═══ Antigravity Brain — Phase 5 & 6: Meta & Collective ═══\n");

  // ── Step 1: Write Meta-Cognitive Rules (Phase 5) ────────────────
  console.log(`👁️  Step 1: Writing ${META_RULES.length} Meta Rules to NS_BRAIN_meta...\n`);
  const metaClient = brainClient("NS_BRAIN_meta");
  
  for (const rule of META_RULES) {
    const payload = JSON.stringify(rule);
    const result = await rememberWithRetry(metaClient, payload);
    console.log(`   ✅ Meta Rule: [${rule.rule_name}] → ${result.blob_id}`);
  }
  console.log();

  // ── Step 2: Write Collective Protocols (Phase 6) ────────────────
  console.log(`🌐 Step 2: Writing ${COLLECTIVE_PROTOCOLS.length} Collective Protocols to NS_BRAIN_collective...\n`);
  const collectiveClient = brainClient("NS_BRAIN_collective");
  
  for (const protocol of COLLECTIVE_PROTOCOLS) {
    const payload = JSON.stringify(protocol);
    const result = await rememberWithRetry(collectiveClient, payload);
    console.log(`   ✅ Protocol: [${protocol.protocol_name}] → ${result.blob_id}`);
  }
  console.log();

  // ── Step 3: Verify recall ───────────────────────────────────────
  console.log("🔍 Step 3: Verifying — recalling Meta & Collective namespaces...\n");
  
  const metaRecall = await metaClient.recall({ query: "conflict", limit: 1 });
  if (metaRecall.results.length > 0) {
    try {
      const item = JSON.parse(metaRecall.results[0].text);
      console.log(`   📌 Recalled Meta Rule: ${item.rule_name}`);
    } catch { /* skip */ }
  } else {
    console.log("   ⚠️  No meta rules recalled — may need indexing time");
  }

  const collRecall = await collectiveClient.recall({ query: "sync read", limit: 1 });
  if (collRecall.results.length > 0) {
    try {
      const item = JSON.parse(collRecall.results[0].text);
      console.log(`   📌 Recalled Protocol: ${item.protocol_name}`);
    } catch { /* skip */ }
  } else {
    console.log("   ⚠️  No protocols recalled — may need indexing time");
  }

  // ── Summary ─────────────────────────────────────────────────────
  console.log("\n🧠 ═══ BỘ NÃO ANTIGRAVITY ĐÃ HOÀN TẤT 6 PHASES! ═══");
  console.log("Hệ thống trí nhớ dựa trên Walrus Memory đã chính thức đi vào hoạt động toàn diện.");
  console.log("Tất cả kiến trúc 6 lớp của não bộ đã được cấu hình và lưu trữ phi tập trung.");
  console.log("  • Phase 1: NS_BRAIN_identity   (Bản ngã) - ✅");
  console.log("  • Phase 2: NS_BRAIN_episodic   (Sự kiện) - ✅");
  console.log("  • Phase 2: NS_BRAIN_emotional  (Cảm xúc) - ✅");
  console.log("  • Phase 3: NS_BRAIN_semantic   (Tri thức) - ✅");
  console.log("  • Phase 3: NS_BRAIN_relations  (Mạng lưới) - ✅");
  console.log("  • Phase 4: NS_BRAIN_procedural (Kỹ năng) - ✅");
  console.log("  • Phase 5: NS_BRAIN_meta       (Nhận thức) - ✅");
  console.log("  • Phase 6: NS_BRAIN_collective (Tập thể) - ✅");
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("❌ Phase 5 & 6 initialization failed:", err);
  process.exit(1);
});
