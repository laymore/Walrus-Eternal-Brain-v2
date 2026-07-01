import { MemWal } from "@mysten-incubation/memwal";
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

if (!ACCOUNT_ID || !DELEGATE_KEY || !SERVER_URL) {
  throw new Error("Missing environment variables in .env");
}

function createClientForNamespace(namespace) {
  return MemWal.create({
    key: DELEGATE_KEY,
    accountId: ACCOUNT_ID,
    serverUrl: SERVER_URL,
    namespace: namespace
  });
}

async function testFeatures() {
  console.log("=== STARTING FEATURE TESTS ===\n");

  // TEST 1: Lobby Chat (NS_01)
  console.log("--- Testing NS_01_LobbyChat ---");
  const chatClient = createClientForNamespace("NS_01_lobby_chat");
  const testAddress = "0xafbc48fd349fb44ce9c6f2b33423e6ae7c826d53a25920a0d4c3c475e40889c5";
  const testMsg = `Hello from automated test at ${new Date().toISOString()}`;
  
  const chatPayload = JSON.stringify({
    type: "LOBBY_CHAT_MESSAGE",
    author: testAddress,
    content: testMsg,
    timestamp: Date.now()
  });

  console.log("Publishing chat message...");
  let job = await chatClient.remember(chatPayload);
  await chatClient.waitForRememberJob(job.job_id);

  console.log("Fetching chat messages...");
  let chatRes = await chatClient.recall({ query: "lobby chat messages", limit: 5 });
  const fetchedChats = chatRes.results.map(r => { try { return JSON.parse(r.text) } catch { return null } });
  
  const foundChat = fetchedChats.find(c => c && c.content === testMsg);
  if (foundChat) {
    console.log("✅ NS_01 Success: Message published and fetched correctly!");
  } else {
    console.log("❌ NS_01 Failed: Message not found in fetched results.");
  }


  // TEST 2: Forum Posts (NS_02)
  console.log("\n--- Testing NS_02_ForumPosts ---");
  const forumClient = createClientForNamespace("NS_02_forum_posts");
  const testTitle = "Automated System Audit Post";
  const testContent = "This is a test post to verify the signature and publication pipeline.";
  
  const postPayload = JSON.stringify({
    type: "FORUM_POST",
    title: testTitle,
    content: testContent,
    author: testAddress,
    tags: ["system-test"],
    signature: "simulated_signature_from_dapp_kit",
    timestamp: Date.now()
  });

  console.log("Publishing forum post...");
  job = await forumClient.remember(postPayload);
  await forumClient.waitForRememberJob(job.job_id);

  console.log("Fetching forum posts...");
  let forumRes = await forumClient.recall({ query: "Automated System", limit: 5 });
  const fetchedPosts = forumRes.results.map(r => { try { return JSON.parse(r.text) } catch { return null } });
  
  const foundPost = fetchedPosts.find(p => p && p.title === testTitle);
  if (foundPost) {
    console.log("✅ NS_02 Success: Post published and fetched correctly via semantic search!");
  } else {
    console.log("❌ NS_02 Failed: Post not found in fetched results.");
  }


  // TEST 3: File Vault (NS_03)
  console.log("\n--- Testing NS_03_FileVault ---");
  const vaultClient = createClientForNamespace("NS_03_file_vault");
  const testFileName = "test_image.png";
  
  const filePayload = JSON.stringify({
    type: "FILE_ATTACHMENT",
    fileName: testFileName,
    fileSize: 1048576, // 1MB
    blobId: `mock_blob_id_${Date.now()}`,
    uploader: testAddress,
    description: "Automated test file",
    timestamp: Date.now()
  });

  console.log("Publishing file metadata...");
  job = await vaultClient.remember(filePayload);
  await vaultClient.waitForRememberJob(job.job_id);

  console.log("Fetching file metadata...");
  let fileRes = await vaultClient.recall({ query: "test files", limit: 5 });
  const fetchedFiles = fileRes.results.map(r => { try { return JSON.parse(r.text) } catch { return null } });
  
  const foundFile = fetchedFiles.find(f => f && f.fileName === testFileName);
  if (foundFile) {
    console.log("✅ NS_03 Success: File metadata published and fetched correctly!");
  } else {
    console.log("❌ NS_03 Failed: File not found in fetched results.");
  }


  // TEST 4: DeFi Hub (NS_04)
  console.log("\n--- Testing NS_04_DefiHub ---");
  const defiClient = createClientForNamespace("NS_04_defi_hub");
  const testSignal = "SUI is breaking out, target $5.00! (Test Signal)";
  
  const defiPayload = JSON.stringify({
    type: "DEFI_SIGNAL",
    content: testSignal,
    timestamp: Date.now()
  });

  console.log("Publishing DeFi signal...");
  job = await defiClient.remember(defiPayload);
  await defiClient.waitForRememberJob(job.job_id);

  console.log("Fetching DeFi signals...");
  let defiRes = await defiClient.recall({ query: "defi signals", limit: 5 });
  const fetchedSignals = defiRes.results.map(r => { try { return JSON.parse(r.text) } catch { return null } });
  
  const foundSignal = fetchedSignals.find(s => s && s.content === testSignal);
  if (foundSignal) {
    console.log("✅ NS_04 Success: DeFi signal published and fetched correctly!");
  } else {
    console.log("❌ NS_04 Failed: Signal not found in fetched results.");
  }

  console.log("\n=== ALL TESTS FINISHED ===");
}

testFeatures().catch(console.error);
