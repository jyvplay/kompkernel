import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const lines = text.split('\n');
  const hdr = lines.filter(l => /^@@ -\d+(,\d+)? \+\d+(,\d+)? @@/.test(l));
  const hdrTok = countTokens(hdr.join('\n'), enc);
  const total = countTokens(text, enc);
  // derivable parts: the ",count" of old and new side (the start of new side is derivable from cumulative delta)
  const counts = hdr.map(l => l.match(/^@@ -\d+(,\d+)? \+\d+(,\d+)? @@/)![0]);
  const cntOnly = countTokens(hdr.map(h => h.replace(/^@@ -(\d+)(,\d+)? \+(\d+)(,\d+)? @@.*/, (_m, a, b, c, d) => `${b ?? ''}${d ?? ''}`)).join('\n'), enc);
  console.log(JSON.stringify({ f, total, hunks: hdr.length, hdrTok, hdrShare: +(100 * hdrTok / total).toFixed(2), countTok: cntOnly, countShare: +(100 * cntOnly / total).toFixed(2) }));
}
