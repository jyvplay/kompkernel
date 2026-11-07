/** X79 — bullets/ordered through the FRONTIER (pre-frontier transform, two arms). */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const bullets = (S: string) => {
  const lines = S.split('\n');
  let k = 0; const marks = new Set<string>();
  for (const l of lines) { const m = l.match(/^(\s*)([-*•])\s+/); if (m) { k++; marks.add(m[2]); } }
  if (k < 4 || marks.size !== 1) return null;
  const mk = [...marks][0];
  const out = lines.map((l) => l.replace(/^(\s*)([-*•])\s+/, (_x, sp) => sp)).join('\n');
  return { out, contract: `§BULLET every listed line starts with "${mk} "`, n: k };
};
const ordered = (S: string) => {
  const re = /^(\s*)(\d+)([.)])\s+/gm; const nums: number[] = [];
  let m: RegExpExecArray | null; re.lastIndex = 0;
  while ((m = re.exec(S)) !== null) nums.push(Number(m[2]));
  if (nums.length < 4) return null;
  const start = nums[0];
  for (let i = 0; i < nums.length; i++) if (nums[i] !== start + i) return null;
  const out = S.replace(re, (_x, sp) => sp);
  return { out, contract: `§NUMBER lines numbered from ${start}`, n: nums.length };
};
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const id: any = tagstackFrontier(S, enc);
  let bestD = 0, bestName = '', bestMsg = '';
  for (const [name, f] of [['bullets', bullets], ['ordered', ordered]] as any) {
    const r = f(S); if (!r) continue;
    // arm A: contract inside the frontier input
    const a: any = tagstackFrontier(r.contract + '\n' + r.out, enc);
    // arm B: contract outside the wire
    const b: any = tagstackFrontier(r.out, enc);
    const bTok = T(r.contract + '\n' + b.message, enc);
    const tok = Math.min(a.messageTokens, bTok);
    const d = tok - id.messageTokens;
    if (d < bestD) { bestD = d; bestName = name; bestMsg = `${name}(${r.n})`; }
  }
  rows.push({ path: p, F: id.messageTokens, d: bestD, name: bestName });
  console.log(`${p.split('/').pop()!.padEnd(28)} F ${String(id.messageTokens).padStart(5)}  best ${bestMsg.padEnd(14)} ${bestD < 0 ? String(bestD) : bestD === 0 ? '0 (no fire)' : `+${bestD}`}`);
  fs.writeFileSync('bench/x79/receipts/bfront.json', JSON.stringify(rows, null, 1) + '\n');
}
console.log(`\nTOTAL ${rows.reduce((a, r) => a + r.d, 0)} over ${rows.length} lanes`);
