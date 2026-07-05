/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Book Evolution & Neuron Links (Phase 9, Step 1)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Each book in the Eternal Library is a NEURON. Like identity, a book is
 *  append-only + versioned: editing appends a new version (same book_id), so
 *  every book has its OWN development history. Books connect via explicit
 *  lineage synapses (BOOK_LINK: "this project reused code from that one") —
 *  linked or isolated.
 *
 *  book_id is derived from the title slug so the Promotion Engine, the Project
 *  Compressor and manual edits all agree on the same neuron.
 *
 *  Usage:
 *    node scripts/book-evolve.mjs --list
 *    node scripts/book-evolve.mjs --history "<book_id|title>"
 *    node scripts/book-evolve.mjs --new "Title" --content "..." [--tags a,b] --commit
 *    node scripts/book-evolve.mjs --evolve "<book_id|title>" --content "..." --commit
 *    node scripts/book-evolve.mjs --link "Title A" "Title B" --reason "reused X" --commit
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

const LIBRARY_NS = "eternal:global:associative-core";
const NOW = Date.now();
const COMMIT = process.argv.includes("--commit");
const argv = process.argv.slice(2);
const flag = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const has = (f) => argv.includes(f);

const library = MemWal.create({ key: DELEGATE_KEY, accountId: ACCOUNT_ID, serverUrl: SERVER_URL, namespace: LIBRARY_NS });
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const toBookId = (s) => (s.startsWith("book:") ? s : `book:${slug(s)}`);
const short = (t) => (t || "").replace(/\s+/g, " ").slice(0, 70);

async function readAll() {
  const res = await library.recall({ query: "LIBRARY_BOOK book knowledge reference project neuron", limit: 80, maxDistance: 0.98 });
  const books = [], links = [];
  for (const r of res.results) {
    let j; try { j = JSON.parse(r.text); } catch { continue; }
    if (j?.type === "LIBRARY_BOOK") books.push({ ...j, book_id: j.book_id || toBookId(j.title || "untitled") });
    else if (j?.type === "BOOK_LINK") links.push(j);
  }
  return { books, links };
}
// latest version per book_id
function latest(books) {
  const m = new Map();
  for (const b of books) {
    const cur = m.get(b.book_id);
    if (!cur || (b.version || 1) > (cur.version || 1)) m.set(b.book_id, b);
  }
  return [...m.values()];
}

async function put(obj) {
  const job = await library.remember(JSON.stringify(obj));
  await library.waitForRememberJob(job.job_id);
}

async function cmdList() {
  const { books, links } = await readAll();
  const heads = latest(books);
  const linkCount = new Map();
  for (const l of links) { linkCount.set(l.from_book_id, (linkCount.get(l.from_book_id) || 0) + 1); linkCount.set(l.to_book_id, (linkCount.get(l.to_book_id) || 0) + 1); }
  console.log(`📚 ${heads.length} neurons · ${links.length} synapse link(s)\n`);
  for (const b of heads.sort((a, z) => (a.title || "").localeCompare(z.title || ""))) {
    const syn = linkCount.get(b.book_id) || 0;
    const st = (b.status || "complete") === "building" ? "🚧 BUILDING" : "✓ complete";
    console.log(`   🧠 ${b.title}  v${b.version || 1}  ${st}  [${(b.tags || []).join(", ")}]  ${syn ? `🔗×${syn}` : "◦ isolated"}`);
    console.log(`      ${b.book_id}`);
  }
  if (links.length) { console.log("\n   Synapses:"); links.forEach((l) => console.log(`   🔗 ${l.from_book_id} → ${l.to_book_id}  (${l.reason || "?"})`)); }
}

async function cmdHistory(ref) {
  const id = toBookId(ref);
  const { books } = await readAll();
  const chain = books.filter((b) => b.book_id === id).sort((a, z) => (a.version || 1) - (z.version || 1));
  if (!chain.length) { console.log(`   (no book ${id})`); return; }
  console.log(`📖 Book Development History — ${chain[chain.length - 1].title} (${id})\n`);
  for (const v of chain) {
    const when = v.changed_at ? new Date(v.changed_at).toISOString().slice(0, 10) : "seed";
    console.log(`   v${v.version || 1} [${when}]  ${short(v.content)}`);
    if ((v.changed_fields || []).length) console.log(`        changed: ${v.changed_fields.join(", ")}`);
  }
}

