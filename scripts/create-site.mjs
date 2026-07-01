#!/usr/bin/env node
// Run Sui CLI PTB to create a Walrus Site — bypass PowerShell escaping

import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SITES_PKG = '0x26eb7ee8688da02c5f671679524e379f0b837a12f1d1d799f255b7eea260ad27';
const DEV_WALLET = '0xfbf73b2f72858a4dbbcb4b942985bd46f410e7210fe01f8340f91946faec115f';

function runSui(args, timeout = 60000) {
  console.log('→ sui', args.join(' ').slice(0, 150));
  const r = spawnSync('sui', args, { encoding: 'utf-8', timeout, maxBuffer: 10*1024*1024 });
  if (r.error) {
    console.error('  ❌', r.error.message);
    return null;
  }
  if (r.stderr) console.error('  stderr:', r.stderr.slice(0, 300));
  return r.stdout;
}

async function main() {
  console.log('🚀 Creating Walrus Site\n');

  // Dry run first
  const args = [
    'client', 'ptb',
    '--move-call', '0x1::option::none', '<0x1::string::String>', '--assign', 'none_opt',
    '--assign', 'link', 'none_opt',
    '--assign', 'img', 'none_opt',
    '--assign', 'desc', 'none_opt',
    '--assign', 'proj', 'none_opt',
    '--assign', 'creator', 'none_opt',
    '--move-call', `${SITES_PKG}::metadata::new_metadata`, 'link', 'img', 'desc', 'proj', 'creator',
    '--assign', 'meta',
    '--move-call', `${SITES_PKG}::site::new_site`, '"Walrus Forum"', 'meta',
    '--assign', 'site',
    '--transfer-objects', '[site]', `@${DEV_WALLET}`,
    '--gas-budget', '100000000',
    '--dry-run',
    '--json',
  ];

  const output = runSui(args);
  if (!output) return;

  // Parse result
  try {
    const parsed = JSON.parse(output);
    console.log('Dry run:', parsed.effects?.status?.status || 'unknown');
    
    if (parsed.effects?.status?.status === 'success') {
      console.log('\n✅ Dry run OK! Executing for real...\n');
      
      // Remove --dry-run and execute  
      const execArgs = args.filter(a => a !== '--dry-run');
      // Add --json flag back (it was last)
      if (!execArgs.includes('--json')) execArgs.push('--json');
      const execOutput = runSui(execArgs, 120000);
      
      if (execOutput) {
        try {
          const execParsed = JSON.parse(execOutput);
          console.log('Digest:', execParsed.digest);
        
        } catch (parseErr) {
          // Output may have ANSI codes, search for digest/site ID in raw text
          console.log('Raw output:', execOutput.slice(0, 2000));
          const siteMatch = execOutput.match(/0x[a-fA-F0-9]{64}/g);
          if (siteMatch) console.log('Found IDs:', siteMatch);
        }
        
        // Find site object
        let created = [];
        try { created = JSON.parse(execOutput).effects?.created || []; } catch {}
        for (const c of created) {
          const owner = c.owner;
          const isOurs = typeof owner === 'string' ? owner.includes(DEV_WALLET.slice(2)) 
                        : owner?.AddressOwner === DEV_WALLET;
          if (isOurs) {
            const siteId = c.reference?.objectId;
            console.log(`\n🎉 Site Object ID: ${siteId}`);
            console.log(`🌐 https://${siteId}.wal.app`);
            
            // Update .env
            const envFile = join(ROOT, '.env');
            let env = readFileSync(envFile, 'utf-8');
            if (env.includes('VITE_SITE_OBJECT_ID=')) {
              env = env.replace(/^VITE_SITE_OBJECT_ID=.*$/m, `VITE_SITE_OBJECT_ID=${siteId}`);
            } else {
              env += `\nVITE_SITE_OBJECT_ID=${siteId}`;
            }
            writeFileSync(envFile, env);
            console.log('📝 Updated .env');
          }
        }
      }
    } else {
      console.log('❌ Dry run failed:', JSON.stringify(parsed.effects?.status));
    }
  } catch (e) {
    console.log('Parse error:', e.message);
    console.log('Raw:', output.slice(0, 500));
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
