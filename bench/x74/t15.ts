import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { STOICHEION_KEY, stoicheionEncode } from '../../src/lib/omega/stoicheion';
const enc: any = 'o200k_base';
console.log('KEY tokens', T(STOICHEION_KEY, enc));
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json','utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r = stoicheionEncode(t, enc);
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(T(t,enc)).padStart(4)} frontier ${String(F.get(p)).padStart(4)} | stoich ${String(r.messageTokens).padStart(4)} applied ${r.applied} exact ${r.exact} ${r.applied ? `d ${r.messageTokens - (F.get(p) ?? 0)} key ${r.contractTokens} body ${r.messageTokens - r.contractTokens}` : r.notes.slice(0,80)}`);
}
