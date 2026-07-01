#!/usr/bin/env node
/**
 * Update SuiNS chats.sui walrus_site_id
 * Uses Sui CLI directly (the simple approach)
 */
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const NEW_SITE_ID = '0x19316f2a859e0d3993efce3afe2e24b820ed078fc13329671a568c6984846d53';
const NFT_ID = '0xe79ef076b6509dff4aefb1ab18e0600f8a1abb6bbf030ba344fc2b1fc8efc0e5';

// V2 SuiNS package
const SUINS_PKG = '0x71af035413ed499710980ed8adb010bbf2cc5cacf4ab37c7710a4bb87eb58ba5';
const SUINS_OBJECT = '0x6e0ddefc0ad98889c04bab9639e512c21766c5e6366f89e696956d9be6952871';
const CLOCK = '0x6';

function run(cmd) {
  console.log(`  $ ${cmd}`);
  try {
    const out = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
    return out.trim();
  } catch (e) {
    console.log(`  ❌ ${e.stderr?.slice(0, 300) || e.message}`);
    return null;
  }
}

async function main() {
  console.log('🔗 Setting chats.sui walrus_site_id →', NEW_SITE_ID, '\n');

  console.log('📋 NFT:', NFT_ID);
  console.log('📦 Package:', SUINS_PKG);
  console.log();

  // Try the V2 package first (controller::set_user_data)
  console.log('🚀 Testing controller::set_user_data...');
  const dryResult = run(`sui client call --dry-run --package ${SUINS_PKG} --module controller --function set_user_data --args ${SUINS_OBJECT} ${NFT_ID} "walrus_site_id" "${NEW_SITE_ID}" ${CLOCK} --gas-budget 10000000 --json 2>&1`);
  
  if (dryResult) {
    try {
      const parsed = JSON.parse(dryResult);
      if (parsed.effects?.status?.status === 'success') {
        console.log('  ✅ Dry run passed! Executing for real...\n');
        
        const realResult = run(`sui client call --package ${SUINS_PKG} --module controller --function set_user_data --args ${SUINS_OBJECT} ${NFT_ID} "walrus_site_id" "${NEW_SITE_ID}" ${CLOCK} --gas-budget 20000000 --json 2>&1`);
        
        if (realResult) {
          console.log('\n✅ Result:', realResult.slice(0, 500));
          const parsed2 = JSON.parse(realResult);
          if (parsed2.digest) {
            console.log('\n✅ SUCCESS! Digest:', parsed2.digest);
            console.log(`  🔄 chats.sui → ${NEW_SITE_ID}`);
            return;
          }
        }
      } else {
        console.log('  ❌ Dry run failed:', JSON.stringify(parsed.effects?.status));
      }
    } catch (e) {
      console.log('  ❌ Parse error:', e.message);
      console.log('  Raw:', dryResult.slice(0, 300));
    }
  }
  
  // Try V1 package as fallback
  console.log('\n🚀 Trying V1 package (0xd22b...)...');
  const SUINS_PKG_V1 = '0xd22b24490e0bae52676651b4f56660a5ff8022a2576e0089f79b3c88d44e08f0';
  const dryResult2 = run(`sui client call --dry-run --package ${SUINS_PKG_V1} --module controller --function set_user_data --args ${SUINS_OBJECT} ${NFT_ID} "walrus_site_id" "${NEW_SITE_ID}" ${CLOCK} --gas-budget 10000000 --json 2>&1`);
  
  if (dryResult2) {
    try {
      const parsed = JSON.parse(dryResult2);
      if (parsed.effects?.status?.status === 'success') {
        console.log('  ✅ Dry run passed (V1)! Executing...\n');
        const realResult = run(`sui client call --package ${SUINS_PKG_V1} --module controller --function set_user_data --args ${SUINS_OBJECT} ${NFT_ID} "walrus_site_id" "${NEW_SITE_ID}" ${CLOCK} --gas-budget 20000000 --json 2>&1`);
        if (realResult) {
          console.log('\n✅ Digest:', JSON.parse(realResult).digest);
          console.log(`  🔄 chats.sui → ${NEW_SITE_ID}`);
          return;
        }
      } else {
        console.log('  ❌ V1 failed:', JSON.stringify(parsed.effects?.status));
      }
    } catch (e) { 
      console.log('  Parse error:', e.message);
    }
  }
  
  console.log('\n❌ All attempts failed.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
