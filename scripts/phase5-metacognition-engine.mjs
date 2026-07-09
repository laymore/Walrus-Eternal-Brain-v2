/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Phase 5: Metacognition ENGINE
 *  "Do I know that I know?" — self-assessment across all memory tiers.
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Reads ACROSS episodic + procedural + semantic to reason about the
 *  brain's own competence. Three real engines:
 *    1. Pre-Action Assessment — before acting, gather evidence and emit a
 *       confidence + PROCEED / CAUTION / REFUSE decision (calibrated humility:
 *       no evidence → refuse-and-explain, never bluff).
 *    2. Post-Action Reflection — distil lessons (esp. from failures) into
 *       NS_BRAIN_meta via analyze().
 *    3. Confidence Calibrator — compare STATED belief vs OBSERVED outcomes;
 *       flag over/under-confidence; append a calibration snapshot.
 *
 *  Immutable-aware: computes at read time, appends snapshots (event sourcing).
 *
 *  Usage:
 *    node scripts/phase5-metacognition-engine.mjs                 # dry-run
 *    node scripts/phase5-metacognition-engine.mjs --commit        # writes
 *    node scripts/phase5-metacognition-engine.mjs --action "..."  # assess one action
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

if (!ACCOUNT_ID || !DELEGATE_KEY) {
  console.error("❌ Missing VITE_MEMWAL_ACCOUNT_ID / VITE_MEMWAL_DELEGATE_KEY in .env");
  process.exit(1);
}

const COMMIT = process.argv.includes("--commit");
const actionIdx = process.argv.indexOf("--action");
const CUSTOM_ACTION = actionIdx >= 0 ? process.argv[actionIdx + 1] : null;
const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

// Bootstrap-only fallback (English) — used ONLY when there's no episodic
// history yet to derive real candidate actions from.
const BOOTSTRAP_ACTIONS = [
  "Deploy the site to Walrus Sites with site-builder",
  "Rotate or change the developer wallet",
  "Add a new UI theme to the forum",
  "Hide or moderate a forum post as admin",
  "Consolidate working memory into the eternal library",
];

/**
 * Language-barrier fix: instead of assessing a hardcoded ENGLISH action list
 * against episodic/procedural/semantic memory that may be recorded in
 * Vietnamese (or any other language), DERIVE the candidate actions from the
 * agent's own recent episodic summaries. This keeps the query in the SAME
 * language as what's actually stored, so recall() similarity isn't degraded
 * by a translation mismatch — no hardcoded language assumption either way.
 */
async function deriveActionsFromEpisodic(n = 5) {
  const res = await episodic.recall({ query: "recent tasks actions decisions events", limit: 20, maxDistance: 0.95 });
  const seen = new Set();
  const actions = [];
  for (const r of res.results) {
    const j = safeJson(r.text);
    const candidate = j?.summary || j?.event_type;
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    actions.push(candidate);
    if (actions.length >= n) break;
  }
  return actions;
}

function brainClient(namespace) {
  return MemWal.create({ key: DELEGATE_KEY, accountId: ACCOUNT_ID, serverUrl: SERVER_URL, namespace });
}
const shorten = (t) => (t || "").replace(/\s+/g, " ").slice(0, 80);

async function recallRaw(client, query, limit) {
  const res = await client.recall({ query, limit, maxDistance: 0.9 });
  return res.results.map((r) => ({ text: r.text, distance: r.distance, json: safeJson(r.text) }));
}
function safeJson(t) { try { return JSON.parse(t); } catch { return null; } }
const relevance = (hits) => (hits.length ? Math.max(...hits.map((h) => 1 - (h.distance ?? 1))) : 0);

const episodic = brainClient("NS_BRAIN_episodic");
const procedural = brainClient("NS_BRAIN_procedural");
const semantic = brainClient("NS_BRAIN_semantic");
const meta = brainClient("NS_BRAIN_meta");

