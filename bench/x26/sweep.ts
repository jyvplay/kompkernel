import fs from 'node:fs';
import { symplokeEncode, symplokeDecode } from '@/lib/omega/symploke';
import { chironDecode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const lanes = fs.readFileSync('bench/x21/lanes.txt', 'utf8').trim().split('\n');
const only = process.env.IDX ? process.env.IDX.split(',').map(Number) : null;
const AETOS: Record<string, number> = JSON.parse(fs.readFileSync('bench/x25/aetos_frontier.json', 'utf8'));

const out = 'bench/x26/symploke.jsonl';
for (let i = 0; i < lanes.length; i++) {
  if (only && !only.includes(i)) continue;
  const f = lanes[i];
  const t = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  let r: any;
  try { r = symplokeEncode(t, enc); } catch (e) { console.log(i, 'ERR', String(e).slice(0, 80)); continue; }
  const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
  let ok = false;
  try { ok = symplokeDecode(r.wire, { stats: r.stats, order: r.order, undo }) === t; } catch { /* noop */ }
  const a = AETOS[f.split('/').pop()!];
  const line = JSON.stringify({
    lane: f, base: r.inTokens, symploke: r.messageTokens, wireTok: T(r.wire),
    contractTok: r.messageTokens - T(r.wire), parent: r.parent, order: r.order,
    shapes: r.shapes, exact: ok, aetos: a, delta: a ? r.messageTokens - a : null,
    ms: Date.now() - t0, contract: r.contract,
  });
  fs.appendFileSync(out, line + '\n');
  console.log(String(i).padStart(2), f.split('/').pop()!.padEnd(40),
    'in', String(r.inTokens).padStart(5), 'symploke', String(r.messageTokens).padStart(5),
    'aetos', String(a ?? '?').padStart(5), 'delta', String(a ? r.messageTokens - a : '?').padStart(5),
    'exact', ok, (r.parent + '/' + r.order).padEnd(16), (r.shapes.join(' ') || '-').slice(0, 40));
}
console.log('DONE');
