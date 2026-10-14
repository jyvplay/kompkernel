// upper-bound probe: frontier M on a path list vs on the same list rewritten as nested brace groups (bash convention).
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
const f = process.argv[2];
const lines = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean);
const paths = lines.map(l => l.trim().split(/\s+/).pop()!);
// group consecutive paths with the same first segment (directory), then within group same second segment, one level per call (greedy, order-preserving)
function brace(ps: string[], depth = 0): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < ps.length) {
    const seg = ps[i].split('/');
    if (seg.length < 2) { out.push(ps[i]); i++; continue; }
    const head = seg[0];
    let j = i;
    while (j < ps.length && ps[j].split('/')[0] === head && ps[j].includes('/')) j++;
    if (j - i < 2) { out.push(ps[i]); i++; continue; }
    const rest = ps.slice(i, j).map(p => p.slice(head.length + 1));
    out.push(head + '/{' + brace(rest, depth + 1).join(',') + '}');
    i = j;
  }
  return out;
}
const bt = brace(paths).join('\n');
const plain = paths.join('\n');
const dp = daedalusEncode(plain, enc, {});
const db = daedalusEncode(bt, enc, {});
console.log(JSON.stringify({ f, paths: paths.length, rawPlain: countTokens(plain, enc), M_plain: dp.messageTokens, rawBrace: countTokens(bt, enc), M_brace: db.messageTokens, exactBrace: db.decoded === bt, delta: db.messageTokens - dp.messageTokens }));
console.log(bt.slice(0, 400));
