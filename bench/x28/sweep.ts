import fs from 'node:fs';
import { syntomosEncode, syntomosDecode } from '@/lib/omega/syntomos';
import { chironDecode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const lanes = fs.readFileSync('bench/x21/lanes.txt', 'utf8').trim().split('\n');
const only = process.env.IDX ? process.env.IDX.split(',').map(Number) : null;
const SYM: Record<string, number> = JSON.parse(fs.readFileSync('bench/x25/symploke_frontier.json', 'utf8'));
const out = 'bench/x28/syntomos.jsonl';
for (let i = 0; i < lanes.length; i++) {
  if (only && !only.includes(i)) continue;
  const f = lanes[i];
  const t = fs.readFileSync(f, 'utf8');
  let r: any;
  try { r = syntomosEncode(t, enc); } catch (e) { console.log(i, 'ERR', String(e).slice(0, 90)); continue; }
  const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
  let ok = false;
  try { ok = syntomosDecode(r.wire, { stats: r.stats, order: r.order, undo }) === t; } catch { /* noop */ }
  const s = SYM[f.split('/').pop()!];
  const m = r.metathesisMessageTokens;
  fs.appendFileSync(out, JSON.stringify({
    lane: f, base: r.inTokens, syntomos: r.messageTokens, metathesis: m, symploke: s,
    rules: r.rules, nested: r.nested, denested: r.denested, rung: r.rung,
    contractTok: T(r.contract), wireTok: r.wireTokens, exact: ok,
    delta: r.messageTokens - m, contract: r.contract,
  }) + '\n');
  console.log(String(i).padStart(2), f.split('/').pop()!.padEnd(40),
    'in', String(r.inTokens).padStart(5), 'metath', String(m).padStart(5),
    'syntomos', String(r.messageTokens).padStart(5), 'delta', String(r.messageTokens - m).padStart(4),
    'nested', String(r.nested).padStart(4), 'denest', r.denested ? 'Y' : '.', 'exact', ok);
}
console.log('DONE');
