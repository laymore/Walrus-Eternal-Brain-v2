/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Phase 4: Procedural Memory ENGINE
 *  "What I know how to do" — muscle memory from successful actions.
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Three real engines (derived from live episodic data; immutable-aware):
 *    1. Skill Builder     — synthesize procedural skills from successful
 *                           episode sequences (grouped by event_type).
 *    2. Skill Optimizer   — recompute success_rate / times_executed for
 *                           existing skills from the episodic ground truth.
 *    3. Skill Degradation — flag skills unused past a TTL as "rusty".
 *
 *  Walrus blobs are immutable → we never edit a skill in place. Skills and
 *  optimisation/degradation snapshots are APPENDED (event sourcing); current
 *  stats are computed at read time from the episodic record of truth.
 *
 *  Usage:
 *    node scripts/phase4-procedural-engine.mjs            # dry-run (read-only)
 *    node scripts/phase4-procedural-engine.mjs --commit   # writes to Walrus
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
const SERVER_URL = "https://relayer.memory.walrus.xyz"; // direct relayer (server-side)

if (!ACCOUNT_ID || !DELEGATE_KEY) {
  console.error("❌ Missing VITE_MEMWAL_ACCOUNT_ID / VITE_MEMWAL_DELEGATE_KEY in .env");
  process.exit(1);
}

const COMMIT = process.argv.includes("--commit");
const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const RUST_TTL_DAYS = 30;         // unused longer than this → rusty
const MIN_EPISODES_PER_SKILL = 2; // need repetition to call it a skill

function brainClient(namespace) {
  return MemWal.create({ key: DELEGATE_KEY, accountId: ACCOUNT_ID, serverUrl: SERVER_URL, namespace });
}

const shorten = (t) => (t || "").replace(/\s+/g, " ").slice(0, 90);

