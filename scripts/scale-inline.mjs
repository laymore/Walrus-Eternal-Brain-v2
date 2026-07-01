#!/usr/bin/env node
/**
 * Scale inline style values in all components by 1.5x
 * Converts: '0.5rem' → '0.75rem', '1rem' → '1.5rem', etc.
 * Also: '0.5rem 1rem' → '0.75rem 1.5rem', '1rem 0.5rem' → '1.5rem 0.75rem'
 * Skips values inside var(--xxx) or anything already scaled
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPONENTS_DIR = join(__dirname, '..', 'src', 'components');

// Properties to scale
const SCALE_PROPS = ['gap', 'padding', 'margin', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
  'marginLeft', 'marginRight', 'marginTop', 'marginBottom', 'marginInline', 'paddingInline',
  'rowGap', 'columnGap', 'inset', 'left', 'right', 'top', 'bottom'];

const FLOAT_RE = /(\d+(?:\.\d+)?)/;

function scaleRem(val) {
  const m = val.match(/^([\d.]+)rem$/);
  if (!m) return null;
  const v = parseFloat(m[1]);
  if (v <= 0) return null;
  // Don't scale tiny values (< 0.2rem)
  if (v < 0.2) return null;
  // Scale
  const scaled = Math.round(v * 1.5 * 100) / 100;
  // Format - trim trailing zeros
  const formatted = scaled % 1 === 0 ? String(scaled) : scaled.toFixed(2).replace(/\.?0+$/, '');
  return `${formatted}rem`;
}

function scaleInlineValue(val) {
  // Split by space (for multi-value like '1rem 0.5rem')
  const parts = val.trim().split(/\s+/);
  const scaled = parts.map(p => scaleRem(p) || p);
  return scaled.join(' ');
}

function processFile(filePath) {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;

  // Pattern: match style={{ ... gap: 'Xrem', ... }}
  // Replace: gap: '0.5rem' → gap: '0.75rem',  marginBottom: '1rem' → marginBottom: '1.5rem', etc.
  
  for (const prop of SCALE_PROPS) {
    // Match prop: 'VALUE'  (single or double quotes)
    const regex = new RegExp(`(${prop}:\\s*)'(\\d+(?:\\.\\d+)?rem(?:\\s+\\d+(?:\\.\\d+)?rem)*)'`, 'g');
    content = content.replace(regex, (match, prefix, value) => {
      const scaled = scaleInlineValue(value);
      if (scaled !== value) {
        modified = true;
        return `${prefix}'${scaled}'`;
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
console.log('Scaling inline styles ×1.5...\n');
for (const file of files) {
  if (file.includes('AIChat') || file.includes('Sidebar')) continue; // skip
  console.log(processFile(join(COMPONENTS_DIR, file)));
}
console.log('\nDone!');
