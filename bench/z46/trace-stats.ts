import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base';
const FRAME = /\bat\s+([\w$.<>\/\[\]\-]+)\.([\w$<>]+)\((\w[\w$\-]*)\.java:(\d+)\)/g;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const files = new Map<string, number>(); let frames = 0, deriv = 0;
  for (const m of t.matchAll(FRAME)) {
    frames++;
    const cls = m[1].split('.').pop()!.split('/').pop()!.split('$')[0];
    if (cls === m[3]) { deriv++; files.set(m[3], (files.get(m[3]) || 0) + 1); }
  }
  let distinctTok = 0; for (const k of files.keys()) distinctTok += countTokens(k + '.java', enc);
  const repeats = deriv - files.size;
  console.log(`${f.split('/').pop()}: frames=${frames} deriv=${deriv} distinct=${files.size} distinctTok=${distinctTok} repeats=${repeats} est=${distinctTok - files.size + repeats}`);
}
