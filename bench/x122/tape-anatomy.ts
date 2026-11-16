/**
 * X122 — is the TAPE efficient?
 *
 * The tape is `g1v1g2v2…` in one exotic script: each glyph character is one
 * token by construction, and each value is literal text sitting between two
 * glyph characters. On ls-l-real the tape is 532 of 1 325 shipped tokens (40 %),
 * so its efficiency matters as much as the body's.
 *
 * This instrument measures, per lane:
 *   · tape tokens, and the same tokens accounted as (glyphs + values)
 *   · the token cost of the values when each is counted ALONE, when they are
 *     concatenated with no separator, and when they are concatenated with a
 *     single newline between them
 *   · how much of the value text is itself repeated across values (nesting
 *     headroom, i.e. DAG-SLP over the tape)
 * Reuses the local script-pool and tape parser from bench/x121/residual.ts.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, type ChironScript } from '../../src/lib/omega/chiron';

const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x122/lanes.txt', 'utf8').split('\n').filter(Boolean);
const msgs = new Map<string, string>();
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(l); msgs.set(r.path, r.message);
}
function scriptOf(cp: number) { for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s; return null; }
function parseTape(tape: string) {
  const first = tape.codePointAt(0); const script = first === undefined ? null : scriptOf(first);
  if (!script) return null;
  const inScript = (ch: string) => chironInScript(script, ch.codePointAt(0)!);
  const used = new Set<string>(); const out: Array<{ g: string; raw: string }> = [];
  let i = 0;
  while (i < tape.length) {
    const g = tape[i]!;
    if (!inScript(g) || used.has(g)) return null;
    used.add(g); let j = i + 1;
    while (j < tape.length && !(inScript(tape[j]!) && !used.has(tape[j]!))) j++;
    out.push({ g, raw: tape.slice(i + 1, j) }); i = j;
  }
  return { script, rules: out };
}
let T = 0, Tsaved = 0;
for (const p of lanes) {
  const m = msgs.get(p); if (m === undefined) { console.log(`${p}: no message in receipt`); continue; }
  const s0 = m.indexOf(CHIRON_START); const p0 = s0 >= 0 ? m.indexOf(CHIRON_SEP, s0 + 1) : -1;
  if (s0 < 0 || p0 < 0) { console.log(`${p}: no CHIRON frame`); continue; }
  const tape = m.slice(s0 + 1, p0), body = m.slice(p0 + 1);
  const pt = parseTape(tape); if (!pt) { console.log(`${p}: tape does not parse`); continue; }
  const vals = pt.rules.map((r) => r.raw);
  const tTape = countTokens(tape, enc);
  const tGlyph = pt.rules.length;                       // one glyph char each
  const tValAlone = vals.reduce((a, v) => a + countTokens(v, enc), 0);
  const tValJoined = countTokens(vals.join(''), enc);
  const tValNl = countTokens(vals.join('\n'), enc);
  const valChars = vals.reduce((a, v) => a + v.length, 0);
  const tBody = countTokens(body, enc);
  // nesting headroom: how much value text is repeated as a substring of other values
  const occ = new Map<string, number>();
  for (const v of vals) for (let L = 3; L <= 24; L++) for (let i = 0; i + L <= v.length; i++) {
    const s = v.slice(i, i + L); occ.set(s, (occ.get(s) ?? 0) + 1);
  }
  let nestPrize = 0; const top: Array<[string, number]> = [];
  for (const [s, f] of occ) if (f >= 3) {
    const v = countTokens(s, enc);
    const g = (f - 1) * v - (v + 1);
    if (g > 0) { nestPrize += 0; top.push([s, f]); }
  }
  top.sort((a, b) => b[1] - a[1]);
  T += tTape;
  console.log(`\n${p}`);
  console.log(`  rules=${pt.rules.length}  valueChars=${valChars}  tapeTokens=${tTape}  bodyTokens=${tBody}  total=${countTokens(m, enc)}`);
  console.log(`  accounting: glyphs=${tGlyph} + values(alone)=${tValAlone} -> ${tGlyph + tValAlone};  tape actually ${tTape}  => interleave overhead ${tTape - tGlyph - tValAlone}`);
  console.log(`  values joined: ${tValJoined}  |  values \\n-joined: ${tValNl}  |  values alone: ${tValAlone}   (valChars ${valChars}, ${(tValAlone / Math.max(1, valChars)).toFixed(3)} tok/char)`);
  console.log(`  cross-value repeats (len3-24, freq>=3): ${top.length}; top: ${top.slice(0, 8).map(([s, f]) => `${JSON.stringify(s)}x${f}`).join(' ')}`);
}