async function cmdNew(title, content) {
  const id = toBookId(title);
  const { books } = await readAll();
  if (latest(books).some((b) => b.book_id === id)) { console.log(`   ⚠ Book ${id} exists — use --evolve.`); return; }
  const tags = (flag("--tags") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const status = flag("--status") === "building" ? "building" : "complete";
  const book = { type: "LIBRARY_BOOK", book_id: id, version: 1, prev_version: 0, title, content, tags, status, origin: "manual", changed_at: NOW };
  console.log(`   📖 NEW neuron ${id} v1 (${status}) — "${title}"`);
  if (COMMIT) { await put(book); console.log("   ✅ Shelved."); } else console.log("   [dry-run] pass --commit to shelve.");
}

// Toggle a book's build status → appends a new version (append-only history).
async function cmdSetStatus(ref, status) {
  const id = toBookId(ref);
  const s = status === "building" ? "building" : "complete";
  const { books } = await readAll();
  const chain = books.filter((b) => b.book_id === id);
  if (!chain.length) { console.log(`   ⚠ No book ${id}.`); return; }
  const cur = chain.sort((a, z) => (a.version || 1) - (z.version || 1))[chain.length - 1];
  const next = { ...cur, version: (cur.version || 1) + 1, prev_version: cur.version || 1, status: s, changed_at: NOW, changed_fields: ["status"] };
  console.log(`   ${s === "building" ? "🚧" : "✓"} SET STATUS ${id} → ${s} (v${next.version})`);
  if (COMMIT) { await put(next); console.log("   ✅ Updated."); } else console.log("   [dry-run] pass --commit.");
}

async function cmdEvolve(ref, content) {
  const id = toBookId(ref);
  const { books } = await readAll();
  const chain = books.filter((b) => b.book_id === id);
  if (!chain.length) { console.log(`   ⚠ No book ${id} — use --new.`); return; }
  const cur = chain.sort((a, z) => (a.version || 1) - (z.version || 1))[chain.length - 1];
  const next = { ...cur, version: (cur.version || 1) + 1, prev_version: cur.version || 1, content, changed_at: NOW, changed_fields: ["content"] };
  console.log(`   📖 EVOLVE ${id} v${cur.version || 1} → v${next.version} — "${cur.title}"`);
  if (COMMIT) { await put(next); console.log("   ✅ New version appended (old versions kept as history)."); } else console.log("   [dry-run] pass --commit to append.");
}

async function cmdLink(a, b, reason) {
  const from = toBookId(a), to = toBookId(b);
  const link = { type: "BOOK_LINK", from_book_id: from, to_book_id: to, reason, created_at: NOW };
  console.log(`   🔗 LINK ${from} → ${to}  (${reason || "?"})`);
  if (COMMIT) { await put(link); console.log("   ✅ Synapse formed."); } else console.log("   [dry-run] pass --commit to link.");
}

async function main() {
  console.log(`🧠 ═══ Book Evolution ═══  (${COMMIT ? "COMMIT" : "DRY-RUN"})`);
  if (has("--history")) return cmdHistory(flag("--history"));
  if (has("--new")) return cmdNew(flag("--new"), flag("--content") || "(empty)");
  if (has("--evolve")) return cmdEvolve(flag("--evolve"), flag("--content") || "(empty)");
  if (has("--link")) {
    const i = argv.indexOf("--link");
    return cmdLink(argv[i + 1], argv[i + 2], flag("--reason"));
  }
  if (has("--set-status")) {
    const i = argv.indexOf("--set-status");
    return cmdSetStatus(argv[i + 1], argv[i + 2]);
  }
  return cmdList();
}

main().catch((e) => { console.error("❌ book-evolve failed:", e); process.exit(1); });
