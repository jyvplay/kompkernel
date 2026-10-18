import fs from 'node:fs';
import { metathesisEncode, metathesisDecode } from '@/lib/omega/metathesis';
import { chironDecode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const lanes = fs.readFileSync('bench/x21/lanes.txt', 'utf8').trim().split('\n');
const only = process.env.IDX ? process.env.IDX.split(',').map(Number) : null;
const AETOS: Record<string, number> = JSON.parse(fs.readFileSync('bench/x25/aetos_frontier.json', 'utf8'));
const SYM: Record<string, number> = JSON.parse(fs.readFileSync('bench/x25/symploke_frontier.json', 'utf8'));
const out = 'bench/x27/metathesis.jsonl';
for (let i = 0; i < lanes.length; i++) {
  if (only && !only.includes(i)) continue;
  const f = lanes[i];
  const t = fs.readFileSync(f, 'utf8');
  let r: any;
  try { r = metathesisEncode(t, enc); } catch (e) { console.log(i, 'ERR', String(e).slice(0, 90)); continue; }
  const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
  let ok = false;
  try { ok = metathesisDecode(r.wire, { stats: r.stats, order: r.order, undo }) === t; } catch { /* noop */ }
  const a = AETOS[f.split('/').pop()!];
  const s = SYM[f.split('/').pop()!];
  fs.appendFileSync(out, JSON.stringify({
    lane: f, base: r.inTokens, metathesis: r.messageTokens, symploke: s, aetos: a,
    wireTok: r.wireTokens, parentWireTok: r.parentWireTokens,
    parent: r.parent, order: r.order, shapes: r.shapes, rules: r.rules,
    exact: ok, delta: s ? r.messageTokens - s : null, contract: r.contract,
  }) + '\n');
  console.log(String(i).padStart(2), f.split('/').pop()!.padEnd(40),
    'in', String(r.inTokens).padStart(5), 'symploke', String(s ?? '?').padStart(5),
    'metath', String(r.messageTokens).padStart(5), 'delta', String(s ? r.messageTokens - s : '?').padStart(4),
    'rules', String(r.rules).padStart(4), 'exact', ok);
}
console.log('DONE');
