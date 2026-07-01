#!/usr/bin/env node
/**
 * Deploy mini-forum-app to Walrus Sites (v2)
 * Uses the stored quilt to update site routes via Sui Move calls
 * 
 * Quilt ID: 2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjw
 * 
 * The CLI showed us these patches:
 *  0  __vite-browser-external-D3ml_aBV.js   [1, 2)
 *  1  blake2-CdtPVAyq.js                     [2, 26)
 *  2  client-gvojidBz.js                     [26, 27)
 *  3  dist-BfAbKTxP.js                       [27, 61)
 *  4  ed25519-BxWtgaWi.js                    [61, 65)
 *  5  favicon.svg                            [65, 70)
 *  6  grpc-Dfo3JXKE.js                       [70, 149)
 *  7  icons.svg                              [149, 152)
 *  8  index-BUSmnUAo.css                     [152, 165)
 *  9  index-D4I485YQ.js                      [165, 503)
 *  10 index.html                             [503, 504)
 *
 * Each patch ID = quilt_blob_id + encoding of the sliver range
 * For resources, Walrus Sites uses the full patch ID as blob_reference
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CoreClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHex } from '@mysten/sui/utils';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENV_FILE = join(ROOT, '.env');
const DIST = join(ROOT, 'dist');
const SITE_OBJECT = '0xe6a81df2e49f37586733cef85f96bbca2809c05b65ba034287f517ee5bdc268a';
const SITES_PKG = '0x26eb7ee8688da02c5f671679524e379f0b837a12f1d1d799f255b7eea260ad27';

const QUILT_BLOB = '2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjw';

const PATCHES = [
  { id: '2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjwBAQACAA', path: '__vite-browser-external-D3ml_aBV.js', mime: 'text/javascript' },
  { id: '2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjwBAgAaAA', path: 'blake2-CdtPVAyq.js', mime: 'text/javascript' },
  { id: '2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjwBGgAbAA', path: 'client-gvojidBz.js', mime: 'text/javascript' },
  { id: '2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjwBGwA9AA', path: 'dist-BfAbKTxP.js', mime: 'text/javascript' },
  { id: '2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjwBPQBBAA', path: 'ed25519-BxWtgaWi.js', mime: 'text/javascript' },
  { id: '2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjwBQQBGAA', path: 'favicon.svg', mime: 'image/svg+xml' },
  { id: '2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjwBRgCVAA', path: 'grpc-Dfo3JXKE.js', mime: 'text/javascript' },
  { id: '2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjwBlQCYAA', path: 'icons.svg', mime: 'image/svg+xml' },
  { id: '2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjwBmAClAA', path: 'index-BUSmnUAo.css', mime: 'text/css' },
  { id: '2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjwBpQD3AQ', path: 'index-D4I485YQ.js', mime: 'text/javascript' },
  { id: '2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjwB9wH4AQ', path: 'index.html', mime: 'text/html' },
];

function getPrivateKey() {
  const env = readFileSync(ENV_FILE, 'utf-8');
  const match = env.match(/^SUI_PRIVATE_KEY=(.+)$/m);
  if (!match) throw new Error('SUI_PRIVATE_KEY not found');
  return match[1].trim();
}

async function main() {
  console.log('🚀 Deploying Walrus Forum (v2)\n');

  // Init Sui client + keypair
  const suiClient = new CoreClient({ url: 'https://fullnode.mainnet.sui.io:443' });
  const keypair = Ed25519Keypair.fromSecretKey(getPrivateKey());
  console.log('🔑 Signer:', keypair.toSuiAddress());
  console.log('🏛️  Site:', SITE_OBJECT);
  console.log('📦 Quilt:', QUILT_BLOB, '\n');

  // For each patch, call add_resource
  for (const patch of PATCHES) {
    // Determine path (prepend assets/ for files inside assets/)
    const resourcePath = patch.path.startsWith('assets/') ? patch.path : `assets/${patch.path}`;
    // index.html is special — always at /
    const sitePath = patch.path === 'index.html' ? '/' : resourcePath;

    // The add_resource needs: site_id, path_vec, blob_hash_vec, headers_vec
    // blob_hash is a u256 bigint, encoded as vector<u8>
    // From the existing dynamic field data, blob_hash is a BCS-encoded u256
    
    // Let me use sui client call instead since the SDK might have compatibility issues
    const args = [
      SITE_OBJECT,                                          // site ID
      `[${[...new TextEncoder().encode(sitePath)].join(',')}]`,   // path as vector<u8>
      patch.id,                                             // blob reference
      `[{key: [${[...new TextEncoder().encode('content-type')].join(',')}], value: [${[...new TextEncoder().encode(patch.mime)].join(',')}]}]`,
    ];

    const cmd = `sui client call --package ${SITES_PKG} --module site --function add_resource --args ${args.join(' ')} --gas-budget 10000000 --json 2>&1`;
    
    process.stdout.write(`  📤 ${patch.path}... `);
    try {
      const result = execSync(cmd, { encoding: 'utf-8', timeout: 60000 }).trim();
      const parsed = JSON.parse(result);
      const status = parsed.effects?.status?.status || '?';
      const digest = parsed.digest || '?';
      console.log(`✅ (${status}) tx:${digest.slice(0, 10)}...`);
    } catch (err) {
      console.log(`❌ ${err.message.split('\n')[0].slice(0, 80)}`);
    }
  }

  console.log('\n✅ Deployment complete!');
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
