/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Phase 7: Biological Simulation ENGINE
 *  "Dynamic Nervous System" — sparse coding + hemispheric routing.
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Three mechanisms on the existing two chambers (embed-free: this relayer
 *  does not expose /embed, so we use the working recall() vector search):
 *    1. Left/Right Router  — classify input and route logic/procedural →
 *       Left (eternalLibrary), contextual/intuitive → Right (thinkingBrain).
 *    2. Pattern Separation — recall-based nearest-neighbour distance +
 *       interference-collision count (§2.2 Sparse Coding: distinct is good).
 *    3. Integrated Recall  — merge exact Left logic with Right context.
 *
 *  Usage:
 *    node scripts/phase7-neuro-engine.mjs                     # dry-run demo
 *    node scripts/phase7-neuro-engine.mjs --commit            # write meta snapshot
 *    node scripts/phase7-neuro-engine.mjs --route "text"      # classify (+--commit routes to chamber)
 *    node scripts/phase7-neuro-engine.mjs --recall "question" # integrated recall
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
const SERVER_URL = "https://relayer.memory.walrus.xyz";
if (!ACCOUNT_ID || !DELEGATE_KEY) { console.error("❌ Missing env"); process.exit(1); }

const COMMIT = process.argv.includes("--commit");
const argOf = (flag) => { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : null; };
const ROUTE = argOf("--route");
const RECALL = argOf("--recall");
const NOW = Date.now();

const LEFT_NS = "eternal:global:associative-core";        // logic / verified cortex
const RIGHT_NS = "eternal:project:active_default_session"; // context / hippocampus

function client(ns) { return MemWal.create({ key: DELEGATE_KEY, accountId: ACCOUNT_ID, serverUrl: SERVER_URL, namespace: ns }); }
const left = client(LEFT_NS), right = client(RIGHT_NS);
const shorten = (t) => (t || "").replace(/\s+/g, " ").slice(0, 80);

// ── ENGINE 1: Left/Right Router (lexicon; upgrade to embeddings when the
//    relayer exposes /embed) ──────────────────────────────────────────
const LEFT_LEX = ["deploy", "command", "step", "config", "rule", "must", "always", "sign", "code", "fix", "bug", "function", "api", "architecture", "spec", "admincap", "transaction", "build", "script", "procedure", "immutable", "requirement", "walrus", "sui", "site-builder"];
const RIGHT_LEX = ["maybe", "feel", "think", "prefer", "opinion", "discuss", "chat", "brainstorm", "idea", "context", "session", "temporary", "note", "seems", "guess", "casual", "aesthetic", "vibe", "later"];
function classify(text) {
  const t = (text || "").toLowerCase();
  const l = LEFT_LEX.filter((w) => t.includes(w)).length;
  const r = RIGHT_LEX.filter((w) => t.includes(w)).length;
  return { side: r > l ? "RIGHT" : "LEFT", left: l, right: r };
}

const SAMPLES = [
  "Run site-builder update ./dist <id> --epochs 5 to deploy",
  "The user prefers a dark cyberpunk matrix aesthetic vibe",
  "AdminCap must always sign every moderation transaction",
  "Maybe we should brainstorm the next feature in chat later",
  "Fix: Walrus relayer requires a CORS proxy in production",
];

function routerDemo() {
  console.log("\n🧭 ENGINE 1 — Left/Right Router (route by content)");
  const routed = [];
  for (const s of SAMPLES) {
    const c = classify(s);
    const icon = c.side === "LEFT" ? "◀ Left/logic  " : "Right/context ▶";
    console.log(`   ${icon}  [L${c.left} · R${c.right}]  ${shorten(s)}`);
    routed.push({ text: s, ...c });
  }
  return routed;
}

// ── ENGINE 2: Pattern Separation (recall-based) ─────────────────────
const COLLISION_DIST = 0.12; // near-duplicate → interference
async function patternSeparation() {
  console.log("\n🧬 ENGINE 2 — Pattern Separation (sparse coding · §2.2)");
  const res = await left.recall({ query: "distinct concepts facts knowledge rules", limit: 8, maxDistance: 0.95 });
  const cells = res.results.map((r) => r.text).filter(Boolean);
  if (cells.length < 3) { console.log("   (not enough concept cells)"); return null; }

  let nnSum = 0, counted = 0, collisions = 0;
  for (const cell of cells) {
    await new Promise((r) => setTimeout(r, 400)); // throttle: stay under 30 req/min
    const hits = (await left.recall({ query: cell, limit: 6, maxDistance: 0.99 })).results;
    const others = hits.filter((h) => h.distance > 0.001); // drop self-match
    if (!others.length) continue;
    nnSum += Math.min(...others.map((h) => h.distance));
    collisions += others.filter((h) => h.distance < COLLISION_DIST).length;
    counted++;
  }
  const meanNN = counted ? nnSum / counted : 0;
  console.log(`   cells: ${cells.length} · mean nearest-neighbour distance: ${meanNN.toFixed(3)} (higher = better separation)`);
  console.log(`   interference collisions (dist < ${COLLISION_DIST}): ${collisions}`);
  return { cells: cells.length, meanNN: +meanNN.toFixed(3), collisions };
}

// ── ENGINE 3: Integrated Recall ─────────────────────────────────────
async function integratedRecall(query) {
  console.log(`\n🔗 ENGINE 3 — Integrated Recall\n   Query: "${query}"`);
  const [l, r] = await Promise.all([
    left.recall({ query, limit: 4, maxDistance: 0.55 }),
    right.recall({ query, limit: 4, maxDistance: 0.75 }),
  ]);
  console.log(`   ◀ LEFT (exact logic): ${l.results.length}`);
  l.results.slice(0, 3).forEach((h) => console.log(`      • ${shorten(h.text)}`));
  console.log(`   RIGHT (context) ▶: ${r.results.length}`);
  r.results.slice(0, 3).forEach((h) => console.log(`      • ${shorten(h.text)}`));
  return { left: l.results.length, right: r.results.length };
}

async function main() {
  if (ROUTE) {
    const c = classify(ROUTE);
    console.log(`Route "${shorten(ROUTE)}" → ${c.side}  [L${c.left} · R${c.right}]`);
    if (COMMIT) {
      const target = c.side === "LEFT" ? left : right;
      const job = await target.remember(ROUTE);
      await target.waitForRememberJob(job.job_id);
      console.log(`✅ Written to ${c.side === "LEFT" ? LEFT_NS : RIGHT_NS}`);
    }
    return;
  }
  if (RECALL) { await integratedRecall(RECALL); return; }

  console.log(`🧠 ═══ Phase 7: Neuro Engine ═══  (${COMMIT ? "COMMIT" : "DRY-RUN"})`);
  const routed = routerDemo();
  const sep = await patternSeparation();
  const rec = await integratedRecall("how to deploy and moderate the walrus forum");

  if (COMMIT) {
    const snap = JSON.stringify({ type: "BRAIN_META", subtype: "NEURO_REPORT", generated_at: NOW, routed, separation: sep, integrated: rec });
    const meta = client("NS_BRAIN_meta");
    const job = await meta.remember(snap);
    await meta.waitForRememberJob(job.job_id);
    console.log("\n   ✅ Neuro report snapshot appended to NS_BRAIN_meta.");
  }
  console.log(`\n🧠 ═══ Done. ${COMMIT ? "Written." : "Read-only."} ═══`);
}

main().catch((e) => { console.error("❌ Phase 7 engine failed:", e); process.exit(1); });