// ═══════════════════════════════════════════════════════════════════
//  ENGINE 1 — PRE-ACTION ASSESSMENT
// ═══════════════════════════════════════════════════════════════════
async function preActionAssessment(actions) {
  console.log("\n🔮 ENGINE 1 — Pre-Action Assessment (evidence before acting)");
  const assessments = [];

  for (const action of actions) {
    const [proc, sem, epi] = await Promise.all([
      recallRaw(procedural, action, 3),
      recallRaw(semantic, action, 3),
      recallRaw(episodic, action, 5),
    ]);

    // Procedural signal: best-matching skill's success_rate, dampened if rusty.
    let procSignal = null;
    const skill = proc.map((h) => h.json).find((j) => j && j.type === "BRAIN_PROCEDURAL" && j.success_rate != null);
    if (skill) {
      const ageDays = skill.last_executed ? (NOW - skill.last_executed) / DAY : Infinity;
      const recency = ageDays > 30 ? 0.6 : 1.0; // rusty skills trusted less
      procSignal = skill.success_rate * recency;
    }

    // Episodic signal: success ratio among relevant past outcomes.
    const relEp = epi.map((h) => h.json).filter((j) => j && j.outcome && relevance(epi) > 0.15);
    const epiSignal = relEp.length ? relEp.filter((e) => e.outcome === "success").length / relEp.length : null;

    // Semantic signal: is there a relevant rule/gotcha? presence raises grounding.
    const semSignal = relevance(sem) > 0.35 ? Math.min(1, relevance(sem) + 0.1) : null;

    // Weighted blend over AVAILABLE signals only (renormalized).
    const parts = [];
    if (procSignal != null) parts.push([procSignal, 0.5]);
    if (epiSignal != null) parts.push([epiSignal, 0.3]);
    if (semSignal != null) parts.push([semSignal, 0.2]);

    let confidence, decision, reason;
    if (!parts.length) {
      confidence = 0; decision = "REFUSE"; reason = "no relevant memory — insufficient basis (ask the user)";
    } else {
      const wsum = parts.reduce((a, [, w]) => a + w, 0);
      confidence = parts.reduce((a, [v, w]) => a + v * w, 0) / wsum;
      decision = confidence >= 0.75 ? "PROCEED" : confidence >= 0.4 ? "CAUTION" : "REFUSE";
      reason = [
        procSignal != null ? `skill ${(procSignal * 100).toFixed(0)}%` : null,
        epiSignal != null ? `episodes ${(epiSignal * 100).toFixed(0)}%` : null,
        semSignal != null ? `rule grounded` : null,
      ].filter(Boolean).join(", ");
    }

    const icon = decision === "PROCEED" ? "🟢" : decision === "CAUTION" ? "🟡" : "🔴";
    console.log(`   ${icon} [${(confidence * 100).toFixed(0)}% ${decision}] ${shorten(action)}`);
    console.log(`        └ ${reason}`);
    assessments.push({ action, confidence: +confidence.toFixed(2), decision, reason });
  }

  if (COMMIT) {
    const snap = JSON.stringify({ type: "BRAIN_META", subtype: "PRE_ACTION_ASSESSMENT", generated_at: NOW, assessments });
    const job = await meta.remember(snap);
    await meta.waitForRememberJob(job.job_id);
    console.log("   ✅ Assessment snapshot appended to NS_BRAIN_meta.");
  }
  return assessments;
}

