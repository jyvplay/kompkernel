/** Per-lane PROSPHYSIS measurement against the X72/X73 frontier receipt. */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { prosphysisEncode, PROSPHYSIS_KEY } from '../../src/lib/omega/prosphysis';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json','utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r = prosphysisEncode(t, enc);
  const f = F.get(p) ?? r.frontierTokens;
  rows.push({ path: p, raw: T(t, enc), frontier: f, tokens: r.messageTokens, applied: r.applied, key: r.contractTokens, rewritten: r.rewritten, savedChars: r.savedChars, delta: r.applied ? r.messageTokens - f : 0 });
  console.log(`${p.split('/').pop()!.padEnd(18)} raw ${String(T(t,enc)).padStart(5)} frontier ${String(f).padStart(5)} | prosphysis ${String(r.messageTokens).padStart(5)} applied ${r.applied} key ${r.contractTokens} rew ${r.rewritten} savedChars ${r.savedChars} | delta ${r.applied ? r.messageTokens - f : 0}`);
}
fs.writeFileSync('bench/x74/receipts/prosphysis.json', JSON.stringify({ keyTokens: T(PROSPHYSIS_KEY, enc), key: PROSPHYSIS_KEY, rows }, null, 1) + '\n');
