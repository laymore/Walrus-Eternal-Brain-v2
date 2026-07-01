import { createAccount, addDelegateKey, generateDelegateKey } from "@mysten-incubation/memwal/account";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

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

// Walrus Memory mainnet contract constants
const PACKAGE_ID = "0xcee7a6fd8de52ce645c38332bde23d4a30fd9426bc4681409733dd50958a24c6";
const REGISTRY_ID = "0x0da982cefa26864ae834a8a0504b904233d49e20fcc17c373c8bed99c75a7edd";
const SUI_PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
if (!SUI_PRIVATE_KEY) {
  throw new Error("Missing SUI_PRIVATE_KEY. Set it in .env (gitignored) or your shell env.");
}

async function main() {
  console.log("=== Walrus Mini Forum — Account Setup ===");
  const suiClient = new SuiJsonRpcClient({ 
    network: "mainnet",
    url: getJsonRpcFullnodeUrl("mainnet")
  });

  let accountId = null;

  try {
    console.log("Step 1: Attempting to create MemWalAccount on-chain...");
    const createRes = await createAccount({
      packageId: PACKAGE_ID,
      registryId: REGISTRY_ID,
      suiPrivateKey: SUI_PRIVATE_KEY,
      suiNetwork: "mainnet",
      suiClient 
    });
    accountId = createRes.accountId;
    console.log("  ✓ Created New Account ID:", accountId);
  } catch (err) {
    if (err.message && err.message.includes("MoveAbort")) {
      console.log("  ⚠ Account already exists. Please run `node scripts/find-account.mjs` to extract your Account ID, and place it in the ACCOUNT_ID variable in this script.");
      return;
    }
    throw err;
  }

  console.log("\nStep 2: Generating Ed25519 delegate keypair...");
  const delegate = await generateDelegateKey();
  console.log(`  ✓ Private key (hex): ${delegate.privateKey}`);
  console.log(`  ✓ Sui address: ${delegate.suiAddress}\n`);

  console.log("Step 3: Registering delegate key on-chain...");
  const addResult = await addDelegateKey({
    packageId: PACKAGE_ID,
    accountId: accountId,
    publicKey: delegate.publicKey,
    label: "Mini Forum Frontend",
    suiPrivateKey: SUI_PRIVATE_KEY,
    suiNetwork: "mainnet",
    suiClient,
  });
  console.log(`  ✓ Delegate key added: ${addResult.publicKey}`);
  console.log(`  ✓ Digest: ${addResult.digest}\n`);

  console.log("=== Copy these into your .env (do not commit) ===\n");
  console.log(`VITE_MEMWAL_ACCOUNT_ID=${accountId}`);
  console.log(`VITE_MEMWAL_DELEGATE_KEY=${delegate.privateKey}`);
  console.log(`VITE_MEMWAL_SERVER_URL=https://relayer.memory.walrus.xyz`);
  console.log("\n(Not auto-writing .env to avoid clobbering existing keys.)");
}

main().catch(console.error);
