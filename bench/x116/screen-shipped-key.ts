/** X116 raw screen with the SHIPPED ΜΗΚΟΣ key (λ=#bytes after ->.), not the
 * rejected 4-token len key. Composition order: ΕΝΑΛΛΑΓΗ octal then ΜΗΚΟΣ λ.
 * Raw price only; no frontier call. Independent inverse checked per lane. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { enallageRewrite, enallageExpand } from '../../src/lib/omega/enallage';
import { mekosRewrite, mekosExpand, MEKOS_KEY } from '../../src/lib/omega/mekos';

const enc = 'o200k_base' as const;
const T = (s: string) => countTokens(s, enc);
const lanes = fs.readFileSync('bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const rows: any[] = [];
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const oct = enallageRewrite(text);
  const base = oct ? oct.wire : text;
  const len = mekosRewrite(base);
  let best: any = null;
  if (len) {
    const exact = mekosExpand(len.wire) === base && (!oct || enallageExpand(base) === text);
    const wire = MEKOS_KEY + '\n' + len.wire;
    best = { tokens: T(wire), delta: T(wire) - T(text), hits: len.hits, exact, key: MEKOS_KEY, keyTokens: T(MEKOS_KEY) };
    if (!exact) console.log('INEXACT', p);
  }
  rows.push({ path: p, raw: T(text), octRaw: oct ? T(base) : null, best });
  console.log(`${p.split('/').pop()!.padEnd(22)} raw=${T(text)} oct=${oct ? T(base) : '-'} shipped=${best ? `${best.tokens} (${best.delta}) hits=${best.hits} exact=${best.exact}` : 'none'}`);
}
const base = rows.reduce((a, r) => a + r.raw, 0);
const after = rows.reduce((a, r) => a + (r.best ? r.best.tokens : r.raw), 0);
console.log(`TOTAL raw ${base} shipped-key ${after} delta ${after - base}; key=${T(MEKOS_KEY)} tok ${MEKOS_KEY}`);
fs.writeFileSync('bench/x116/receipts/screen-shipped-key.json', JSON.stringify({ schema: 'kompkernel-x116-screen-shipped-key-v1', key: MEKOS_KEY, keyTokens: T(MEKOS_KEY), totals: { base, after, delta: after - base }, rows }, null, 2) + '\n');
