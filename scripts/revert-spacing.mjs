#!/usr/bin/env node
/**
 * Revert inline style spacing: divide by 1.5 (scale 0.666...)
 * Undoes the previous scale-inline.mjs changes
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = join(__dirname, '..', 'src', 'components');

const SCALE_PROPS = ['gap', 'padding', 'margin', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
  'marginLeft', 'marginRight', 'marginTop', 'marginBottom', 'marginInline', 'paddingInline',
  'rowGap', 'columnGap', 'inset', 'left', 'right', 'top', 'bottom'];

function revertRem(val) {
  const m = val.match(/^([\d.]+)rem$/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (v <= 0) return null;
  if (v < 0.3) return null;
  // Divide by 1.5
  const reverted = Math.round(v / 1.5 * 100) / 100;
  const formatted = reverted % 1 === 0 ? String(reverted) : reverted.toFixed(2).replace(/\.?0+$/, '');
  return `${formatted}rem`;
}

function revertInlineValue(val) {
  const parts = val.trim().split(/\s+/);
  const reverted = parts.map(p => revertRem(p) || p);
  return reverted.join(' ');
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;

  for (const prop of SCALE_PROPS) {
    const regex = new RegExp(`(${prop}:\\s*)'(\\d+(?:\\.\\d+)?rem(?:\\s+\\d+(?:\\.\\d+)?rem)*)'`, 'g');
    content = content.replace(regex, (match, prefix, value) => {
      const reverted = revertInlineValue(value);
      if (reverted !== value) {
        modified = true;
        return `${prefix}'${reverted}'`;
      }
      return match;
    });
  }

  if (modified) {
    writeFileSync(filePath, content, 'utf-8');
    return `✅ ${filePath.split('\\').pop()}`;
  }
  return `⏭️ ${filePath.split('\\').pop()} (no changes)`;
}

const files = readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.tsx'));
console.log('Reverting inline spacing (/1.5)...\n');
for (const file of files) {
  console.log(processFile(join(COMPONENTS_DIR, file)));
}
console.log('\nDone!');
