/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Phase 6: Eternal Library ENGINE
 *  "The Book Shelf" — cross-project, reusable knowledge.
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Promotion Engine: scan the per-project Living Brain (NS_BRAIN_semantic),
 *  select high-confidence knowledge, bind it into LIBRARY_BOOK records with
 *  provenance, and push them UP into the cross-project Eternal Library
 *  (eternal:global:associative-core). Future projects `consultLibrary()` these.
 *
 *  Idempotent: books whose title already exists in the library are skipped.
 *  Immutable-aware: books are appended, never mutated.
 *
 *  Usage:
 *    node scripts/phase6-library-engine.mjs                     # dry-run
 *    node scripts/phase6-library-engine.mjs --commit            # promote books
 *    node scripts/phase6-library-engine.mjs --consult "problem" # query library
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
const consultIdx = process.argv.indexOf("--consult");
const CONSULT = consultIdx >= 0 ? process.argv[consultIdx + 1] : null;
const NOW = Date.now();
const LIBRARY_NS = "eternal:global:associative-core";
const SOURCE_MODEL = "claude-opus (phase6-promotion)";
const PROMOTE_MIN_CONFIDENCE = 0.9;

function brainClient(namespace) {
  return MemWal.create({ key: DELEGATE_KEY, accountId: ACCOUNT_ID, serverUrl: SERVER_URL, namespace });
}
const shorten = (t) => (t || "").replace(/\s+/g, " ").slice(0, 90);
async function recallJson(client, query, limit) {
  const res = await client.recall({ query, limit, maxDistance: 0.95 });
  return res.results.map((r) => { try { return JSON.parse(r.text); } catch { return null; } }).filter(Boolean);
}

// ── CONSULT mode: what would a stuck project pull from the library? ──
async function consult(problem) {
  console.log(`🧠 ═══ Consult Eternal Library ═══\n   Problem: "${problem}"\n`);
  const lib = brainClient(LIBRARY_NS);
  const res = await lib.recall({ query: problem, maxDistance: 0.55, limit: 8 });
  if (!res.results.length) { console.log("   📚 No relevant books found."); return; }
  for (const h of res.results) {
    let b = null; try { b = JSON.parse(h.text); } catch {}
    if (b && b.type === "LIBRARY_BOOK") console.log(`   📖 ${b.title}  [${(b.tags || []).join(", ")}]  (${b.origin}/${b.source_model || "?"})`);
    else console.log(`   • ${shorten(h.text)}`);
  }
}

// ── PROMOTION ENGINE ────────────────────────────────────────────────
async function promote() {
  console.log(`🧠 ═══ Phase 6: Eternal Library Promotion ═══  (${COMMIT ? "COMMIT" : "DRY-RUN"})\n`);
  const semantic = brainClient("NS_BRAIN_semantic");
  const library = brainClient(LIBRARY_NS);

  // 1. High-confidence knowledge from the Living Brain
  const facts = await recallJson(semantic, "knowledge rules architecture procedures gotchas", 60);
  const strong = facts.filter((f) =>
    f.type === "BRAIN_SEMANTIC" && (Number(f.confidence) >= PROMOTE_MIN_CONFIDENCE || Number(f.times_confirmed) >= 2));
  console.log(`   ${strong.length}/${facts.length} semantic facts qualify for promotion (conf ≥ ${PROMOTE_MIN_CONFIDENCE} or confirmed ≥ 2).`);
  if (!strong.length) { console.log("   (nothing to promote yet)"); return; }

  // 2. Group into books by category
  const byCat = new Map();
  for (const f of strong) {
    const cat = f.category || "general";
    (byCat.get(cat) || byCat.set(cat, []).get(cat)).push(f);
  }

  // 3. Dedup against existing library books
  const existing = await recallJson(library, "LIBRARY_BOOK reference knowledge", 60);
  const existingTitles = new Set(existing.filter((b) => b.type === "LIBRARY_BOOK").map((b) => b.title));

  const books = [];
  for (const [cat, group] of byCat) {
    const title = `Reference: ${cat}`;
    if (existingTitles.has(title)) { console.log(`   ⏭  "${title}" already in library — skip.`); continue; }
    const book = {
      type: "LIBRARY_BOOK",
      book_id: `book:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      version: 1,
      prev_version: 0,
      title,
      content: group.map((f) => `• ${f.concept}: ${f.knowledge}`).join("\n"),
      tags: [...new Set(group.flatMap((f) => f.tags || []))],
      origin: "agent",
      source_model: SOURCE_MODEL,
      distilled_from: group.map((f) => f.concept).filter(Boolean),
      confidence: +(group.reduce((a, f) => a + (Number(f.confidence) || 0.9), 0) / group.length).toFixed(2),
      promoted_at: NOW,
    };
    books.push(book);
    console.log(`   📖 ${title}  [${book.tags.join(", ")}]  ×${group.length} facts · conf ${book.confidence}`);
  }
  if (!books.length) { console.log("\n   Nothing new to promote."); return; }

  if (COMMIT) {
    for (const b of books) {
      const job = await library.remember(JSON.stringify(b));
      await library.waitForRememberJob(job.job_id);
    }
    console.log(`\n   ✅ Promoted ${books.length} books into the Eternal Library.`);
  } else {
    console.log(`\n   [dry-run] would promote ${books.length} books. Pass --commit to write.`);
  }
}

async function main() {
  if (CONSULT) { await consult(CONSULT); return; }
  await promote();
  console.log(`\n🧠 ═══ Done. ${COMMIT ? "Books written to Walrus." : "Read-only."} ═══`);
}

main().catch((e) => { console.error("❌ Phase 6 engine failed:", e); process.exit(1); });
