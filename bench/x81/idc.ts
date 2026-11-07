/** census of FIXED-WIDTH-GROUP identifiers: the joining punctuation is pure geometry */
import * as fs from 'node:fs';
const H = '[0-9a-fA-F]';
const P: [string, RegExp][] = [
  ['uuid', new RegExp(`\\b${H}{8}-${H}{4}-${H}{4}-${H}{4}-${H}{12}\\b`, 'g')],
  ['mac', new RegExp(`\\b${H}{2}(?::${H}{2}){5}\\b`, 'g')],
  ['ipv4', /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g],
  ['iso-dt', /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/g],
  ['iso-day', /\d{4}-\d{2}-\d{2}/g],
  ['iso-time', /\b\d{2}:\d{2}:\d{2}\b/g],
  ['hm', /\b\d{2}:\d{2}\b/g],
  ['semver', /\b\d+\.\d+\.\d+\b/g],
  ['sha', /\b[0-9a-f]{40}\b/g],
  ['dotted', /\b\d{1,3}(\.\d{1,3}){3,}\b/g],
];
let tot: Record<string, number> = {};
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const parts: string[] = [];
  for (const [n, re] of P) { const m = S.match(re); if (m) { parts.push(`${n}=${m.length}`); tot[n] = (tot[n] ?? 0) + m.length; } }
  if (parts.length) console.log(p.split('/').pop()!.padEnd(22), parts.join(' '));
}
console.log('TOTALS', JSON.stringify(tot));
