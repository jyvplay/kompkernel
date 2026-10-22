/**
 * X27: tape economics, measured per-rule.
 *
 * X26 closed the wire side with an oracle and a budget sweep, but both of those
 * asked "can we SEARCH better?". Neither asked "what does a rule COST?". For
 * prose the answer decides everything: kb-article is raw 656 = tape 57 +
 * body 553, so the tape eats 57 of the 103 tokens the grammar removes -- 55% of
 * the gain. This probe prices each rule individually so the next mechanism can
 * be aimed at the dominant term instead of guessed at.
 */
import fs from 'node:fs';
import { symplokeEncode } from '@/lib/omega/symploke';
import { chironParseTape, CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

const files = (process.env.F || '').split(',').filter(Boolean);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const r = symplokeEncode(t, enc);
  const wire = r.wire;
  let ntape = 0, nbody = 0, nrules = 0;
  if (wire.startsWith(CHIRON_START)) {
    const cut = wire.indexOf(CHIRON_SEP, CHIRON_START.length);
    const tape = wire.slice(CHIRON_START.length, cut);
    const body = wire.slice(cut + CHIRON_SEP.length);
    ntape = T(tape); nbody = T(body);
    const sc = scriptOfChar(tape[0]);
    const rules = sc ? chironParseTape(tape, sc) : null;
    if (rules) {
      nrules = rules.length;
      // occurrences of each glyph in the body
      const occ = new Map<string, number>();
      for (const ch of body) occ.set(ch, (occ.get(ch) || 0) + 1);
      const rows = rules.map((ru) => {
        const rawTok = T(ru.raw);
        const n = occ.get(ru.glyph) || 0;
        // what the n occurrences would have cost had we never made the rule
        const saved = n * rawTok - n * 0.801 - (rawTok + 1);
        return { g: ru.glyph, rawTok, n, raw: ru.raw, saved };
      });
      rows.sort((a, b) => b.saved - a.saved);
      const tot = rows.reduce((s, x) => s + x.saved, 0);
      const bad = rows.filter((x) => x.saved <= 0);
      console.log(`\n=== ${f.split('/').pop()} ===`);
      console.log(`raw ${r.inTokens} | msg ${r.messageTokens} | wire ${T(wire)} = tape ${ntape} + body ${nbody} | contract ${r.messageTokens - T(wire)}`);
      console.log(`rules ${nrules} | modelled net saving ${tot.toFixed(1)} | rules at or below break-even: ${bad.length}`);
      console.log('  distribution of rule payload length (tokens of raw):');
      const hist = new Map<number, number>();
      for (const x of rows) hist.set(x.rawTok, (hist.get(x.rawTok) || 0) + 1);
      for (const k of [...hist.keys()].sort((a, b) => a - b)) console.log(`    raw=${k} tok : ${hist.get(k)} rules`);
      const oh = new Map<number, number>();
      for (const x of rows) oh.set(x.n, (oh.get(x.n) || 0) + 1);
      console.log('  distribution of occurrence count:');
      for (const k of [...oh.keys()].sort((a, b) => a - b)) console.log(`    n=${k} : ${oh.get(k)} rules`);
      console.log('  top 6 rules by modelled saving:');
      for (const x of rows.slice(0, 6)) console.log(`    ${x.g} n=${String(x.n).padStart(3)} raw=${x.rawTok} save=${x.saved.toFixed(1)}  ${JSON.stringify(x.raw.slice(0, 46))}`);
      console.log('  worst 4 rules:');
      for (const x of rows.slice(-4)) console.log(`    ${x.g} n=${String(x.n).padStart(3)} raw=${x.rawTok} save=${x.saved.toFixed(1)}  ${JSON.stringify(x.raw.slice(0, 46))}`);
    }
  } else {
    console.log(`\n=== ${f.split('/').pop()} === no tape (parent=${r.parent}) | raw ${r.inTokens} msg ${r.messageTokens}`);
  }
}
