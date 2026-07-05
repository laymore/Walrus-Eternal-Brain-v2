/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Phase 3: Semantic Memory ENGINE
 *  "What I have learned" — generalized knowledge from episodes.
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Three real engines (SDK-grounded, immutable-aware / event-sourced):
 *    1. Consolidation Engine  — episodic → semantic facts via analyze()
 *    2. Confidence Tracker     — cluster near-duplicate facts → belief strength
 *    3. Contradiction Detector — surface same-topic / divergent-claim candidates
 *
 *  Walrus blobs are immutable, so we never mutate a fact's confidence in place.
 *  Instead we COMPUTE belief from confirmation clusters at read time, and (with
 *  --commit) append a single ledger snapshot — event sourcing, not mutation.
 *
 *  Usage:
 *    node scripts/phase3-semantic-engine.mjs            # dry-run (read-only)
 *    node scripts/phase3-semantic-engine.mjs --commit   # writes to Walrus
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
// Server-side: talk to the relayer DIRECTLY (the CORS proxy is browser-only).
const SERVER_URL = "https://relayer.memory.walrus.xyz";

if (!ACCOUNT_ID || !DELEGATE_KEY) {
  console.error("❌ Missing VITE_MEMWAL_ACCOUNT_ID / VITE_MEMWAL_DELEGATE_KEY in .env");
  process.exit(1);
}

const COMMIT = process.argv.includes("--commit");

// ── Tuning ─────────────────────────────────────────────────────────
const CONFIRM_THRESHOLD = 0.9;   // cosine ≥ → same belief (confirmation)
const CONTRA_LOW = 0.62;         // same topic ...
const CONTRA_HIGH = 0.86;        // ... but not a duplicate → divergence candidate

function brainClient(namespace) {
  return MemWal.create({ key: DELEGATE_KEY, accountId: ACCOUNT_ID, serverUrl: SERVER_URL, namespace });
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

const shorten = (t) => (t || "").replace(/\s+/g, " ").slice(0, 90);

// ═══════════════════════════════════════════════════════════════════
//  ENGINE 1 — CONSOLIDATION: episodic → semantic
// ═══════════════════════════════════════════════════════════════════
async function consolidate() {
  console.log("\n🧩 ENGINE 1 — Consolidation (episodic → semantic)");
  const episodic = brainClient("NS_BRAIN_episodic");
  const semantic = brainClient("NS_BRAIN_semantic");

  const res = await episodic.recall({ query: "lessons, outcomes, decisions, recurring patterns", limit: 50, maxDistance: 0.9 });
  const episodes = res.results.map((r) => r.text).filter(Boolean);
  if (!episodes.length) { console.log("   (no episodic memories found)"); return 0; }

  const compiled = episodes.join("\n---\n");
  console.log(`   Compiled ${episodes.length} episodes (${compiled.length} chars).`);

  if (!COMMIT) {
    console.log("   [dry-run] would call semantic.analyzeAndWait() to distil generalized facts.");
    return 0;
  }
  const analysis = await semantic.analyzeAndWait(compiled);
  console.log(`   ✅ Distilled & stored ${analysis.facts.length} semantic facts.`);
  analysis.facts.slice(0, 5).forEach((f) => console.log(`      • ${shorten(f.text)}`));
  return analysis.facts.length;
}

// ═══════════════════════════════════════════════════════════════════
//  ENGINE 2 + 3 — CONFIDENCE TRACKER & CONTRADICTION DETECTOR
// ═══════════════════════════════════════════════════════════════════
async function reconcile() {
  console.log("\n🔎 ENGINE 2/3 — Confidence Tracker + Contradiction Detector");
  const semantic = brainClient("NS_BRAIN_semantic");

  const res = await semantic.recall({ query: "knowledge facts rules architecture procedures", limit: 60, maxDistance: 0.95 });
  const facts = res.results.map((r) => ({ blob: r.blob_id, text: r.text })).filter((f) => f.text);
  if (facts.length < 2) { console.log("   (need ≥2 semantic facts to reconcile)"); return; }
  console.log(`   Embedding ${facts.length} semantic facts...`);

  const vectors = await Promise.all(facts.map(async (f) => {
    try { return (await semantic.embed(f.text)).vector; } catch { return null; }
  }));

  // Union-Find clustering for confirmations (cosine ≥ CONFIRM_THRESHOLD)
  const parent = facts.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a, b) => { parent[find(a)] = find(b); };

  const contradictions = [];
  for (let i = 0; i < facts.length; i++) {
    if (!vectors[i]) continue;
    for (let j = i + 1; j < facts.length; j++) {
      if (!vectors[j]) continue;
      const sim = cosine(vectors[i], vectors[j]);
      if (sim >= CONFIRM_THRESHOLD) union(i, j);
      else if (sim >= CONTRA_LOW && sim <= CONTRA_HIGH) contradictions.push({ i, j, sim });
    }
  }

  // Confidence = f(cluster size): each corroborating fact raises belief.
  const clusters = new Map();
  facts.forEach((_, i) => { const r = find(i); (clusters.get(r) || clusters.set(r, []).get(r)).push(i); });

  console.log(`\n   📊 Confidence (belief strength from ${clusters.size} concept clusters):`);
  const ranked = [...clusters.values()].sort((a, b) => b.length - a.length);
  ranked.slice(0, 8).forEach((members) => {
    const confirmations = members.length;
    const confidence = Math.min(0.99, 0.5 + 0.12 * (confirmations - 1)); // 1→0.50, 2→0.62, ...
    console.log(`      [conf ${confidence.toFixed(2)} · ×${confirmations}] ${shorten(facts[members[0]].text)}`);
  });

  console.log(`\n   ⚠  Contradiction / divergence candidates (same topic, different claim): ${contradictions.length}`);
  contradictions.sort((a, b) => b.sim - a.sim).slice(0, 6).forEach(({ i, j, sim }) => {
    console.log(`      ~${sim.toFixed(2)}  A: ${shorten(facts[i].text)}`);
    console.log(`             B: ${shorten(facts[j].text)}`);
  });

  if (COMMIT) {
    // Event-sourced snapshot — never mutates existing facts.
    const ledger = JSON.stringify({
      type: "BRAIN_SEMANTIC_LEDGER",
      generated_at: Date.now(),
      concept_clusters: clusters.size,
      total_facts: facts.length,
      top_confidence: ranked.slice(0, 10).map((m) => ({ sample: shorten(facts[m[0]].text), confirmations: m.length })),
      contradiction_candidates: contradictions.slice(0, 20).map(({ i, j, sim }) => ({ a: shorten(facts[i].text), b: shorten(facts[j].text), similarity: +sim.toFixed(3) })),
    });
    const job = await semantic.remember(ledger);
    await semantic.waitForRememberJob(job.job_id);
    console.log("\n   ✅ Confidence/contradiction ledger snapshot appended to NS_BRAIN_semantic.");
  }
}

// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log(`🧠 ═══ Phase 3: Semantic Engine ═══  (${COMMIT ? "COMMIT" : "DRY-RUN"})`);
  await consolidate();
  await reconcile();
  console.log(`\n🧠 ═══ Done. ${COMMIT ? "Changes written to Walrus." : "Read-only — pass --commit to write."} ═══`);
}

main().catch((e) => { console.error("❌ Phase 3 engine failed:", e); process.exit(1); });
