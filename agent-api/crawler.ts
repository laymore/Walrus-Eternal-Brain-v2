import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { WalrusEternalBrain } from 'eternal-agent-brain-core';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const brain = new WalrusEternalBrain({
  delegateKeyHex: process.env.VITE_MEMWAL_DELEGATE_KEY || "",
  accountId: process.env.VITE_MEMWAL_ACCOUNT_ID || "",
  serverUrl: process.env.VITE_MEMWAL_SERVER_URL || "",
  currentProjectId: "local-crawler"
});

function getAllFiles(targetPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(targetPath)) return arrayOfFiles;

  if (fs.statSync(targetPath).isFile()) {
    if (targetPath.endsWith('.md') || targetPath.endsWith('.txt')) {
      arrayOfFiles.push(targetPath);
    }
    return arrayOfFiles;
  }

  const files = fs.readdirSync(targetPath);
  files.forEach((file) => {
    if (file === 'node_modules' || file === '.git' || file === 'dist') return;
    
    const fullPath = path.join(targetPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (fullPath.endsWith('.md') || fullPath.endsWith('.txt')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

async function runCrawler() {
  const targetDir = process.argv[2];
  
  if (!targetDir) {
    console.error("❌ Please provide a directory to crawl.");
    console.error("Usage: npm run crawl <path/to/directory>");
    process.exit(1);
  }

  const absolutePath = path.resolve(process.cwd(), targetDir);
  console.log(`🔍 Scanning directory: ${absolutePath}`);

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Directory not found: ${absolutePath}`);
    process.exit(1);
  }

  const files = getAllFiles(absolutePath);
  console.log(`📄 Found ${files.length} markdown/text files.`);

  let totalFacts = 0;

  for (const file of files) {
    console.log(`- Ingesting: ${path.basename(file)}...`);
    const content = fs.readFileSync(file, 'utf-8');
    
    try {
      const factsStored = await brain.ingestMarkdownBook(content);
      totalFacts += factsStored;
      console.log(`  ✅ Stored ${factsStored} facts.`);
    } catch (err: any) {
      console.error(`  ❌ Failed to ingest ${file}:`, err.message);
    }
  }

  console.log(`\n🎉 Crawl complete! Successfully ingested ${totalFacts} new facts into Eternal Library.`);
}

runCrawler();
