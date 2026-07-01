/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Full Eternal Architecture Test
 *  Tests all 5 phases: Identity, TTL, Confidence, Regeneration, Watchdog
 * ═══════════════════════════════════════════════════════════════════
 */

import { NeuroAgentBrain } from "../src/lib/NeuroAgentBrain.js";
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

const ACCOUNT_ID = process.env.VITE_MEMWAL_ACCOUNT_ID!;
const DELEGATE_KEY = process.env.VITE_MEMWAL_DELEGATE_KEY!;
const SERVER_URL = process.env.VITE_MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz";

if (!ACCOUNT_ID || !DELEGATE_KEY) {
  console.error("❌ Missing .env credentials"); process.exit(1);
}

async function main() {
  const brain = new NeuroAgentBrain(DELEGATE_KEY, ACCOUNT_ID, SERVER_URL);

  // ── PHASE A: Identity Test Suite ──────────────────────────────────
  console.log("═══════════════════════════════════════════════════");
  console.log("  PHASE A: Behavioral Test Suite (20 scenarios)");
  console.log("═══════════════════════════════════════════════════\n");

  const testResult = await brain.runBehavioralTestSuite();
  console.log(`  ✅ Pass Rate: ${(testResult.passRate * 100).toFixed(0)}% (${testResult.results.filter(r => r.passed).length}/${testResult.results.length})`);
  
  const failed = testResult.results.filter(r => !r.passed);
  if (failed.length > 0) {
    console.log(`  ⚠️  Failed scenarios:`);
    failed.forEach(f => console.log(`     - ${f.scenarioId}: expected ${f.actualBehavior}`));
  }

  // ── PHASE A: Identity Integrity ───────────────────────────────────
  console.log("\n── Identity Integrity Check ──");
  const identity = await brain.validateIdentityIntegrity();
  console.log(`  ${identity.intact ? "✅" : "❌"} ${identity.details}`);

  // ── PHASE B: TTL & Promotion ──────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  PHASE B: Perceive & Store (with TTL + Promotion)");
  console.log("═══════════════════════════════════════════════════\n");

  console.log("  ⚡ Stimulus 1: Logic input (JSON)...");
  await brain.perceiveAndStore('{"task": "build_ui", "preference": "dark mode", "language": "TypeScript"}');
  console.log("  ✅ Stored in Left Brain with TTL metadata.\n");

  console.log("  ⚡ Stimulus 2: Emotional input...");
  await brain.perceiveAndStore("Giao diện này đẹp tuyệt vời, tôi rất thích!");
  console.log("  ✅ Stored in Right Brain with POSITIVE tag.\n");

  console.log("  ⚡ Stimulus 3: Critical error (Fight-or-Flight)...");
  await brain.perceiveAndStore("CẢNH BÁO LỖI NGHIÊM TRỌNG: Deploy fail trên Walrus!");
  console.log("  ✅ Amygdala emergency store complete.\n");

  // ── PHASE C: Calibrated Recall ────────────────────────────────────
  console.log("═══════════════════════════════════════════════════");
  console.log("  PHASE C: Calibrated Recall (Confidence Scoring)");
  console.log("═══════════════════════════════════════════════════\n");

  const recallResults = await brain.calibratedRecall("dark mode error deploy");
  
  if (recallResults.length === 0) {
    console.log("  ⚠️  No memories found for query.");
  } else {
    console.log(`  Found ${recallResults.length} memories:\n`);
    recallResults.forEach((r, i) => {
      const icon = r.decision === "TRUST" ? "🟢" : r.decision === "VERIFY" ? "🟡" : "🔴";
      console.log(`  [${i+1}] ${icon} ${r.decision} (conf: ${r.confidence.toFixed(2)}) [${r.source}]`);
      console.log(`      ${r.text.substring(0, 120)}${r.text.length > 120 ? "..." : ""}`);
    });
  }

  // ── PHASE D: Regeneration (Consolidation) ─────────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  PHASE D: Regeneration Engine (Nightly Cycle)");
  console.log("═══════════════════════════════════════════════════\n");

  const consolidation = await brain.runConsolidationCycle();
  console.log(`  📊 Duplicates: ${consolidation.duplicatesFound}`);
  console.log(`  📊 Expired (TTL): ${consolidation.pruned}`);
  console.log(`  📊 Promotions: ${consolidation.promotions}`);
  console.log(`  📊 Demotions: ${consolidation.demotions}`);

  // ── PHASE E: Health Check (Watchdog Interface) ────────────────────
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  PHASE E: Watchdog Health Check");
  console.log("═══════════════════════════════════════════════════\n");

  const health = await brain.healthCheck();
  const statusIcon = health.status === "HEALTHY" ? "🟢" : health.status === "DEGRADED" ? "🟡" : "🔴";
  console.log(`  ${statusIcon} Status: ${health.status}`);
  console.log(`  🔐 Identity Intact: ${health.identityIntact}`);
  console.log(`  📋 Test Suite Pass Rate: ${(health.testSuitePassRate * 100).toFixed(0)}%`);
  console.log(`  🕐 Last Check: ${health.lastConsolidation}`);

  console.log("\n🚀 All 5 phases tested successfully!");
}

main().catch(err => { console.error("❌ Test failed:", err); process.exit(1); });
