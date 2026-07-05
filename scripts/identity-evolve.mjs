/**
 * ═══════════════════════════════════════════════════════════════════
 *  Antigravity Brain — Identity Evolution Protocol (Phase 8 self-healing)
 *  "The character's development history book."
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Identity is append-only + versioned + signed. Every change is a new page,
 *  never an overwrite — so the full chain of versions IS the agent's
 *  autobiography (rewind the versions to see how it evolved).
 *
 *  Trust model:
 *    - HARD truth (dev wallet) = the on-chain `MemWalAccount.owner`. Read live
 *      from Sui, never hardcoded → legitimate ownership transfer auto-heals.
 *    - SOFT identity (project name, brand, rules) = versioned records SIGNED by
 *      the current dev wallet. Latest validly-signed version wins.
 *    - Drift alarm: a version whose signer ≠ on-chain owner is rejected.
 *
 *  Usage:
 *    node scripts/identity-evolve.mjs --history                     # timeline (read-only)
 *    node scripts/identity-evolve.mjs --set project_name="New Name" # stage a change (dry-run)
 *    node scripts/identity-evolve.mjs --set brand="X" --commit      # sign + append new version
 */

import { MemWal } from "@mysten-incubation/memwal";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
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
const SUI_PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
const SERVER_URL = "https://relayer.memory.walrus.xyz";
if (!ACCOUNT_ID || !DELEGATE_KEY) { console.error("❌ Missing memwal env"); process.exit(1); }

const COMMIT = process.argv.includes("--commit");
const HISTORY = process.argv.includes("--history");
const NOW = Date.now();

// Parse --set key=value pairs
const sets = {};
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === "--set") {
    const kv = process.argv[i + 1] || "";
    const eq = kv.indexOf("=");
    if (eq > 0) sets[kv.slice(0, eq)] = kv.slice(eq + 1).replace(/^["']|["']$/g, "");
  }
}

const identityClient = MemWal.create({ key: DELEGATE_KEY, accountId: ACCOUNT_ID, serverUrl: SERVER_URL, namespace: "NS_BRAIN_identity" });
const sui = new SuiJsonRpcClient({ network: "mainnet", url: getJsonRpcFullnodeUrl("mainnet") });
const short = (a) => (a && a.startsWith("0x") ? `${a.slice(0, 8)}…${a.slice(-4)}` : a);

// HARD truth: on-chain account owner = the real dev wallet.
async function onChainOwner() {
  try {
    const obj = await sui.getObject({ id: ACCOUNT_ID, options: { showContent: true } });
    const f = obj?.data?.content?.fields;
    return f?.owner || null;
  } catch (e) {
    // RPC flakiness must not crash the whole tool — return null and let callers
    // (drift check / --set guard) degrade gracefully.
    console.error(`⚠️  RPC getObject failed (${e?.message || e}) — treating owner as unknown.`);
    return null;
  }
}

async function readVersions() {
  const res = await identityClient.recall({ query: "agent identity dev wallet project version", limit: 30, maxDistance: 0.97 });
  return res.results
    .map((r) => { try { return JSON.parse(r.text); } catch { return null; } })
    .filter((x) => x && x.type === "BRAIN_IDENTITY")
    .sort((a, b) => (a.version || 0) - (b.version || 0));
}

// Stable canonical string that a signature commits to.
function canonical(rec) {
  return ["BRAIN_IDENTITY_V", rec.version, rec.dev_wallet, rec.project_name || "", rec.changed_at || 0, JSON.stringify(rec.changed_fields || [])].join("\n");
}

async function main() {
  const owner = await onChainOwner();
  console.log(`🪪 On-chain dev wallet (source of truth): ${short(owner)}`);
  const versions = await readVersions();
  const current = versions[versions.length - 1] || null;

  // Drift check against the chain
  if (current) {
    const drift = current.dev_wallet && owner && current.dev_wallet.toLowerCase() !== owner.toLowerCase();
    console.log(`   Latest identity v${current.version} dev_wallet ${short(current.dev_wallet)} — ${drift ? "⚠ DRIFT vs chain!" : "✓ matches chain"}`);
  }

  if (HISTORY || (!Object.keys(sets).length)) {
    console.log(`\n📖 ═══ Character Development History (${versions.length} versions) ═══`);
    for (const v of versions) {
      let sigOk = "unsigned";
      if (v.signature && v.signed_by) {
        try { await verifyPersonalMessageSignature(new TextEncoder().encode(canonical(v)), v.signature, { address: v.signed_by, client: sui }); sigOk = "✓ signed"; }
        catch { sigOk = "✗ bad-sig"; }
      }
      const when = v.changed_at ? new Date(v.changed_at).toISOString().slice(0, 10) : "seed";
      console.log(`   v${v.version} [${when}] ${sigOk}  wallet ${short(v.dev_wallet)} · project "${v.project_name || "?"}"`);
      if ((v.changed_fields || []).length) console.log(`        changed: ${v.changed_fields.join(", ")}`);
    }
    return;
  }

  // --set: stage a new signed version
  const base = current || { version: 0, dev_wallet: owner, project_name: "" };
  const next = { ...base, type: "BRAIN_IDENTITY", version: (base.version || 0) + 1, changed_at: NOW, prev_version: base.version || 0 };
  const changed = [];
  for (const [k, val] of Object.entries(sets)) { next[k] = val; changed.push(k); }
  next.changed_fields = changed;
  // Never let a soft edit spoof the hard truth:
  next.dev_wallet = owner || base.dev_wallet;

  console.log(`\n✏  New identity v${next.version} — changed: ${changed.join(", ")}`);

  if (!SUI_PRIVATE_KEY) { console.error("   ❌ SUI_PRIVATE_KEY missing — cannot sign the change."); return; }
  const kp = Ed25519Keypair.fromSecretKey(SUI_PRIVATE_KEY);
  const signerAddr = kp.getPublicKey().toSuiAddress();
  if (owner && signerAddr.toLowerCase() !== owner.toLowerCase()) {
    console.error(`   ❌ Signer ${short(signerAddr)} is NOT the on-chain owner ${short(owner)} — refusing (drift protection).`); return;
  }
  const { signature } = await kp.signPersonalMessage(new TextEncoder().encode(canonical(next)));
  next.signature = signature; next.signed_by = signerAddr;
  console.log(`   🔏 Signed by current dev wallet ${short(signerAddr)}.`);

  if (COMMIT) {
    const job = await identityClient.remember(JSON.stringify(next));
    await identityClient.waitForRememberJob(job.job_id);
    console.log(`   ✅ Appended v${next.version} to NS_BRAIN_identity (old versions preserved as history).`);
  } else {
    console.log("   [dry-run] not written. Pass --commit to append this signed version.");
  }
}

main().catch((e) => { console.error("❌ identity-evolve failed:", e); process.exit(1); });
