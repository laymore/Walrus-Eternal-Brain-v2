/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — WATCHDOG (Independent Monitor)
 *  Chạy riêng biệt, kiểm tra sức khỏe bộ não định kỳ.
 *  Theo đúng triết lý Eternal Brain: "Different process, different trust."
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

// ── Watchdog creates its OWN clients (independent from NeuroAgentBrain) ──
const identityClient = MemWal.create({
  key: DELEGATE_KEY, accountId: ACCOUNT_ID,
  serverUrl: SERVER_URL, namespace: "NS_BRAIN_identity",
});

const metaClient = MemWal.create({
  key: DELEGATE_KEY, accountId: ACCOUNT_ID,
  serverUrl: SERVER_URL, namespace: "NS_BRAIN_meta",
});

const LOG_FILE = path.join(__dirname, "..", "logs", "watchdog.log");

function log(level, message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}`;
  console.log(line);
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch { /* ignore log write failure */ }
}

async function checkIdentityIntegrity() {
  log("INFO", "🔍 Checking Identity Integrity...");
  try {
    const result = await identityClient.recall({
      query: "agent_name Antigravity project Mini Forum dev_wallet",
      limit: 5,
    });

    if (!result || !result.results || result.results.length === 0) {
      log("CRITICAL", "❌ IDENTITY NOT FOUND ON WALRUS! Possible data loss.");
      return false;
    }

    const allText = result.results.map(r => r.text).join(" ");

    const checks = [
      { name: "Agent Name", pattern: /Antigravity/i },
      { name: "Project", pattern: /Mini Forum/i },
      { name: "Dev Wallet", pattern: /0xfbf73b/i },
    ];

    let allPassed = true;
    for (const check of checks) {
      if (check.pattern.test(allText)) {
        log("OK", `  ✅ ${check.name}: Present`);
      } else {
        log("WARN", `  ⚠️ ${check.name}: MISSING or DRIFTED`);
        allPassed = false;
      }
    }

    return allPassed;
  } catch (err) {
    log("ERROR", `Identity check failed: ${err.message}`);
    return false;
  }
}

async function checkLastConsolidation() {
  log("INFO", "🔍 Checking last Consolidation cycle...");
  try {
    const result = await metaClient.recall({
      query: "CONSOLIDATION_RESULT",
      limit: 1,
    });

    if (!result || !result.results || result.results.length === 0) {
      log("WARN", "  ⚠️ No consolidation records found. Brain may need its first sleep cycle.");
      return;
    }

    try {
      const data = JSON.parse(result.results[0].text);
      log("OK", `  ✅ Last consolidation: ${new Date(data.timestamp).toISOString()}`);
      log("OK", `     Duplicates: ${data.duplicatesFound}, Pruned: ${data.pruned}, Promotions: ${data.promotions}`);
    } catch {
      log("OK", `  ✅ Consolidation record found (non-JSON format).`);
    }
  } catch (err) {
    log("ERROR", `Consolidation check failed: ${err.message}`);
  }
}

async function checkBehavioralTestResults() {
  log("INFO", "🔍 Checking latest Behavioral Test Suite results...");
  try {
    const result = await metaClient.recall({
      query: "BEHAVIORAL_TEST_RESULT passRate",
      limit: 1,
    });

    if (!result || !result.results || result.results.length === 0) {
      log("WARN", "  ⚠️ No test suite results found.");
      return;
    }

    try {
      const data = JSON.parse(result.results[0].text);
      const passRate = (data.passRate * 100).toFixed(0);
      if (data.passRate >= 0.95) {
        log("OK", `  ✅ Pass Rate: ${passRate}% (${data.passed}/${data.totalScenarios}) — HEALTHY`);
      } else if (data.passRate >= 0.9) {
        log("WARN", `  ⚠️ Pass Rate: ${passRate}% — DEGRADED (target: ≥95%)`);
      } else {
        log("CRITICAL", `  ❌ Pass Rate: ${passRate}% — CRITICAL DRIFT DETECTED!`);
        if (data.failedScenarios) {
          log("CRITICAL", `     Failed: ${data.failedScenarios.join(", ")}`);
        }
      }
    } catch {
      log("OK", `  ✅ Test result found (non-JSON).`);
    }
  } catch (err) {
    log("ERROR", `Test result check failed: ${err.message}`);
  }
}

async function main() {
  log("INFO", "═══════════════════════════════════════════════════");
  log("INFO", "  🐕 WATCHDOG — Independent Brain Monitor");
  log("INFO", "  Runs separately from NeuroAgentBrain");
  log("INFO", "═══════════════════════════════════════════════════");
  log("INFO", "");

  const identityOk = await checkIdentityIntegrity();
  console.log("");
  await checkLastConsolidation();
  console.log("");
  await checkBehavioralTestResults();

  console.log("");
  log("INFO", "═══════════════════════════════════════════════════");
  if (identityOk) {
    log("OK", "  🟢 WATCHDOG VERDICT: SYSTEM HEALTHY");
  } else {
    log("CRITICAL", "  🔴 WATCHDOG VERDICT: IDENTITY COMPROMISED — INVESTIGATE IMMEDIATELY");
  }
  log("INFO", "═══════════════════════════════════════════════════");
}

main().catch(err => {
  log("ERROR", `Watchdog crashed: ${err.message}`);
  process.exit(1);
});
