#!/usr/bin/env node
/**
 * Deploy mini-forum-app to Walrus Sites (v3)
 * Uses Sui TransactionBuilder + SuiClient to call sites::add_resource 
 *
 * The key insight: add_resource takes (site: &mut Site, resource: Resource)
 * where Resource is a struct (not separate args), so we need to pass
 * the resource as a BCS-encoded argument.
 *
 * Using the Sui SDK Transaction to properly construct the call.
 */

import { CoreClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENV_FILE = join(ROOT, '.env');

const SITE_OBJ = '0xe6a81df2e49f37586733cef85f96bbca2809c05b65ba034287f517ee5bdc268a';
const SITES_PKG = '0x26eb7ee8688da02c5f671679524e379f0b837a12f1d1d799f255b7eea260ad27';
const RPC = 'https://fullnode.mainnet.sui.io:443';

function getSK() {
  const env = readFileSync(ENV_FILE, 'utf-8');
  const m = env.match(/^SUI_PRIVATE_KEY=(.+)$/m);
  if (!m) throw new Error('SUI_PRIVATE_KEY not found');
  return m[1].trim();
}

// Get the site's existing resources to understand the exact format  
async function getExistingResources(client) {
  const fields = await client.getDynamicFields({ parentId: SITE_OBJ });
  console.log(`📂 Existing routes: ${fields.data.length}`);
  return fields.data;
}

// Try to first get existing Resource struct info by reading one
async function getResourceSchema(client) {
  // Read site object to find the Resource struct definition
  const norm = await client.getNormalizedMoveStruct({
    package: SITES_PKG,
    module: 'site',
    struct: 'Resource',
  });
  console.log('Resource struct:', JSON.stringify(norm, null, 2));
  return norm;
}

async function main() {
  console.log('🚀 Deploying Walrus Forum (v3)\n');

  const keypair = Ed25519Keypair.fromSecretKey(getSK());
  const client = new CoreClient({ url: RPC });
  console.log('🔑 Signer:', keypair.toSuiAddress());

  // Get the Resource struct schema to understand field layout
  try {
    await getResourceSchema(client);
  } catch (e) {
    console.log('⚠️  Could not get struct schema:', e.message);
  }

  // Get existing resources
  await getExistingResources(client);

  // Now let's try the approach: read the quilt and extract individual blobs
  // then create a Resource + add_resource for each

  // The quilt was stored. The WalrusClient can read individual blobs from it.
  // Each patch has a blob_id (the patch id) and a blob_hash (u256 integer).
  
  // We need to store this info as Resources in the site's dynamic fields.
  // But the add_resource function expects a Resource struct, which is created
  // by the Move module internally — we might not be able to pass it directly.

  // Alternative: use the create_routes function which might take the quilt blob ID
  // and extract resources automatically.

  // Let's check if create_routes exists and what it takes
  console.log('\n📋 Checking available functions...\n');
  
  // Try create_routes with (site, quilt_blob_id)
  const functions = [
    { name: 'create_routes', args: [SITE_OBJ, '2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjw'], desc: 'Create routes from quilt' },
  ];

  for (const fn of functions) {
    process.stdout.write(`  🔍 ${fn.name}... `);
    try {
      // Use devInspect to test the function
      const result = await client.devInspectTransaction({
        sender: keypair.toSuiAddress(),
        transaction: Transaction.from(() => {
          const tx = new Transaction();
          tx.moveCall({
            target: `${SITES_PKG}::site::${fn.name}`,
            arguments: [
              tx.object(SITE_OBJ),
              tx.pure.string('2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjw'),
            ],
          });
          return tx;
        }).build({ client }),
      });
      console.log(`✅ (${result.effects?.status?.status || 'ok'})`);

      if (result.effects?.status?.status === 'success') {
        console.log(`  ✅ ${fn.name} works!`);
        // Now execute it for real
        const tx = new Transaction();
        tx.moveCall({
          target: `${SITES_PKG}::site::${fn.name}`,
          arguments: [
            tx.object(SITE_OBJ),
            tx.pure.string('2CtLxeH5aYmfILBrpat0fN7IEbbtPArcqsEigSjtNjw'),
          ],
        });
        tx.setSender(keypair.toSuiAddress());
        const txBytes = await tx.build({ client });
        const sig = keypair.sign(await client.getSigningIntent(txBytes));
        const execResult = await client.executeTransaction({
          transaction: txBytes,
          signature: sig,
        });
        console.log(`  ✅ Executed! Digest: ${execResult.digest}`);

        // Check if routes were created
        const newFields = await getExistingResources(client);
        if (newFields.length > 0) {
          console.log(`\n🎉 Site updated with ${newFields.length} resources!`);
        }
      }
    } catch (e) {
      console.log(`❌ ${e.message.slice(0, 100)}`);
    }
  }

  console.log('\n✨ Done!');
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
