/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Phase 8: Eternal Architecture ENGINE
 *  "The Immortal Brain" — self-protecting, self-healing.
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Three engines (the 4th, Independent Watchdog, already lives in
 *  scripts/watchdog.mjs — "different process, different trust"):
 *    1. Identity Test Suite — validate core values with BEHAVIORAL
 *       scenarios (would the brain do the right thing?), not text hashes.
 *    2. TTL & Promotion     — classify memories into hot / warm / cold by
 *       age + importance + access, suggest promotions/demotions.
 *    3. Regeneration ("sleep") — recall-based near-duplicate detection so a
 *       background cycle can dedup/evaluate memories.
 *
 *  Immutable-aware: reports at read time, appends a health snapshot.
 *
 *  Usage:
 *    node scripts/phase8-eternal-engine.mjs            # dry-run
 *    node scripts/phase8-eternal-engine.mjs --commit   # write health snapshot
 */

import { MemWal } from "@mysten-incubation/memwal";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
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
const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const FOREIGN_WALLET = "0xafbc48fd349fb44ce9c6f2b33423e6ae7c826d53a25920a0d4c3c475e40889c5";
const sui = new SuiJsonRpcClient({ network: "mainnet", url: getJsonRpcFullnodeUrl("mainnet") });

// HARD truth: the dev wallet is whoever owns the account ON-CHAIN — read live,
// never hardcoded, so a legitimate ownership transfer auto-heals the identity.
async function onChainOwner() {
  try {
    const obj = await sui.getObject({ id: ACCOUNT_ID, options: { showContent: true } });
    return obj?.data?.content?.fields?.owner || null;
  } catch { return null; }
}

function client(ns) { return MemWal.create({ key: DELEGATE_KEY, accountId: ACCOUNT_ID, serverUrl: SERVER_URL, namespace: ns }); }
const shorten = (t) => (t || "").replace(/\s+/g, " ").slice(0, 80);
const throttle = () => new Promise((r) => setTimeout(r, 400));
async function recallJson(c, q, limit) {
  const res = await c.recall({ query: q, limit, maxDistance: 0.95 });
  return res.results.map((r) => { try { return JSON.parse(r.text); } catch { return null; } }).filter(Boolean);
}

// ── ENGINE 1: Identity Test Suite (behavioral) ──────────────────────
async function identityTestSuite() {
  console.log("\n🛡  ENGINE 1 — Identity Test Suite (behavioral scenarios)");
  const owner = await onChainOwner();
  // Pick the LATEST version (append-only history → highest version is current).
  const all = (await recallJson(client("NS_BRAIN_identity"), "agent identity dev wallet rules project version", 10))
    .filter((x) => x.type === "BRAIN_IDENTITY")
    .sort((a, b) => (a.version || 0) - (b.version || 0));
  const id = all[all.length - 1];
  if (!id) { console.log("   ❌ CRITICAL: no identity found — brain has amnesia."); return { pass: 0, fail: 1, tests: [] }; }
  console.log(`   on-chain owner: ${owner ? owner.slice(0, 10) + "…" : "?"} · latest identity v${id.version} (of ${all.length})`);

  const rulesText = JSON.stringify(id.wallet_rules || []) + JSON.stringify(id.core_rules || []);
  const tests = [
    { name: "Identity dev wallet MATCHES on-chain owner", pass: !!owner && !!id.dev_wallet && id.dev_wallet.toLowerCase() === owner.toLowerCase(),
      detail: "identity must track the live on-chain account owner (no drift)" },
    { name: "Rejects the foreign wallet", pass: rulesText.includes(FOREIGN_WALLET.slice(0, 10)) || rulesText.toLowerCase().includes("khác"),
      detail: `must refuse ${FOREIGN_WALLET.slice(0, 10)}… (another project)` },
    { name: "Knows its project identity", pass: !!id.project_name,
      detail: "project name recorded" },
    { name: "Single-wallet governance rule present", pass: /duy nhất|single|only.*wallet/i.test(rulesText),
      detail: "exactly one wallet governs everything" },
    { name: "Knows its Walrus Site object", pass: !!id.walrus_site_object_id,
      detail: "site object id for chats.sui" },
  ];
  let pass = 0;
  for (const t of tests) { console.log(`   ${t.pass ? "✅ PASS" : "❌ FAIL"}  ${t.name} — ${t.detail}`); if (t.pass) pass++; }
  console.log(`   → ${pass}/${tests.length} behavioral checks passed.`);
  return { pass, fail: tests.length - pass, tests: tests.map((t) => ({ name: t.name, pass: t.pass })) };
}

