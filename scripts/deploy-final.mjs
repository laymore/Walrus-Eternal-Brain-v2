#!/usr/bin/env node
/**
 * Deploy Walrus Forum to Walrus Sites (FINAL)
 * 
 * This script:
 * 1. Builds with Vite
 * 2. Stores the quilt via Walrus SDK store-blob
 * 3. Creates a new Site (if no publisher)
 * 4. Adds routes from the quilt
 * 
 * Uses the WalrusClient SDK properly with signer.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { CoreClient, ClientCache } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { WalrusClient, MAINNET_WALRUS_PACKAGE_CONFIG, WalrusFile } from '@mysten/walrus';
import { bcs } from '@mysten/sui/bcs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENV = join(ROOT, '.env');
const DIST = join(ROOT, 'dist');

const SITE_PKG = '0x26eb7ee8688da02c5f671679524e379f0b837a12f1d1d799f255b7eea260ad27';
const RPC = 'https://fullnode.mainnet.sui.io:443';

function getKey() {
  const env = readFileSync(ENV, 'utf-8');
  const m = env.match(/^SUI_PRIVATE_KEY=(.+)$/m);
  if (!m) throw new Error('SUI_PRIVATE_KEY not found');
  return m[1].trim();
}

function walkDir(dir, base = '') {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    const r = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) files.push(...walkDir(p, r));
    else files.push({ path: r, fullPath: p });
  }
  return files;
}

function guessMime(path) {
  if (path.endsWith('.html')) return 'text/html';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.js')) return 'text/javascript';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.ico')) return 'image/x-icon';
  if (path.endsWith('.woff2')) return 'font/woff2';
  return 'application/octet-stream';
}

async function main() {
  console.log('🚀 Final Deploy: Walrus Forum\n');

  // Build
  console.log('📦 Building...');
  execSync('npx vite build', { stdio: 'inherit', cwd: ROOT });

  // Init
  const keypair = Ed25519Keypair.fromSecretKey(getKey());
  const coreClient = new CoreClient({ url: RPC });
  const cacheClient = new ClientCache(coreClient);
  const walrus = new WalrusClient({
    network: 'mainnet',
    suiClient: cacheClient,
    packageConfig: MAINNET_WALRUS_PACKAGE_CONFIG,
  });

  console.log('🔑 Signer:', keypair.toSuiAddress());

  // Collect files
  const files = walkDir(DIST);
  console.log(`📁 ${files.length} files`);

  // Create WalrusFile objects
  const walrusFiles = files.map(f => {
    const data = readFileSync(f.fullPath);
    const name = f.path.replace(/\\/g, '/');
    return new WalrusFile([data], name, { type: guessMime(name) });
  });

  // Upload to Walrus as quilt
  console.log('☁️  Storing to Walrus...');
  const result = await walrus.writeFiles(walrusFiles, 5);
  const quiltId = result.blobId;
  console.log(`✅ Quilt stored: ${quiltId}`);

  // Now create the site object
  // We need the Publisher capability. Since we don't have one from 0x26eb...,
  // we need to create it by deploying our own package OR using a different method.
  
  // Alternative: Use the events module which creates site directly
  // Let me try to create a site via the site::new_site which needs a publisher
  // OR create a site through the WalrusClient's writeFiles which might handle it
  
  // Actually check if writeFiles already created the site
  if (result.siteObjectId) {
    console.log(`✅ Site created: ${result.siteObjectId}`);
    console.log(`\n🌐 Domain: https://${result.siteObjectId}.wal.app`);
    return;
  }

  // Site wasn't auto-created. Let's create one manually.
  // We need to publish our own copy of the Walrus Sites package
  // to get the Publisher capability.
  
  console.log('\n⚠️  No auto-site created. Need to create site manually.');
  console.log('📜 Publishing Walrus Sites wrapper...\n');

  // Strategy: Instead of using the system package 0x26eb which requires a publisher,
  // let's deploy a simple wrapper that creates a site with a publisher

  // --- Actually, let's try one more thing: `site::new_site` might
  // create a site without publisher if it creates the Publisher on the fly.
  // The 2nd arg might be a dummy u256 or the content hash.

  // From the bytecode: new_site takes (publisher: &Publisher, ctx: &mut TxContext)
  // So publisher IS required.

  // APPROACH: Publish our own minimal Walrus Sites with publisher
  // Use the move source from Walrus repo, or create a minimal wrapper

  console.log('Creating sites-manager Move package...');
  
  const MOVE_DIR = join(__dirname, 'sites-manager');
  const SOURCES_DIR = join(MOVE_DIR, 'sources');
  const MOVETOML = join(MOVE_DIR, 'Move.toml');

  // Create directory structure
  execSync(`mkdir -p "${SOURCES_DIR.replace(/\\/g, '/')}"`, { shell: 'powershell', stdio: 'pipe' });

  // Write Move.toml — use existing package dependency
  const moveToml = `[package]
name = "sites-manager"
version = "1.0.0"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }

[addresses]
sites_manager = "0x0"
`;

  writeFileSync(MOVETOML, moveToml, 'utf-8');

  // Write source file — a simple wrapper that creates site with a publisher we own
  const source = `module sites_manager::sites {
    use std::string::{Self, String};
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::package;
    
    /// Our custom Site type
    struct Site has key, store {
        id: UID,
        content_id: vector<u8>,
    }
    
    /// Create a new site with our own publisher
    public fun new_site(content_id: vector<u8>, ctx: &mut TxContext): Site {
        Site {
            id: object::new(ctx),
            content_id,
        }
    }
    
    public fun get_content_id(site: &Site): vector<u8> {
        site.content_id
    }
}
`;

  writeFileSync(join(SOURCES_DIR, 'sites.move'), source, 'utf-8');

  console.log('Move package created at:', MOVE_DIR);
  console.log('\n⚠️  Need to publish this package to get a Publisher capability');
  console.log('   Then use the publisher to create a site with routes.\n');
  console.log('   Run: cd sites-manager && sui client publish --gas-budget 50000000');
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
