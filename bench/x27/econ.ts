/**
 * X27 probe 6: the true per-rule body economics, with real token strings.
 *
 * diag.ts reported that deleting the rule `a -> " a"` costs 15 tokens across 17
 * occurrences (0.88 each), which is impossible if both the glyph and " a" cost
 * one token each. Something in the accounting is not what it looks like. Before
 * designing a mechanism on top of these numbers, print the actual tokens.
 */
import fs from 'node:fs';
import { symplokeEncode } from '@/lib/omega/symploke';
import { chironParseTape, CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens, tokenStrings } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

const f = process.env.F!;
const text = fs.readFileSync(f, 'utf8');
const r = symplokeEncode(text, enc);
const cut = r.wire.indexOf(CHIRON_SEP, CHIRON_START.length);
const tape = r.wire.slice(CHIRON_START.length, cut);
const body = r.wire.slice(cut + CHIRON_SEP.length);
const rules = chironParseTape(tape, scriptOfChar(tape[0])!)!;

console.log('T(body) with glyphs =', T(body));
console.log('\nrule   n    T(body)   T(body with raw restored)   bodyDelta   per-occ   tapeDelta   NET');
for (const ru of rules.slice(0, 30)) {
  const n = body.split(ru.glyph).length - 1;
  if (!n) continue;
  const restored = body.split(ru.glyph).join(ru.raw);
  const bodyDelta = T(restored) - T(body);
  const tapeDelta = T(tape) - T(tape.split(ru.glyph + ru.raw).join(''));
  console.log(`  ${ru.glyph}  ${String(n).padStart(3)}   ${String(T(body)).padStart(6)}      ${String(T(restored)).padStart(6)}              ${String(bodyDelta).padStart(6)}   ${(bodyDelta / n).toFixed(2).padStart(6)}   ${String(tapeDelta).padStart(6)}   ${String(bodyDelta - tapeDelta).padStart(5)}  ${JSON.stringify(ru.raw.slice(0, 24))}`);
}

// What do the tokens actually look like around a glyph?
const probe = rules.find((x) => x.raw === ' the') ?? rules[0];
const at = body.indexOf(probe.glyph);
const lo = Math.max(0, at - 22), hi = Math.min(body.length, at + 22);
console.log(`\ncontext around glyph ${probe.glyph} (raw ${JSON.stringify(probe.raw)}):`);
console.log('  with glyph   :', JSON.stringify(body.slice(lo, hi)));
console.log('  tokens       :', JSON.stringify(tokenStrings(body.slice(lo, hi), enc)));
const rest = body.slice(lo, hi).split(probe.glyph).join(probe.raw);
console.log('  restored     :', JSON.stringify(rest));
console.log('  tokens       :', JSON.stringify(tokenStrings(rest, enc)));
console.log('  glyph alone T =', T(probe.glyph), ' raw alone T =', T(probe.raw));