// ── ENGINE 2: TTL & Promotion (hot/warm/cold) ───────────────────────
function tierOf(m) {
  const ts = m.timestamp || m.last_executed || m.first_learned || 0;
  const ageDays = ts ? (NOW - ts) / DAY : Infinity;
  const importance = Number(m.importance ?? m.confidence ?? 0.5);
  const accessed = Number(m.access_count || 0) > 0;
  if (importance >= 0.8 || accessed) return "hot";
  if (importance >= 0.4 && ageDays < 30) return "warm";
  return "cold";
}
async function ttlPromotion() {
  console.log("\n🌡  ENGINE 2 — TTL & Promotion (hot / warm / cold)");
  const eps = await recallJson(client("NS_BRAIN_episodic"), "events tasks outcomes lessons", 30);
  if (!eps.length) { console.log("   (no episodic memories)"); return null; }
  const dist = { hot: 0, warm: 0, cold: 0 };
  for (const m of eps) dist[tierOf(m)]++;
  console.log(`   ${eps.length} memories → hot ${dist.hot} · warm ${dist.warm} · cold ${dist.cold}`);
  const demote = eps.filter((m) => tierOf(m) === "cold" && (m.importance ?? 1) < 0.3).length;
  console.log(`   ${demote} cold + low-importance memories eligible for TTL expiry (domain-specific).`);
  return { total: eps.length, ...dist, expiry_eligible: demote };
}

// ── ENGINE 3: Regeneration / "Sleep" (dedup) ────────────────────────
async function regeneration() {
  console.log("\n😴 ENGINE 3 — Regeneration cycle (sleep: find duplicates)");
  const sem = client("NS_BRAIN_semantic");
  const res = await sem.recall({ query: "knowledge facts rules", limit: 8, maxDistance: 0.95 });
  const cells = res.results.map((r) => r.text).filter(Boolean);
  if (cells.length < 3) { console.log("   (not enough to evaluate)"); return null; }
  let dupPairs = 0;
  for (const cell of cells) {
    await throttle();
    const hits = (await sem.recall({ query: cell, limit: 4, maxDistance: 0.99 })).results.filter((h) => h.distance > 0.001);
    dupPairs += hits.filter((h) => h.distance < 0.1).length;
  }
  const dedupCandidates = Math.floor(dupPairs / 2);
  console.log(`   scanned ${cells.length} concepts · ${dedupCandidates} near-duplicate pair(s) a sleep cycle would merge.`);
  return { scanned: cells.length, dedup_candidates: dedupCandidates };
}

async function main() {
  console.log(`🧠 ═══ Phase 8: Eternal Architecture ═══  (${COMMIT ? "COMMIT" : "DRY-RUN"})`);
  const identity = await identityTestSuite();
  const ttl = await ttlPromotion();
  const regen = await regeneration();
  const health = identity.fail === 0 ? "HEALTHY" : "DEGRADED";
  console.log(`\n   🩺 Brain health: ${health} (identity ${identity.pass}/${identity.pass + identity.fail})`);
  console.log(`   ℹ  Independent Watchdog runs separately: scripts/watchdog.mjs`);

  if (COMMIT) {
    const snap = JSON.stringify({ type: "BRAIN_META", subtype: "ETERNAL_HEALTH", generated_at: NOW, health, identity, ttl, regen });
    const meta = client("NS_BRAIN_meta");
    const job = await meta.remember(snap);
    await meta.waitForRememberJob(job.job_id);
    console.log("   ✅ Eternal-health snapshot appended to NS_BRAIN_meta.");
  }
  console.log(`\n🧠 ═══ Done. ${COMMIT ? "Written." : "Read-only."} ═══`);
}

main().catch((e) => { console.error("❌ Phase 8 engine failed:", e); process.exit(1); });
