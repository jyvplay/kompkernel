/**
 * X121 — how much of the tape is content and how much is glue?
 *
 * The tape is `g1 V1 g2 V2 ... gN VN`. Its token count is
 *   T = (glyph characters) + (value text) + (boundary effects, either sign).
 * This splits it three ways so the boundary term is a measured number instead of
 * a guess: sum of each value tokenized alone, the N glyph characters, and the
 * remainder.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';

const enc = 'o200k_base' as const;
const rows = fs.readFileSync('bench/x120/receipts/ab-messages.jsonl', 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));
function scriptOf(cp: number) { for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s; return null; }

let TT = 0, TG = 0, TV = 0, TN = 0;
for (const r of rows) {
  const m: string = r.message;
  const s0 = m.indexOf(CHIRON_START), p0 = s0 >= 0 ? m.indexOf(CHIRON_SEP, s0 + 1) : -1;
  if (s0 < 0 || p0 < 0) continue;
  const tape = m.slice(s0 + 1, p0);
  const sc = scriptOf(tape.codePointAt(0)!); if (!sc) continue;
  const inS = (ch: string) => chironInScript(sc, ch.codePointAt(0)!);
  const used = new Set<string>(); const vals: string[] = [];
  let i = 0;
  while (i < tape.length) {
    const g = tape[i]; if (!inS(g) || used.has(g)) break;
    used.add(g);
    let j = i + 1;
    while (j < tape.length && !(inS(tape[j]) && !used.has(tape[j]))) j++;
    vals.push(tape.slice(i + 1, j)); i = j;
  }
  if (i !== tape.length) continue;
  const T = countTokens(tape, enc);
  let V = 0; for (const v of vals) V += countTokens(v, enc);
  const N = vals.length;
  const glyphTok = countTokens(vals.map((_, k) => tape[0]).join(''), enc) === 0 ? N : N; // glyphs are 1 char each
  TT += T; TV += V; TN += N; TG += (T - V - N);
  console.log(`${r.path.padEnd(46)} tape=${String(T).padStart(4)} vals=${String(V).padStart(4)} glyphs=${String(N).padStart(3)} glue=${String(T - V - N).padStart(4)}  (${((T - V - N) / T * 100).toFixed(1)}%)`);
}
console.log(`TOTAL tape=${TT} values=${TV} glyphs=${TN} glue=${TG} (${(TG / TT * 100).toFixed(1)}%)`);
