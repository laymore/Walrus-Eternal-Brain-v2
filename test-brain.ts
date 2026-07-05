import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { requestSuiFromFaucetV0, getFaucetHost } from "@mysten/sui/faucet";
import { createAccount, addDelegateKey, generateDelegateKey } from "@mysten-incubation/memwal/account";
import { PACKAGE_ID, REGISTRY_ID, SERVER_URL } from "./src/config.ts";
import { WalrusEternalBrain } from "./src/lib/WalrusEternalBrain.ts";

async function runTest() {
  console.log("🚀 Starting Agentic Brain Engine Test...");
  const suiClient = new SuiClient({ url: getFullnodeUrl("testnet") });
  const devKey = process.env.SUI_PRIVATE_KEY;
  if (!devKey) throw new Error("Set SUI_PRIVATE_KEY in your env before running this test.");
  const { secretKey } = decodeSuiPrivateKey(devKey);
  const userKeypair = Ed25519Keypair.fromSecretKey(secretKey);
  
  console.log(`🔑 Created test wallet: ${userKeypair.toSuiAddress()}`);
  
  console.log("🚰 Requesting testnet SUI from faucet...");
  await requestSuiFromFaucetV0({
    host: getFaucetHost("testnet"),
    recipient: userKeypair.toSuiAddress(),
  });
  
  // Wait a few seconds for the faucet to process
  await new Promise(r => setTimeout(r, 5000));

  const walletSigner = {
    address: userKeypair.toSuiAddress(),
    signAndExecuteTransaction: async (input: any) => {
      const tx = input.transaction;
      tx.setSender(userKeypair.toSuiAddress());
      const res = await suiClient.signAndExecuteTransaction({
        transaction: tx,
        signer: userKeypair,
        options: { showEffects: true, showObjectChanges: true }
      });
      return { digest: res.digest };
    },
    signPersonalMessage: async (input: any) => {
      throw new Error("Not needed");
    }
  };

  console.log("🧠 Creating MemWal Account on-chain...");
  const createRes = await createAccount({
    packageId: PACKAGE_ID,
    registryId: REGISTRY_ID,
    walletSigner: walletSigner as any,
    suiClient,
    suiNetwork: 'testnet'
  });
  console.log(`✅ MemWal Account created! ID: ${createRes.accountId}`);

  console.log("🔑 Generating local Delegate Key...");
  const delegate = await generateDelegateKey();
  
  console.log("🔐 Registering Delegate Key on-chain...");
  await addDelegateKey({
    packageId: PACKAGE_ID,
    accountId: createRes.accountId,
    publicKey: delegate.publicKey,
    label: "Automated Test Script",
    walletSigner: walletSigner as any,
    suiClient,
    suiNetwork: 'testnet'
  });

  console.log("⚙️ Initializing WalrusEternalBrain...");
  const brain = new WalrusEternalBrain({
    delegateKeyHex: delegate.privateKey,
    accountId: createRes.accountId,
    serverUrl: SERVER_URL,
    currentProjectId: "test_project_1"
  });

  console.log("==========================================");
  console.log("📝 TEST 1: Recording Execution Trace into Thinking Brain");
  const traceMsg = "Fixed CORS issue on API gateway by adding Access-Control-Allow-Origin headers.";
  console.log(`Input: "${traceMsg}"`);
  await brain.recordExecutionTrace(traceMsg);
  console.log("✅ Trace recorded and confirmed on Walrus relayer!");

  console.log("==========================================");
  console.log("📝 TEST 2: Consolidating Session into Eternal Library");
  const consolidateRes = await brain.consolidateAndCleanSession();
  console.log(`✅ Consolidation result: ${consolidateRes}`);

  console.log("==========================================");
  console.log("📝 TEST 3: Retrieving Optimized Context");
  const query = "How to fix CORS issues?";
  console.log(`Query: "${query}"`);
  
  // Small wait for indexing
  await new Promise(r => setTimeout(r, 2000));
  
  const context = await brain.retrieveOptimizedContext(query);
  console.log("Context Retrieved:");
  console.log(context);
  
  console.log("==========================================");
  console.log("🎉 All automated tests completed successfully!");
}

runTest().catch(console.error);
