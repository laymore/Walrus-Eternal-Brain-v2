/**
 * ═══════════════════════════════════════════════════════════════════
 *  Eternal Librarian — SELF-IMPROVEMENT LOOP (Phase 14, from javis-os)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  javis-os runs a "self-running background loop executing specific tasks on
 *  schedule". We absorb that idea, on-brand for a librarian: on a timer, the
 *  brain tidies its own shelf — consolidate pending traces, promote proven
 *  facts into books, snapshot its health, and self-promote its maturity rank
 *  when it has earned one. The Watchdog only WATCHES; this one ACTS.
 *
 *  It reuses the already-verified phase engines as subprocesses (single source
 *  of truth) and calls core directly only for the maturity decision.
 *
 *  Usage:
 *    node scripts/self-improve.mjs                 # ONE dry-run cycle (safe, no writes)
 *    node scripts/self-improve.mjs --commit        # ONE real cycle (writes)
 *    node scripts/self-improve.mjs --commit --watch [--interval 3600]
 *                                                  # loop forever, every N seconds
 *    node scripts/self-improve.mjs --commit --watch --max-cycles 24
 *                                                  # loop, then stop after N cycles
 *
 *  Safe to run repeatedly: every engine it calls is idempotent + event-sourced
 *  (Walrus is append-only; nothing is mutated in place). If the relayer is
 *  paused (HTTP 503) or rate-limited (429), the cycle logs it and backs off to
 *  the next tick instead of crashing the loop.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WalrusEternalBrain } from "eternal-agent-brain-core";

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
if (!ACCOUNT_ID || !DELEGATE_KEY) { console.error("❌ Missing memwal credentials in .env"); process.exit(1); }

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const flag = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const COMMIT = has("--commit");
const WATCH = has("--watch");
const INTERVAL = Math.max(60, parseInt(flag("--interval", "3600"), 10) || 3600); // seconds, floor 60
const MAX_CYCLES = parseInt(flag("--max-cycles", "0"), 10) || 0; // 0 = unlimited
// Pause between steps so one cycle's read bursts stay under the 30 req/min
// delegate rate limit (each engine already throttles internally; this spreads
// the engines themselves out).
const STEP_DELAY = Math.max(0, parseInt(flag("--step-delay", "8"), 10)) * 1000;

const LOG_FILE = path.join(__dirname, "..", "logs", "self-improve.log");
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true }); fs.appendFileSync(LOG_FILE, line + "\n"); } catch { /* ignore */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Run one engine as a subprocess; capture output, detect the relayer being
// paused/rate-limited so the loop can back off instead of hammering it.
function runStep(label, scriptFile, extraArgs = []) {
  return new Promise((resolve) => {
    const args = [path.join(__dirname, scriptFile), ...extraArgs];
    if (COMMIT) args.push("--commit");
    log(`▶  ${label}: node ${scriptFile} ${extraArgs.join(" ")}${COMMIT ? " --commit" : " (dry-run)"}`);
    const p = spawn("node", args, { env: process.env });
    let out = "";
    p.stdout.on("data", (d) => { out += d; });
    p.stderr.on("data", (d) => { out += d; });
    p.on("close", (code) => {
      const paused = /503|uploads to Walrus Memory are paused|security upgrade/i.test(out);
      const limited = /429|rate limit/i.test(out);
      const tail = out.trim().split(/\r?\n/).slice(-2).join(" ⏎ ").slice(0, 220);
      if (paused) log(`⏸  ${label}: relayer is PAUSED (writes disabled server-side) — skipping, will retry next cycle.`);
      else if (limited) log(`🐢 ${label}: rate-limited — backing off.`);
      else log(`${code === 0 ? "✓" : "⚠"} ${label} (exit ${code}): ${tail}`);
      resolve({ code, paused, limited });
    });
    p.on("error", (e) => { log(`✗ ${label} failed to spawn: ${e.message}`); resolve({ code: -1, paused: false, limited: false }); });
  });
}

// The librarian's maturity decision — self-promote if it has EARNED a higher
// rank than what's recorded on-chain (identity-evolve --promote is a no-op if not).
async function maturityStep() {
  try {
    const brain = new WalrusEternalBrain({ delegateKeyHex: DELEGATE_KEY, accountId: ACCOUNT_ID, serverUrl: SERVER_URL });
    const m = await brain.computeMaturity();
    const idH = await brain.fetchIdentityHistory();
    const cur = idH[idH.length - 1];
    const recordedLevel = cur?.librarian_level || 0;
    log(`🎓 Maturity: ${m.rank} (Lv${m.level}) · recorded Lv${recordedLevel}` + (m.next ? ` · next ${m.next.rank}: ${m.next.missing.join("; ")}` : ""));
    if (m.level > recordedLevel) {
      log(`🎓 Rank earned! ${m.rank} exceeds recorded Lv${recordedLevel} — recording promotion.`);
      await runStep("promote-rank", "identity-evolve.mjs", ["--promote"]);
    }
  } catch (e) {
    const msg = String(e?.message || e);
    if (/503|paused|429/i.test(msg)) log(`⏸  maturity: relayer unavailable (${msg.slice(0, 60)}) — skipping.`);
    else log(`⚠ maturity check failed: ${msg.slice(0, 100)}`);
  }
}

async function oneCycle(n) {
  log(`━━━ Self-improvement cycle ${n}${MAX_CYCLES ? `/${MAX_CYCLES}` : ""} ${COMMIT ? "[COMMIT]" : "[DRY-RUN]"} ━━━`);
  const gap = () => (STEP_DELAY ? sleep(STEP_DELAY) : Promise.resolve());
  // 1) Crystallize proven semantic facts (episodic → semantic).
  await runStep("consolidate-semantic", "phase3-semantic-engine.mjs"); await gap();
  // 2) Promote high-confidence facts into cross-project books.
  await runStep("promote-library", "phase6-library-engine.mjs"); await gap();
  // 3) Reflect + calibrate (metacognition).
  await runStep("reflect-calibrate", "phase5-metacognition-engine.mjs"); await gap();
  // 4) Snapshot brain health (identity suite + TTL).
  await runStep("health-snapshot", "phase8-eternal-engine.mjs"); await gap();
  // 5) Self-promote maturity rank if earned.
  await maturityStep();
  log(`━━━ Cycle ${n} done. ${WATCH ? `Next in ${INTERVAL}s.` : ""} ━━━`);
}

async function main() {
  log(`🧠 Self-Improvement Loop starting — ${COMMIT ? "COMMIT" : "DRY-RUN"}${WATCH ? `, watch every ${INTERVAL}s` : ", single cycle"}.`);
  let n = 0;
  do {
    n++;
    await oneCycle(n);
    if (!WATCH) break;
    if (MAX_CYCLES && n >= MAX_CYCLES) { log(`Reached max-cycles ${MAX_CYCLES}. Stopping.`); break; }
    await sleep(INTERVAL * 1000);
  } while (true);
  log("🧠 Self-Improvement Loop finished.");
}

main().catch((e) => { log(`❌ Loop crashed: ${e?.message || e}`); process.exit(1); });
