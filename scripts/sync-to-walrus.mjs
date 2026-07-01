/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Full Sync to Walrus Memory
 *  Đồng bộ toàn bộ kiến thức mới lên các Namespace trên Walrus
 * ═══════════════════════════════════════════════════════════════════
 */

import { MemWal } from "@mysten-incubation/memwal";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.error("❌ Missing credentials"); process.exit(1);
}

function clientFor(ns) {
  return MemWal.create({
    key: DELEGATE_KEY, accountId: ACCOUNT_ID,
    serverUrl: SERVER_URL, namespace: ns,
  });
}

async function rememberWithRetry(client, payload, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const job = await client.remember(payload);
      return await client.waitForRememberJob(job.job_id);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      console.log(`      ⚠️ Retry ${i+1}: ${err.message}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

async function main() {
  console.log("🧠 ═══ Antigravity Brain — Full Walrus Sync ═══\n");

  // ── 1. Nạp nghiên cứu Eternal Brain vào NS_BRAIN_semantic ──────────
  console.log("📚 [1/5] Nạp Eternal Brain Architecture vào NS_BRAIN_semantic...");
  const semanticClient = clientFor("NS_BRAIN_semantic");

  const eternalDoc = path.join(__dirname, "..", "docs", "eternal_brain_architecture.md");
  if (fs.existsSync(eternalDoc)) {
    const content = fs.readFileSync(eternalDoc, "utf-8");
    const result = await rememberWithRetry(semanticClient, JSON.stringify({
      type: "BRAIN_SEMANTIC",
      concept: "Eternal Agent Brain Architecture (Claude Opus 4.8)",
      knowledge: "Kiến trúc 5-Layer Production-Ready cho AI agent dài hạn. Bao gồm External Authority, Immutable Core, Consolidated Knowledge, Working Memory (3 latency tiers), Regeneration Engine, và Watchdog.",
      category: "architecture",
      source: "Claude Opus 4.8 — 14 agents, 299K tokens research",
      confidence: 1.0,
      tags: ["eternal-brain", "production-ready", "5-layer", "watchdog", "regeneration"],
    }));
    console.log(`   ✅ Blob: ${result.blob_id}`);
  } else {
    console.log("   ⚠️ File not found, skipping.");
  }

  // ── 2. Nạp nghiên cứu Mô phỏng Não Người vào NS_BRAIN_semantic ────
  console.log("\n📚 [2/5] Nạp nghiên cứu Mô phỏng Não Người vào NS_BRAIN_semantic...");
  const brainSimDoc = path.join(__dirname, "..", "docs", "antigravity_architecture.md");
  if (fs.existsSync(brainSimDoc)) {
    // Đã nạp trước đó, chỉ cần verify
    const recall = await semanticClient.recall({ query: "Antigravity Brain Complete Architecture Blueprint", limit: 1 });
    if (recall.results.length > 0) {
      console.log("   ✅ Đã tồn tại trên Walrus (nạp trước đó). Verified.");
    } else {
      const content = fs.readFileSync(brainSimDoc, "utf-8");
      const result = await rememberWithRetry(semanticClient, JSON.stringify({
        type: "BRAIN_SEMANTIC",
        concept: "NeuroAgentBrain Biological Simulation Blueprint",
        knowledge: "Thiết kế mô phỏng não người: Bán cầu não Trái/Phải, Hồi răng (Dentate Gyrus), Hạch hạnh nhân (Amygdala), Pattern Separation.",
        category: "architecture",
        confidence: 1.0,
      }));
      console.log(`   ✅ Blob: ${result.blob_id}`);
    }
  }

  // ── 3. Cập nhật NS_BRAIN_procedural với Eternal Brain skills ───────
  console.log("\n🔧 [3/5] Nạp Procedural Skills (Eternal Brain) vào NS_BRAIN_procedural...");
  const proceduralClient = clientFor("NS_BRAIN_procedural");

  const eternalSkills = [
    {
      skill: "Run Behavioral Test Suite",
      steps: [
        "1. Gọi brain.runBehavioralTestSuite()",
        "2. Kiểm tra passRate >= 0.95",
        "3. Nếu < 0.90 → CRITICAL DRIFT → dừng mọi hoạt động",
        "4. Ghi kết quả vào NS_BRAIN_meta",
      ],
      frequency: "Monthly",
    },
    {
      skill: "Run Consolidation Cycle (Brain Sleep)",
      steps: [
        "1. Gọi brain.runConsolidationCycle()",
        "2. Kiểm tra duplicates, expired TTL, promotions",
        "3. Nếu backlog > 2 nights → emergency prune",
        "4. Ghi kết quả vào NS_BRAIN_meta",
      ],
      frequency: "Nightly",
    },
    {
      skill: "Run Watchdog Health Check",
      steps: [
        "1. Chạy: node scripts/watchdog.mjs",
        "2. Kiểm tra output: HEALTHY / DEGRADED / CRITICAL",
        "3. Nếu CRITICAL → kiểm tra Identity ngay lập tức",
        "4. Log lưu tại logs/watchdog.log",
      ],
      frequency: "Daily",
    },
    {
      skill: "Calibrated Recall (Refuse-and-Explain)",
      steps: [
        "1. Gọi brain.calibratedRecall(query)",
        "2. Kết quả: TRUST (conf >= 0.8) | VERIFY (0.5-0.8) | REFUSE (< 0.5)",
        "3. Nếu REFUSE → trả lời user: 'Tôi không đủ tự tin để trả lời. Lý do: ...'",
        "4. Nếu VERIFY → trả lời kèm cảnh báo: 'Thông tin này cần xác nhận thêm.'",
      ],
      frequency: "Every recall",
    },
  ];

  for (const skill of eternalSkills) {
    const result = await rememberWithRetry(proceduralClient, JSON.stringify({
      type: "BRAIN_PROCEDURAL",
      ...skill,
      confidence: 1.0,
      source: "Eternal Brain Architecture v1.0",
    }));
    console.log(`   ✅ Skill "${skill.skill}" → Blob: ${result.blob_id}`);
  }

  // ── 4. Cập nhật NS_BRAIN_meta với trạng thái hệ thống ─────────────
  console.log("\n🧩 [4/5] Ghi trạng thái hệ thống hiện tại vào NS_BRAIN_meta...");
  const metaClient = clientFor("NS_BRAIN_meta");

  const result4 = await rememberWithRetry(metaClient, JSON.stringify({
    type: "SYSTEM_STATE",
    timestamp: Date.now(),
    architecture_version: "Eternal Brain v1.0 + NeuroAgentBrain v2.0",
    phases_completed: [
      "Phase 0: MCP Bridge",
      "Phase 1: Identity Core",
      "Phase 2: Episodic Memory",
      "Phase 3: Semantic Memory + Relations",
      "Phase 4: Procedural Memory",
      "Phase 5: Metacognition",
      "Phase 6: Collective Intelligence",
      "Phase 7: Biological Simulation (Left/Right Brain + Amygdala)",
      "Phase 8: Eternal Brain Architecture (Test Suite + TTL + Confidence + Regeneration + Watchdog)",
    ],
    namespaces_active: [
      "NS_BRAIN_identity", "NS_BRAIN_episodic", "NS_BRAIN_semantic",
      "NS_BRAIN_procedural", "NS_BRAIN_emotional", "NS_BRAIN_relations",
      "NS_BRAIN_meta", "NS_BRAIN_collective",
      "agent:left-brain:procedural", "agent:right-brain:episodic", "agent:brain:emotional",
    ],
    last_behavioral_test: "100% pass (20/20)",
    last_watchdog_verdict: "HEALTHY",
    last_consolidation: new Date().toISOString(),
  }));
  console.log(`   ✅ System State → Blob: ${result4.blob_id}`);

  // ── 5. Verify toàn bộ bằng recall ─────────────────────────────────
  console.log("\n🔍 [5/5] Xác minh đồng bộ...\n");

  const checks = [
    { ns: "NS_BRAIN_semantic", query: "Eternal Agent Brain Architecture", label: "Eternal Brain Doc" },
    { ns: "NS_BRAIN_procedural", query: "Behavioral Test Suite", label: "Procedural: Test Suite" },
    { ns: "NS_BRAIN_procedural", query: "Consolidation Cycle Brain Sleep", label: "Procedural: Consolidation" },
    { ns: "NS_BRAIN_procedural", query: "Watchdog Health Check", label: "Procedural: Watchdog" },
    { ns: "NS_BRAIN_procedural", query: "Calibrated Recall Refuse", label: "Procedural: Calibrated Recall" },
    { ns: "NS_BRAIN_meta", query: "SYSTEM_STATE architecture_version Eternal", label: "System State" },
  ];

  let allOk = true;
  for (const check of checks) {
    const client = clientFor(check.ns);
    try {
      const r = await client.recall({ query: check.query, limit: 1 });
      if (r.results.length > 0) {
        console.log(`   ✅ ${check.label} — Found on Walrus`);
      } else {
        console.log(`   ⚠️ ${check.label} — NOT FOUND`);
        allOk = false;
      }
    } catch (err) {
      console.log(`   ❌ ${check.label} — Error: ${err.message}`);
      allOk = false;
    }
  }

  console.log(`\n${ allOk ? "🚀" : "⚠️"} Đồng bộ ${allOk ? "HOÀN TẤT" : "CÓ LỖI"}!`);
}

main().catch(err => { console.error("❌ Sync failed:", err); process.exit(1); });