async function recallJson(client, query, limit) {
  const res = await client.recall({ query, limit, maxDistance: 0.95 });
  return res.results
    .map((r) => { try { return JSON.parse(r.text); } catch { return null; } })
    .filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════
//  ENGINE 1 — SKILL BUILDER
// ═══════════════════════════════════════════════════════════════════
async function skillBuilder() {
  console.log("\n🛠  ENGINE 1 — Skill Builder (episodic → procedural)");
  const episodic = brainClient("NS_BRAIN_episodic");
  const procedural = brainClient("NS_BRAIN_procedural");

  const episodes = await recallJson(episodic, "deployment fixes actions workflows outcomes", 50);
  const withType = episodes.filter((e) => e.event_type && e.outcome);
  if (!withType.length) { console.log("   (no structured episodes)"); return []; }

  // Group by event_type
  const groups = new Map();
  for (const e of withType) (groups.get(e.event_type) || groups.set(e.event_type, []).get(e.event_type)).push(e);

  const skills = [];
  for (const [eventType, eps] of groups) {
    if (eps.length < MIN_EPISODES_PER_SKILL) continue;
    const successes = eps.filter((e) => e.outcome === "success").length;
    const skill = {
      type: "BRAIN_PROCEDURAL",
      derived: true,
      skill: `Handle "${eventType}" tasks`,
      derived_from: eps.map((e) => e.id).filter(Boolean),
      steps: eps
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
        .map((e, i) => ({
          order: i + 1,
          action: e.summary || e.details || "(unspecified)",
          expected: e.outcome,
          error_handling: e.lessons || "",
        })),
      times_executed: eps.length,
      success_rate: +(successes / eps.length).toFixed(2),
      last_executed: Math.max(...eps.map((e) => e.timestamp || 0)),
      generated_at: NOW,
    };
    skills.push(skill);
    console.log(`   • ${skill.skill}  [×${skill.times_executed} · success ${(skill.success_rate * 100).toFixed(0)}%]`);
  }
  if (!skills.length) { console.log("   (no event_type repeated enough to form a skill)"); return []; }

  if (COMMIT) {
    for (const s of skills) {
      const job = await procedural.remember(JSON.stringify(s));
      await procedural.waitForRememberJob(job.job_id);
    }
    console.log(`   ✅ Stored ${skills.length} derived skills to NS_BRAIN_procedural.`);
  } else {
    console.log(`   [dry-run] would store ${skills.length} derived skills.`);
  }
  return skills;
}

// ═══════════════════════════════════════════════════════════════════
//  ENGINE 2 — SKILL OPTIMIZER  (recompute stats from episodic truth)
// ═══════════════════════════════════════════════════════════════════
async function skillOptimizer() {
  console.log("\n⚙  ENGINE 2 — Skill Optimizer (recompute from ground truth)");
  const episodic = brainClient("NS_BRAIN_episodic");
  const procedural = brainClient("NS_BRAIN_procedural");

  const skills = await recallJson(procedural, "skill steps workflow procedure deploy", 40);
  const episodes = await recallJson(episodic, "deployment fixes actions workflows", 50);
  if (!skills.length) { console.log("   (no procedural skills yet)"); return []; }

  const reports = [];
  for (const s of skills) {
    // Match episodes by tag/keyword overlap with the skill name.
    const key = (s.skill || "").toLowerCase();
    const related = episodes.filter((e) =>
      (e.tags || []).some((t) => key.includes(String(t).toLowerCase())) ||
      key.includes(String(e.event_type || "").toLowerCase()));
    if (!related.length) continue;
    const successes = related.filter((e) => e.outcome === "success").length;
    const observed = { times_executed: related.length, success_rate: +(successes / related.length).toFixed(2) };
    const drifted = observed.times_executed !== s.times_executed || observed.success_rate !== s.success_rate;
    reports.push({ skill: s.skill, stored: { times_executed: s.times_executed, success_rate: s.success_rate }, observed, drifted });
    console.log(`   • ${shorten(s.skill)}  stored ×${s.times_executed}/${s.success_rate} → observed ×${observed.times_executed}/${observed.success_rate}${drifted ? "  ⟳ drift" : "  ✓"}`);
  }

  if (COMMIT && reports.length) {
    const snap = JSON.stringify({ type: "BRAIN_PROCEDURAL_OPTIMIZATION", generated_at: NOW, reports });
    const job = await procedural.remember(snap);
    await procedural.waitForRememberJob(job.job_id);
    console.log("   ✅ Optimization snapshot appended.");
  }
  return reports;
}

// ═══════════════════════════════════════════════════════════════════
//  ENGINE 3 — SKILL DEGRADATION  (rust unused skills)
// ═══════════════════════════════════════════════════════════════════
async function skillDegradation() {
  console.log(`\n🥀 ENGINE 3 — Skill Degradation (rusty if unused > ${RUST_TTL_DAYS}d)`);
  const procedural = brainClient("NS_BRAIN_procedural");
  const skills = await recallJson(procedural, "skill steps workflow procedure", 40);
  const realSkills = skills.filter((s) => s.type === "BRAIN_PROCEDURAL");
  if (!realSkills.length) { console.log("   (no procedural skills yet)"); return []; }

  const rusty = [];
  for (const s of realSkills) {
    const last = s.last_executed || 0;
    const ageDays = last ? Math.floor((NOW - last) / DAY) : Infinity;
    const isRusty = ageDays > RUST_TTL_DAYS;
    const rustiness = last ? Math.min(1, ageDays / (RUST_TTL_DAYS * 3)) : 1;
    console.log(`   • ${shorten(s.skill)}  last used ${ageDays === Infinity ? "never" : ageDays + "d ago"}${isRusty ? `  🥀 RUSTY (${rustiness.toFixed(2)})` : "  🟢 fresh"}`);
    if (isRusty) rusty.push({ skill: s.skill, age_days: ageDays === Infinity ? null : ageDays, rustiness: +rustiness.toFixed(2) });
  }

  if (COMMIT && rusty.length) {
    const snap = JSON.stringify({ type: "BRAIN_PROCEDURAL_DEGRADATION", generated_at: NOW, ttl_days: RUST_TTL_DAYS, rusty });
    const job = await procedural.remember(snap);
    await procedural.waitForRememberJob(job.job_id);
    console.log(`   ✅ Degradation snapshot appended (${rusty.length} rusty).`);
  }
  return rusty;
}

// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log(`🧠 ═══ Phase 4: Procedural Engine ═══  (${COMMIT ? "COMMIT" : "DRY-RUN"})`);
  await skillBuilder();
  await skillOptimizer();
  await skillDegradation();
  console.log(`\n🧠 ═══ Done. ${COMMIT ? "Changes written to Walrus." : "Read-only — pass --commit to write."} ═══`);
}

main().catch((e) => { console.error("❌ Phase 4 engine failed:", e); process.exit(1); });
