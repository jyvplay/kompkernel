/**
 * X27 probe 2: is the pruner's model even sound?
 *
 * prune.ts removed zero rules, which contradicts the arithmetic. Before
 * trusting either, verify the plumbing: parsing the tape and rebuilding the
 * wire must be the identity, and the per-rule marginal cost must be MEASURED
 * per rule rather than taken from the corpus-wide 0.801 average, which can hide
 * a rule whose glyph is cheap in context but expensive to define.
 */
import fs from 'node:fs';
import { symplokeEncode } from '@/lib/omega/symploke';
import { chironParseTape, CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

const f = process.env.F!;
const t = fs.readFileSync(f, 'utf8');
const r = symplokeEncode(t, enc);
const wire = r.wire;
const cut = wire.indexOf(CHIRON_SEP, CHIRON_START.length);
const tape = wire.slice(CHIRON_START.length, cut);
const body = wire.slice(cut + CHIRON_SEP.length);
const sc = scriptOfChar(tape[0])!;
const rules = chironParseTape(tape, sc)!;

const rebuilt = CHIRON_START + rules.map((x) => x.glyph + x.raw).join('') + CHIRON_SEP + body;
console.log('tape rebuild identical:', rebuilt === wire);
console.log('wire tokens', T(wire), '| tape', T(tape), '| body', T(body));
console.log('rules', rules.length);

// MEASURED marginal cost per rule: rebuild with the rule deleted, substituting
// its glyph by its raw everywhere, and compare. No model, no average.
console.log('\n  g  n   |raw|  tapePiece  bodyDelta   NET   verdict');
let sumNet = 0;
const rows: any[] = [];
for (let k = 0; k < rules.length; k++) {
  const { glyph, raw } = rules[k];
  const n = body.split(glyph).length - 1;
  const sub = (s: string) => s.split(glyph).join(raw);
  const nr = rules.filter((_, i) => i !== k).map((x) => ({ glyph: x.glyph, raw: sub(x.raw) }));
  const nb = sub(body);
  const nw = CHIRON_START + nr.map((x) => x.glyph + x.raw).join('') + CHIRON_SEP + nb;
  const net = T(wire) - T(nw);   // POSITIVE = deleting this rule SAVES tokens
  rows.push({ glyph, n, raw, net, tapePiece: T(glyph + raw) });
  sumNet += net;
}
rows.sort((a, b) => b.net - a.net);
for (const x of rows) {
  console.log(`  ${x.glyph}  ${String(x.n).padStart(3)}  ${String(T(x.raw)).padStart(3)}     ${String(x.tapePiece).padStart(3)}       ${String(x.net).padStart(6)}   ${x.net > 0 ? 'DELETE' : 'keep  '}  ${JSON.stringify(x.raw.slice(0, 40))}`);
}
const pos = rows.filter((x) => x.net > 0);
console.log(`\nrules whose deletion HELPS: ${pos.length} / ${rows.length}, total benefit ${pos.reduce((s, x) => s + x.net, 0)}`);
console.log(`measured marginal glyph cost (corpus-wide estimate was 0.801):`);
const totOcc = rows.reduce((s, x) => s + x.n, 0);
console.log(`  occurrences ${totOcc}`);
