/**
 * X27 probe 9: script choice, then layout within the script.
 *
 * Layout matters because the tokenizer has vocabulary entries for WORD-LIKE
 * sequences inside a script -- a run of adjacent codepoints reads as a plausible
 * word and collapses to one token, while a scrambled run does not. spread.ts
 * showed the parent's contiguous-prefix assignment beats a random permutation by
 * 53-77 tokens, which is the size of the effect.
 *
 * So two questions, in order:
 *   (a) which script's vocabulary is richest for our kind of run? Chinese has a
 *       2515-char pool and BPE knows multi-character words; Cyrillic (the
 *       default) has 122.
 *   (b) within the winner, how much does a proper layout search add?
 *
 * Cheap first pass: for each script, keep the parent's rule set and relabel with
 * a contiguous prefix of that script's pool, then count.
 */
import fs from 'node:fs';
import { symplokeEncode, symplokeDecode } from '@/lib/omega/symploke';
import { chironParseTape, chironDecode, CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

function poolOf(sc: any, payload: Set<string>): string[] {
  const out: string[] = [];
  for (const [a, b] of (sc.ranges ?? [[sc.lo, sc.hi]])) {
    for (let cp = a; cp < b; cp++) { const ch = String.fromCodePoint(cp); if (!payload.has(ch) && T(ch) === 1) out.push(ch); }
  }
  return out;
}

for (const f of (process.env.F || '').split(',').filter(Boolean)) {
  const text = fs.readFileSync(f, 'utf8');
  const r = symplokeEncode(text, enc);
  if (!r.wire.startsWith(CHIRON_START)) continue;
  const cut = r.wire.indexOf(CHIRON_SEP, CHIRON_START.length);
  const tape = r.wire.slice(CHIRON_START.length, cut);
  const body = r.wire.slice(cut + CHIRON_SEP.length);
  const sc0 = scriptOfChar(tape[0])!;
  const rules = chironParseTape(tape, sc0)!;
  const og = rules.map((x) => x.glyph);
  const payload = new Set(text);
  const wireOf = (assign: string[]) => {
    const map = new Map<string, string>(); og.forEach((g, i) => map.set(g, assign[i]));
    const conv = (s: string) => [...s].map((c) => map.get(c) ?? c).join('');
    return CHIRON_START + rules.map((ru, i) => assign[i] + conv(ru.raw)).join('') + CHIRON_SEP + conv(body);
  };
  const base = T(wireOf(og));
  const results: Array<[string, number, number]> = [];
  for (const sc of CHIRON_SCRIPTS as any[]) {
    const pool = poolOf(sc, payload);
    if (pool.length < og.length + 4) continue;
    // contiguous prefix, mimicking the parent
    const assign = pool.slice(0, og.length);
    results.push([sc.label ?? sc.name, T(wireOf(assign)), pool.length]);
  }
  results.sort((a, b) => a[1] - b[1]);
  console.log(`\n${f.split('/').pop()}  (rules ${og.length}, parent wire ${base})`);
  for (const [name, tok, n] of results) {
    console.log('   ', String(name).padEnd(46), String(tok).padStart(5),
      String(tok - base).padStart(5), ' pool', String(n).padStart(5), name === (sc0 as any).label ? '  <= parent script' : '');
  }
}
