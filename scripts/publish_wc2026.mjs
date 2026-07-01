import { MemWal } from "@mysten-incubation/memwal";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8');
const envVars = {};
for (const line of envFile.split('\n')) {
  if (line.includes('=')) {
    const [k, ...v] = line.split('=');
    envVars[k.trim()] = v.join('=').trim();
  }
}

const ACCOUNT_ID = envVars["VITE_MEMWAL_ACCOUNT_ID"];
const DELEGATE_KEY = envVars["VITE_MEMWAL_DELEGATE_KEY"];
const SERVER_URL = envVars["VITE_MEMWAL_SERVER_URL"];
const SUI_PRIVATE_KEY = envVars["SUI_PRIVATE_KEY"];

if (!ACCOUNT_ID || !DELEGATE_KEY || !SERVER_URL || !SUI_PRIVATE_KEY) {
  throw new Error("Missing environment variables in .env");
}

const eventClient = MemWal.create({
  key: DELEGATE_KEY,
  accountId: ACCOUNT_ID,
  serverUrl: SERVER_URL,
  namespace: "NS_04_events"
});

async function run() {
  const { secretKey } = decodeSuiPrivateKey(SUI_PRIVATE_KEY);
  const keypair = Ed25519Keypair.fromSecretKey(secretKey);
  const adminAddress = keypair.toSuiAddress().toLowerCase();
  console.log(`Using Admin Address: ${adminAddress}`);

  const eventId = `evt_${Date.now()}`;
  const title = "World Cup 2026 Knockout";
  const type = "bracket";
  const timestamp = Date.now();

  const teams = ["Brazil", "Argentina", "France", "England", "Spain", "Germany", "Portugal", "Netherlands"];
  const matches = {};
  
  // QF
  matches[`${eventId}_qf_1`] = { id: `${eventId}_qf_1`, label: 'QF 1', teamA: teams[0], teamB: teams[1], nextMatchId: `${eventId}_sf_1`, nextMatchSlot: 'A' };
  matches[`${eventId}_qf_2`] = { id: `${eventId}_qf_2`, label: 'QF 2', teamA: teams[2], teamB: teams[3], nextMatchId: `${eventId}_sf_1`, nextMatchSlot: 'B' };
  matches[`${eventId}_qf_3`] = { id: `${eventId}_qf_3`, label: 'QF 3', teamA: teams[4], teamB: teams[5], nextMatchId: `${eventId}_sf_2`, nextMatchSlot: 'A' };
  matches[`${eventId}_qf_4`] = { id: `${eventId}_qf_4`, label: 'QF 4', teamA: teams[6], teamB: teams[7], nextMatchId: `${eventId}_sf_2`, nextMatchSlot: 'B' };
  // SF
  matches[`${eventId}_sf_1`] = { id: `${eventId}_sf_1`, label: 'SF 1', teamA: 'TBD', teamB: 'TBD', nextMatchId: `${eventId}_final`, nextMatchSlot: 'A' };
  matches[`${eventId}_sf_2`] = { id: `${eventId}_sf_2`, label: 'SF 2', teamA: 'TBD', teamB: 'TBD', nextMatchId: `${eventId}_final`, nextMatchSlot: 'B' };
  // Final
  matches[`${eventId}_final`] = { id: `${eventId}_final`, label: 'Final', teamA: 'TBD', teamB: 'TBD' };

  const canonical = `EVENT_CONFIG:${eventId}:${title}:${type}:${timestamp}`;
  const signatureRes = await keypair.signPersonalMessage(new TextEncoder().encode(canonical));

  const pData = {
    eventId,
    title,
    type,
    matches,
    timestamp,
    admin: adminAddress,
    signature: signatureRes.signature
  };

  console.log("Publishing Event...");
  const job = await eventClient.remember(JSON.stringify(pData));
  await eventClient.waitForRememberJob(job.job_id);
  console.log(`✅ Successfully published Event: ${title} (${eventId})`);
}

run().catch(console.error);