// ═══════════════════════════════════════════════════════════════════
//  ENGINE 2 — POST-ACTION REFLECTION
// ═══════════════════════════════════════════════════════════════════
async function postActionReflection() {
  console.log("\n🪞 ENGINE 2 — Post-Action Reflection (distil lessons)");
  const epi = await recallRaw(episodic, "lessons learned mistakes fixes what went wrong outcomes", 40);
  const eps = epi.map((h) => h.json).filter(Boolean);
  const lessons = eps.map((e) => e.lessons).filter(Boolean);
  const failures = eps.filter((e) => e.outcome && e.outcome !== "success");

  console.log(`   ${lessons.length} lessons across ${eps.length} episodes · ${failures.length} failures to learn from.`);
  lessons.slice(0, 4).forEach((l) => console.log(`      • ${shorten(l)}`));
  if (!lessons.length) return 0;

  if (COMMIT) {
    const compiled = "Reflect and generalize these lessons learned into durable meta-insights:\n" + lessons.join("\n");
    const res = await meta.analyzeAndWait(compiled);
    console.log(`   ✅ Distilled ${res.facts.length} meta-insights into NS_BRAIN_meta.`);
    return res.facts.length;
  }
  console.log("   [dry-run] would analyze() lessons into meta-insights.");
  return 0;
}

// ═══════════════════════════════════════════════════════════════════
//  ENGINE 3 — CONFIDENCE CALIBRATOR
// ═══════════════════════════════════════════════════════════════════
async function confidenceCalibrator() {
  console.log("\n🎯 ENGINE 3 — Confidence Calibrator (stated vs observed)");
  const skills = (await recallRaw(procedural, "skill workflow procedure success", 40))
    .map((h) => h.json).filter((j) => j && j.type === "BRAIN_PROCEDURAL" && j.success_rate != null && j.skill);
  const eps = (await recallRaw(episodic, "deployment fixes tasks outcomes", 50)).map((h) => h.json).filter(Boolean);
  if (!skills.length) { console.log("   (no procedural skills with stated confidence)"); return []; }

  const rows = [];
  for (const s of skills) {
    const key = s.skill.toLowerCase();
    const related = eps.filter((e) =>
      (e.tags || []).some((t) => key.includes(String(t).toLowerCase())) ||
      key.includes(String(e.event_type || "").toLowerCase()));
    if (!related.length) continue;
    const observed = related.filter((e) => e.outcome === "success").length / related.length;
    const gap = +(s.success_rate - observed).toFixed(2); // >0 overconfident
    const verdict = Math.abs(gap) <= 0.1 ? "calibrated" : gap > 0 ? "OVERCONFIDENT" : "underconfident";
    rows.push({ skill: s.skill, stated: s.success_rate, observed: +observed.toFixed(2), gap, verdict });
    const icon = verdict === "calibrated" ? "✓" : gap > 0 ? "⬇ trust less" : "⬆ trust more";
    console.log(`   ${icon}  ${shorten(s.skill)}  stated ${s.success_rate} vs observed ${observed.toFixed(2)}  (gap ${gap >= 0 ? "+" : ""}${gap})`);
  }

  if (COMMIT && rows.length) {
    const snap = JSON.stringify({ type: "BRAIN_META", subtype: "CONFIDENCE_CALIBRATION", generated_at: NOW, calibrations: rows });
    const job = await meta.remember(snap);
    await meta.waitForRememberJob(job.job_id);
    console.log("   ✅ Calibration snapshot appended to NS_BRAIN_meta.");
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log(`🧠 ═══ Phase 5: Metacognition Engine ═══  (${COMMIT ? "COMMIT" : "DRY-RUN"})`);

  let actions;
  if (CUSTOM_ACTION) {
    actions = [CUSTOM_ACTION];
  } else {
    const derived = await deriveActionsFromEpisodic();
    actions = derived.length ? derived : BOOTSTRAP_ACTIONS;
    console.log(derived.length
      ? `\n(assessing ${derived.length} actions derived from recent episodic memory — same language as the log, no translation mismatch)`
      : "\n(no episodic history yet — using bootstrap English actions)");
  }

  await preActionAssessment(actions);
  await postActionReflection();
  await confidenceCalibrator();
  console.log(`\n🧠 ═══ Done. ${COMMIT ? "Changes written to Walrus." : "Read-only — pass --commit to write."} ═══`);
}

main().catch((e) => { console.error("❌ Phase 5 engine failed:", e); process.exit(1); });
