import { WalrusEternalBrain } from "eternal-agent-brain-core";
import dotenv from "dotenv";

dotenv.config();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function printTyping(text: string, speed = 30) {
  for (const char of text) {
    process.stdout.write(char);
    await delay(speed);
  }
  console.log();
}

async function runDemo() {
  const delegateKeyHex = process.env.VITE_MEMWAL_DELEGATE_KEY;
  const accountId = process.env.VITE_MEMWAL_ACCOUNT_ID;
  if (!delegateKeyHex || !accountId) {
    console.error("❌ Set VITE_MEMWAL_DELEGATE_KEY and VITE_MEMWAL_ACCOUNT_ID in .env — never hardcode keys.");
    process.exit(1);
  }
  const brain = new WalrusEternalBrain({
    delegateKeyHex,
    accountId,
    serverUrl: process.env.VITE_MEMWAL_SERVER_URL || "https://walrus-cors-proxy.miniforum.workers.dev",
    currentProjectId: "video-demo",
  });

  console.log("\n\x1b[36m===================================================\x1b[0m");
  console.log("\x1b[36m🤖 ETERNAL DATA LIBRARIAN AGENT - TERMINAL INTERFACE\x1b[0m");
  console.log("\x1b[36m===================================================\x1b[0m\n");

  await delay(1000);

  // SCENE 1: Refusing low importance write
  await printTyping("\x1b[33m[User]\x1b[0m I just fixed a minor typo in the CSS padding.");
  await delay(500);
  await printTyping("\x1b[90m[Agent is thinking... evaluating importance for Eternal Library]\x1b[0m", 15);
  await delay(1000);
  
  console.log("\x1b[35m> Calling tool: memwal_rememberSelective(\"[test] minor routine note\", importance=1)\x1b[0m");
  const refuseRes = await brain.rememberSelective("Minor CSS padding typo fixed.", 1);
  await delay(800);
  await printTyping(`\x1b[31m→ Refused:\x1b[0m ${refuseRes.reason}`);
  
  await delay(2000);
  console.log("\n---------------------------------------------------\n");

  // SCENE 2: Writing a real insight & linking to an existing book
  await printTyping("\x1b[33m[User]\x1b[0m I solved the React component remounting issue by isolating the context provider.");
  await delay(500);
  await printTyping("\x1b[90m[Agent is thinking... evaluating importance for Eternal Library]\x1b[0m", 15);
  await delay(1000);

  console.log("\x1b[35m> Calling tool: memwal_rememberSelective(\"React context provider isolated to fix remounts\", importance=4)\x1b[0m");
  const acceptRes = await brain.rememberSelective("React context provider isolated to fix remounts", 4);
  await delay(800);
  await printTyping(`\x1b[32m→ Accepted:\x1b[0m ${acceptRes.reason}`);

  await delay(1500);
  console.log("\x1b[35m> Calling tool: brain_createBook(title=\"React Context Isolation\")\x1b[0m");
  
  const bookId = await brain.createBook(
    "React Context Isolation",
    "To prevent full tree re-renders in React, isolate Context Providers into their own minimal wrapper components. Never place state that changes frequently at the root of a massive component tree.",
    ["react", "performance", "architecture"],
    "complete",
    { tlDr: "Isolate React Context Providers to prevent unnecessary tree re-renders.", domainContext: "Frontend Architecture", origin: "video-demo" }
  );
  await printTyping(`\x1b[32m→ Book shelved permanently:\x1b[0m ${bookId}`);

  // Create a synapse (link) to make the Graph look good in UI
  await delay(1000);
  console.log("\x1b[35m> Calling tool: memwal_remember(type=\"BOOK_LINK\")\x1b[0m");
  const linkBlob = {
    type: "BOOK_LINK",
    from_book_id: bookId,
    to_book_id: "book:walrus-deploy-playbook", // Assuming this book exists from the draft
    reason: "Performance optimization for the deployed React frontend",
    created_at: Date.now()
  };
  const job = await brain.eternalLibrary.remember(JSON.stringify(linkBlob));
  await brain.eternalLibrary.waitForRememberJob(job.job_id);
  await printTyping(`\x1b[32m→ Synapse formed:\x1b[0m ${bookId} → book:walrus-deploy-playbook`);

  await delay(2000);
  console.log("\n---------------------------------------------------\n");

  // SCENE 3: Keyword Recall (Task 2)
  await printTyping("\x1b[33m[User]\x1b[0m We are starting a new feature for the UI dashboard. Check memory for past performance tips.");
  await delay(500);
  await printTyping("\x1b[90m[Agent is checking Eternal Library... querying keywords: 'react performance']\x1b[0m", 15);
  await delay(1500);

  console.log("\x1b[35m> Calling tool: memwal_consultLibrary(problem=\"react performance\")\x1b[0m");
  const recallText = await brain.consultLibrary("react performance", 3);
  
  await delay(1000);
  console.log(`\n\x1b[36m[Eternal Library Results]\x1b[0m\n${recallText}\n`);

  await printTyping("\x1b[32m[Agent]\x1b[0m I have retrieved the TL;DR cards. The most relevant is 'React Context Isolation'. I will pull the full text if we need to modify context providers.");

  await delay(2000);
  console.log("\n\x1b[36m===================================================\x1b[0m");
  console.log("\x1b[36m✅ DEMO SCRIPT HOÀN TẤT - BẠN CÓ THỂ MỞ GIAO DIỆN LÊN ĐỂ KIỂM TRA\x1b[0m");
  console.log("\x1b[36m===================================================\x1b[0m\n");
}

runDemo().catch(console.error);
