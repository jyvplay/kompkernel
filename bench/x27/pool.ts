/**
 * X27 probe 8: is the glyph POOL the binding constraint?
 *
 * chiron.ts draws glyphs from one script's one-token codepoints
 * (`scriptPool`), so the number of rules a wire can hold is capped by that
 * pool. If the cap binds, the parent stops adding profitable rules long before
 * the text runs out of repetition -- and the fix is not a better search but a
 * bigger alphabet. Measure rules-in-use against pool size per lane, and measure
 * the pool of every available script.
 */
import fs from 'node:fs';
import { symplokeEncode } from '@/lib/omega/symploke';
import { chironParseTape, CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

console.log('=== available scripts and their one-token pool sizes ===');
let total = 0;
for (const sc of CHIRON_SCRIPTS as any[]) {
  const spans = sc.ranges ?? [[sc.lo, sc.hi]];
  let n = 0;
  for (const [a, b] of spans) for (let cp = a; cp < b; cp++) if (T(String.fromCodePoint(cp)) === 1) n++;
  total += n;
  console.log('  ', String(sc.label ?? sc.name).padEnd(14), 'pool', String(n).padStart(4), '| ranges', JSON.stringify(spans));
}
console.log('  TOTAL across all scripts:', total);

console.log('\n=== rules in use vs pool ===');
for (const f of (process.env.F || '').split(',').filter(Boolean)) {
  const text = fs.readFileSync(f, 'utf8');
  const r = symplokeEncode(text, enc);
  if (!r.wire.startsWith(CHIRON_START)) { console.log('  ', f.split('/').pop(), 'no tape'); continue; }
  const cut = r.wire.indexOf(CHIRON_SEP, CHIRON_START.length);
  const tape = r.wire.slice(CHIRON_START.length, cut);
  const sc = scriptOfChar(tape[0])!;
  const rules = chironParseTape(tape, sc)!;
  const payload = new Set(text);
  const spans = (sc as any).ranges ?? [[(sc as any).lo, (sc as any).hi]];
  let avail = 0;
  for (const [a, b] of spans) for (let cp = a; cp < b; cp++) { const ch = String.fromCodePoint(cp); if (!payload.has(ch) && T(ch) === 1) avail++; }
  const pct = (100 * rules.length / avail).toFixed(0);
  console.log('  ', f.split('/').pop()!.padEnd(38), 'rules', String(rules.length).padStart(4),
    '| pool available', String(avail).padStart(4), '| used', pct.padStart(3) + '%',
    rules.length >= avail ? '  <== SATURATED' : '');
}
