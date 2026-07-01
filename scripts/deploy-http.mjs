#!/usr/bin/env node
/**
 * Deploy forum to Walrus Sites — pure HTTP + Sui CLI approach
 * No SDK dependencies needed.
 */
import { execSync } from 'child_process';
import { readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const ENV_FILE = join(ROOT, '.env');

function getEnvVar(name) {
  const env = readFileSync(ENV_FILE, 'utf-8');
  const m = env.match(new RegExp(`^${name}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

function run(cmd) {
  console.log(`  → ${cmd.slice(0, 150)}`);
  try {
    const out = execSync(cmd, { encoding: 'utf-8', timeout: 180000, maxBuffer: 50*1024*1024 });
    return out.trim();
  } catch (e) {
    console.error(`  ❌ ${e.stderr?.slice(0, 600) || e.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Deploy Walrus Forum (HTTP + CLI)\n');

  // Step 1: Build
  console.log('📦 Building...');
  execSync('npx vite build', { stdio: 'inherit', cwd: ROOT });

  // Step 2: Read all dist files
  const files = [];
  function walk(dir, base) {
    const { readdirSync, statSync } = require('fs');
    for (const f of readdirSync(dir)) {
      const p = join(dir, f);
      const r = base ? `${base}/${f}` : f;
      if (statSync(p).isDirectory()) walk(p, r);
      else files.push({ path: r, fullPath: p });
    }
  }
  walk(DIST, '');
  console.log(`📁 ${files.length} files in dist`);

  // Step 3: Upload each file individually to Walrus publisher
  const PUBLISHER = 'https://publisher.walrus-testnet.walrus.space';
  const resources = [];

  for (const f of files) {
    const contentType = f.path.endsWith('.html') ? 'text/html' :
                        f.path.endsWith('.css') ? 'text/css' :
                        f.path.endsWith('.js') ? 'text/javascript' :
                        f.path.endsWith('.svg') ? 'image/svg+xml' :
                        f.path.endsWith('.png') ? 'image/png' :
                        'application/octet-stream';

    console.log(`  📤 ${f.path}...`);
    const cmd = `curl.exe -s -X PUT "${PUBLISHER}/v1/blobs" -H "Content-Type: ${contentType}" --data-binary "@${f.fullPath}"`;
    const result = run(cmd);
    
    if (result) {
      try {
        const parsed = JSON.parse(result);
        const blobId = parsed.newlyCreated?.blobObject?.blobId || parsed.alreadyCertified?.blobId;
        if (blobId) {
          console.log(`    ✅ ${blobId}`);
          resources.push({ path: f.path, blobId, contentType });
        }
      } catch (e) {
        console.log(`    ⚠️ Response: ${result.slice(0, 100)}`);
      }
    }
  }

  console.log(`\n☁️  ${resources.length}/${files.length} files uploaded`);

  // Step 4: Create a new site and add resources
  const SITES_PKG = '0x26eb7ee8688da02c5f671679524e379f0b837a12f1d1d799f255b7eea260ad27';
  
  // We need to create a new site. Let's try using the Quilt approach —
  // we'll upload all files as a single tar/blob and create site from that.
  // Actually, the site::create_site_resource function creates individual resources.
  
  // For now, let's try creating a new site via the Sui CLI
  // using the site::new_site function (needs a Publisher capability)
  
  // First check if we have a publisher
  console.log('\n🔍 Checking for existing Publisher...');
  const PRIVKEY = getEnvVar('SUI_PRIVATE_KEY');
  const address = '0xfbf73b2f72858a4dbbcb4b942985bd46f410e7210fe01f8340f91946faec115f';
  
  // Try the Walrus Sites CLI approach
  // sui client call to create site
  
  // Let's use a simpler approach — use the sites CLI if available
  console.log('\n🏗️ Creating site via sui client...');
  
  // The site::new_site takes a Publisher and TxContext. 
  // We need a publisher. Let's see if we can create one by publishing a wrapper.
  
  console.log('\n⚠️ Need Publisher capability. Options:');
  console.log('  1. Publish a minimal package that creates a Publisher');
  console.log('  2. Use an existing deployed package');
  console.log('  3. Find a way to get Publisher from the system');
  
  // Actually, Walrus Sites v2 has site::new_site that takes just (Vec<u8>, &mut TxContext)
  // Let me check the function signature
  const inspectCmd = `sui client pt --json --move-function ${SITES_PKG}::site::new_site`;
  const inspectResult = run(inspectCmd);
  console.log('new_site signature:', inspectResult?.slice(0, 500));

  // Save resources list for later
  console.log('\n📋 Resources ready for site creation:');
  console.log(JSON.stringify(resources, null, 2));

  console.log('\n✨ Done (resources uploaded, need site creation)');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
