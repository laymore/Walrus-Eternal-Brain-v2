/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Project Compressor (Phase 6 companion)
 *  Distil a whole repo into ONE .md "book" for the Eternal Library.
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Ingestion strategy (decided): the library stores DISTILLED .md books,
 *  never raw whole projects. This reads a repo and produces a sparse digest —
 *  overview + structure + key configs + a header/summary table-of-contents of
 *  every .md — then (optionally) shelves it as a LIBRARY_BOOK in the Eternal
 *  Library so future projects can `consultLibrary()` the lessons.
 *
 *  Usage:
 *    node scripts/compress-project.mjs [targetDir]           # dry-run: write .md only
 *    node scripts/compress-project.mjs [targetDir] --commit  # + shelve into library
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

const args = process.argv.slice(2).filter((a) => a !== "--commit");
const COMMIT = process.argv.includes("--commit");
const TARGET = path.resolve(args[0] || path.join(__dirname, ".."));
const NOW = Date.now();
const SOURCE_MODEL = "claude-opus (compress-project)";
const LIBRARY_NS = "eternal:global:associative-core";

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "artifacts", "logs", ".agents", ".claude"]);
const IGNORE_FILE = (f) => /\.(lock|log)$/.test(f) || /package-lock\.json$/.test(f);
const BIG_JSON = (full) => full.endsWith(".json") && !full.endsWith("package.json");

function walk(dir, depth = 0, acc = { mds: [], tree: [] }) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name.startsWith(".") && e.name !== ".env.example") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      if (depth < 3) { acc.tree.push(`${"  ".repeat(depth)}📁 ${e.name}/`); walk(full, depth + 1, acc); }
    } else {
      if (IGNORE_FILE(e.name)) continue;
      let size = 0; try { size = fs.statSync(full).size; } catch {}
      if (size > 200_000 || BIG_JSON(full)) continue;
      if (depth < 3) acc.tree.push(`${"  ".repeat(depth)}📄 ${e.name}`);
      if (e.name.endsWith(".md")) acc.mds.push(full);
    }
  }
  return acc;
}

// Distil a markdown file to its header outline + 1-line summary under each.
function distilMd(file) {
  let text = "";
  try { text = fs.readFileSync(file, "utf-8"); } catch { return ""; }
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,4}\s+/.test(lines[i])) {
      out.push(lines[i].trim());
      const next = lines.slice(i + 1).find((l) => l.trim().length > 0 && !/^#{1,4}\s/.test(l));
      if (next) out.push(`  ${next.trim().slice(0, 140)}`);
    }
  }
  return out.slice(0, 40).join("\n");
}

function buildBook() {
  const name = path.basename(TARGET);
  const { mds, tree } = walk(TARGET);

  // package.json summary
  let pkgSummary = "";
  const pkgPath = path.join(TARGET, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const p = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const scripts = Object.keys(p.scripts || {}).join(", ");
      const deps = Object.keys(p.dependencies || {}).join(", ");
      pkgSummary = `- version: ${p.version || "?"}\n- scripts: ${scripts}\n- deps: ${deps}`;
    } catch {}
  }

  const readme = mds.find((f) => /readme\.md$/i.test(f));
  const overview = readme ? distilMd(readme) : "(no README)";

  const docDigest = mds
    .filter((f) => !/readme\.md$/i.test(f))
    .map((f) => `### ${path.relative(TARGET, f)}\n${distilMd(f)}`)
    .join("\n\n");

  const content = [
    `# 📕 Project Book: ${name}`,
    `> Compressed from \`${TARGET}\` on ${new Date(NOW).toISOString().slice(0, 10)} by ${SOURCE_MODEL}.`,
    `> Reference digest for future projects — lessons, not code copies (exact code lives in git).`,
    ``,
    `## Overview`,
    overview,
    ``,
    `## Structure`,
    "```",
    tree.slice(0, 80).join("\n"),
    "```",
    ``,
    `## Key Configs`,
    pkgSummary || "(none)",
    ``,
    `## Documentation (distilled outlines)`,
    docDigest || "(none)",
  ].join("\n");

  return { name, content, mdCount: mds.length };
}

async function main() {
  console.log(`📚 ═══ Project Compressor ═══  (${COMMIT ? "COMMIT" : "DRY-RUN"})`);
  console.log(`   Target: ${TARGET}`);
  const { name, content, mdCount } = buildBook();
  console.log(`   Distilled ${mdCount} markdown files → book (${content.length} chars).`);

  // Write the .md book to disk for inspection/editing.
  const outDir = path.join(__dirname, "..", "library-books");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${name}-book.md`);
  fs.writeFileSync(outFile, content);
  console.log(`   ✍  Wrote book: ${outFile}`);

  if (!COMMIT) { console.log("\n   [dry-run] not shelved. Pass --commit to add to the Eternal Library."); return; }

  if (!process.env.VITE_MEMWAL_ACCOUNT_ID || !process.env.VITE_MEMWAL_DELEGATE_KEY) {
    console.error("   ❌ Missing memwal creds — cannot shelve."); return;
  }
  const library = MemWal.create({
    key: process.env.VITE_MEMWAL_DELEGATE_KEY,
    accountId: process.env.VITE_MEMWAL_ACCOUNT_ID,
    serverUrl: "https://relayer.memory.walrus.xyz",
    namespace: LIBRARY_NS,
  });
  const book = {
    type: "LIBRARY_BOOK",
    book_id: `book:project-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    version: 1,
    prev_version: 0,
    title: `Project: ${name}`,
    content,
    tags: ["project-book", "compressed", name],
    origin: "agent-compressor",
    source_model: SOURCE_MODEL,
    distilled_from: [`${mdCount} markdown files`],
    promoted_at: NOW,
  };
  const job = await library.remember(JSON.stringify(book));
  await library.waitForRememberJob(job.job_id);
  console.log(`   ✅ Shelved "Project: ${name}" into the Eternal Library.`);
  console.log(`\n📚 ═══ Done. ═══`);
}

main().catch((e) => { console.error("❌ Compressor failed:", e); process.exit(1); });
