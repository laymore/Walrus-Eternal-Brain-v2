#!/usr/bin/env node
/**
 * Deploy Walrus Forum — pure HTTP + Sui CLI (no SDK)
 * 
 * Flow:
 * 1. Build dist 
 * 2. Upload to Walrus via PUT /v1/blobs
 * 3. Create site via Sui CLI
 * 4. Update SuiNS
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const ENV_FILE = join(ROOT, '.env');

const PUBLISHER = 'https://publisher.walrus-testnet.walrus.space';
const AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space';
const SITES_PKG = '0x26eb7ee8688da02c5f671679524e379f0b837a12f1d1d799f255b7eea260ad27';

function getEnv(name) {
  const env = readFileSync(ENV_FILE, 'utf-8');
  const m = env.match(new RegExp(`^${name}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

function run(cmd, timeout = 180000) {
  console.log(`  → ${cmd.slice(0, 140)}`);
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout, maxBuffer: 100*1024*1024 }).trim();
  } catch (e) {
    console.error(`  ❌ ${e.stderr?.slice(0, 400) || e.message?.slice(0, 400)}`);
    return null;
  }
}

function walk(dir, base = '') {
  const result = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const r = base ? `${base}/${f}` : f;
    if (statSync(p).isDirectory()) result.push(...walk(p, r));
    else result.push({ path: r, fullPath: p });
  }
  return result;
}

async function main() {
  console.log('🚀 Deploy Walrus Forum (HTTP + CLI)\n');

  // Step 1: Build
  console.log('📦 Building...');
  execSync('npx vite build', { stdio: 'inherit', cwd: ROOT });

  const files = walk(DIST);
  console.log(`📁 ${files.length} files\n`);

  // Step 2: Upload each file to Walrus
  console.log('☁️  Uploading to Walrus...');
  const resources = [];

  for (const f of files) {
    const contentType = 
      f.path.endsWith('.html') ? 'text/html' :
      f.path.endsWith('.css') ? 'text/css' :
      f.path.endsWith('.js') ? 'text/javascript' :
      f.path.endsWith('.svg') ? 'image/svg+xml' :
      f.path.endsWith('.png') ? 'image/png' :
      f.path.endsWith('.ico') ? 'image/x-icon' :
      'application/octet-stream';

    const url = `${PUBLISHER}/v1/blobs`;
    
    // Use PowerShell for reliable upload
    const psCmd = `powershell -NoProfile -Command "$bytes=[System.IO.File]::ReadAllBytes('${f.fullPath}'); $response=Invoke-RestMethod -Uri '${url}' -Method Put -Body $bytes -ContentType '${contentType}'; ConvertTo-Json $response"`;
    
    const result = run(psCmd, 60000);
    if (result) {
      try {
        const parsed = JSON.parse(result);
        const blobId = parsed.newlyCreated?.blobObject?.blobId || parsed.alreadyCertified?.blobId;
        if (blobId) {
          console.log(`  ✅ ${f.path} → ${blobId}`);
          resources.push({ path: f.path, blobId, contentType });
        } else {
          console.log(`  ⚠️ ${f.path}: ${result.slice(0, 100)}`);
        }
      } catch (e) {
        console.log(`  ⚠️ ${f.path}: ${result.slice(0, 80)}`);
      }
    }
  }

  console.log(`\n📊 Uploaded ${resources.length}/${files.length} files`);

  // Step 3: Create site via Sui CLI
  // For now we'll need to find how to create a site object without a publisher
  // The simplest path: deploy a minimal wrapper package that gives us a Publisher
  
  console.log('\n🏗️  Creating site...');
  
  // Check if we have SuiNS NFT pointing to something useful
  const suinsCheck = run('sui client object 0xe79ef076b6509dff4aefb1ab18e0600f8a1abb6bbf030ba344fc2b1fc8efc0e5 --json', 15000);
  console.log('SuiNS NFT:', suinsCheck?.slice(0, 300) || 'not found');

  // Save resources for manual site creation
  const resourcesFile = join(ROOT, 'resources.json');
  require('fs').writeFileSync(resourcesFile, JSON.stringify(resources, null, 2));
  console.log(`\n📋 Resources saved to resources.json`);
  console.log('   Use these with Sui CLI or Walrus Sites portal');

  console.log('\n✨ Done! Next: create site object via Sui CLI');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
