/** X122 — ΣΤΟΙΧΗΔΟΝ unit gates.
 *  G1 identity: no § frame -> message returned byte-identical.
 *  G2 relabelling: the emitted tape holds exactly the same (glyph -> value) PAIRS
 *     as the incumbent, with the glyphs permuted and the order permuted.
 *  G3 decode: chironDecode(incumbent) === chironDecode(emitted), on the real wire.
 *  G4 gate: never emits unless the whole message is strictly smaller.
 *  G5 adversary: a tape with a forward reference must NOT be re-ordered into one
 *     that chironDecode refuses — the parser-backed feasibility test is what
 *     catches this, and a rule-id topological test does not.
 *  G6 kill switch: OMEGA_NO_STOICHEDON=1 returns the parent message untouched.
 *  Run: bash bench/x15/run.sh bench/x122/stoichedon-unit.ts */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode, chironParseTape, CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';
import { stoichedonEncode, stoichedonDisabled } from '../../src/lib/omega/stoichedon';

const enc = 'o200k_base' as const;
let pass = 0, fail = 0;
const ok = (name: string, c: boolean, detail = '') => { if (c) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name} ${detail}`); } };
function scriptOf(cp: number) { for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s; return null; }
function pairs(wire: string) {
  const s0 = wire.indexOf(CHIRON_START), p0 = wire.indexOf(CHIRON_SEP, s0 + 1);
  const tape = wire.slice(s0 + 1, p0);
  const sc = scriptOf(tape.codePointAt(0)!);
  const pr = chironParseTape(tape, sc!)!;
  // A relabelling permutes the glyphs and the order, so the RAW strings change
  // wherever a value references another rule.  What must be identical is the
  // multiset of fully EXPANDED values: same rules, same texts, new names.
  const map = new Map(pr.map((r) => [r.glyph, r.raw]));
  const expand = (s: string, depth = 0): string => {
    if (depth > 64) return s;
    let out = '';
    for (const ch of s) out += map.has(ch) ? expand(map.get(ch)!, depth + 1) : ch;
    return out;
  };
  return pr.map((r) => expand(r.raw)).sort();
}

const msgs: { path: string; message: string }[] = [];
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) msgs.push(JSON.parse(l));
console.log(`lanes: ${msgs.length}`);

console.log('G1/G3/G4 — real frontier messages');
let totalBase = 0, totalAfter = 0, wins = 0;
for (const { path, message } of msgs) {
  const base = countTokens(message, enc);
  const r = stoichedonEncode('', enc, { message, messageTokens: base });
  const after = countTokens(r.message, enc);
  totalBase += base; totalAfter += after;
  const s0 = message.indexOf(CHIRON_START);
  if (s0 < 0) { ok(`${path}: no frame -> identity`, r.message === message && !r.applied); continue; }
  const expA = chironDecode(message.slice(s0));
  const expB = chironDecode(r.message.slice(r.message.indexOf(CHIRON_START)));
  ok(`${path}: expansion preserved`, expA === expB, `${expA.length}/${expB.length}`);
  ok(`${path}: value multiset preserved`, JSON.stringify(pairs(message)) === JSON.stringify(pairs(r.message)));
  ok(`${path}: never worse`, after <= base, `${base} -> ${after}`);
  if (after < base) wins++;
}
console.log(`  totals ${totalBase} -> ${totalAfter} (${totalAfter - totalBase}), lanes improved ${wins}/${msgs.length}`);

console.log('G5 — adversary: a self-reference created by a glyph swap must be refused');
{
  // tape:  A = "ab", B = "XaY"  (B references A).  Swapping the glyphs makes B
  // reference itself; chironDecode must still be able to read whatever we emit.
  const cr = CHIRON_SCRIPTS[2]!; // cyrillic
  const pool: string[] = [];
  const lo = cr.ranges ? cr.ranges[0]![0] : cr.lo, hi = cr.ranges ? cr.ranges[0]![1] : cr.hi;
  for (let cp = lo; cp < Math.min(hi, lo + 300); cp++) { const ch = String.fromCodePoint(cp); if (countTokens(ch, enc) === 1) pool.push(ch); }
  const g1 = pool[0]!, g2 = pool[1]!;
  const body = `Q${g2}${g1}Z${g2}W`;
  const wire = `# contract\n${CHIRON_START}${g1}ab${g2}X${g1}Y${CHIRON_SEP}${body}`;
  const base = countTokens(wire, enc);
  const r = stoichedonEncode('', enc, { message: wire, messageTokens: base });
  const after = countTokens(r.message, enc);
  const okDecode = chironDecode(wire.slice(wire.indexOf(CHIRON_START))) === chironDecode(r.message.slice(r.message.indexOf(CHIRON_START)));
  ok('adversary: decode preserved', okDecode);
  ok('adversary: never worse', after <= base, `${base} -> ${after}`);
  ok('adversary: value multiset preserved', JSON.stringify(pairs(wire)) === JSON.stringify(pairs(r.message)));
}

console.log('G6 — kill switch');
{
  const prev = process.env.OMEGA_NO_STOICHEDON;
  process.env.OMEGA_NO_STOICHEDON = '1';
  const m = msgs.find((x) => x.message.indexOf(CHIRON_START) >= 0)!.message;
  const r = stoichedonEncode('', enc, { message: m, messageTokens: countTokens(m, enc) });
  ok('disabled() true', stoichedonDisabled());
  ok('disabled -> identity', r.message === m && !r.applied);
  if (prev === undefined) delete process.env.OMEGA_NO_STOICHEDON; else process.env.OMEGA_NO_STOICHEDON = prev;
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
