import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
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

const PACKAGE_ID = "0xcee7a6fd8de52ce645c38332bde23d4a30fd9426bc4681409733dd50958a24c6";
const SUI_PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
if (!SUI_PRIVATE_KEY) {
  throw new Error("Missing SUI_PRIVATE_KEY. Set it in .env (gitignored) or your shell env.");
}

async function main() {
    const keypair = Ed25519Keypair.fromSecretKey(SUI_PRIVATE_KEY);
    const ownerAddress = keypair.toSuiAddress();
    
    console.log("Wallet address:", ownerAddress);

    console.log("Querying AccountCreated events...");
    let hasNextPage = true;
    let cursor = null;
    let accountId = null;

    while (hasNextPage) {
        const response = await fetch("https://fullnode.mainnet.sui.io:443", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "suix_queryEvents",
                params: [
                    { MoveEventType: `${PACKAGE_ID}::account::AccountCreated` },
                    cursor,
                    null, // limit
                    true  // descending (let's check most recent first)
                ]
            })
        });
        
        const json = await response.json();
        const result = json.result;

        for (const event of result.data) {
            if (event.parsedJson.owner === ownerAddress) {
                accountId = event.parsedJson.account_id || event.parsedJson.account;
                console.log("Found account ID from event:", accountId);
                return;
            }
        }
        
        hasNextPage = result.hasNextPage;
        cursor = result.nextCursor;
    }
    
    if (!accountId) {
        console.log("Account not found in events.");
    }
}

main().catch(console.error);
