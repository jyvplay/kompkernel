/** X122 — tape layout experiment: keep the rules, change how the tape is written.
 *  Current: g1 v1 g2 v2 ... (delimiter-free, glyphs never adjacent).
 *  Probe A: G = g1 g2 ... gN (contiguous glyph run) then values joined by X.
 *  Probe B: same, with the glyph run hill-climbed into real multi-char tokens. */
import * as fs from 'node:fs';
import { countTokens, encodeIds } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript, chironDecode } from '../../src/lib/omega/chiron';
const enc = 'o200k_base' as const;
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x122/lanes.txt', 'utf8').split('\n').filter(Boolean);
const msgs = new Map<string, string>();
for (const l of fs.readFileSync('bench/x121/receipts/ab-messages.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); msgs.set(r.path, r.message); }
function scriptOf(cp: number) { for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s; return null; }
const SEPS = ['', ';', ' ', '\n', ',', '|', '·', '†', '~', '/'];
const totBase: number[] = []; const totBest: number[] = [];
for (const p of lanes) {
  const m = msgs.get(p); if (!m) continue;
  const s0 = m.indexOf(CHIRON_START), p0 = s0 >= 0 ? m.indexOf(CHIRON_SEP, s0 + 1) : -1;
  if (s0 < 0 || p0 < 0) continue;
  const tape = m.slice(s0 + 1, p0);
  const first = tape.codePointAt(0); const script = first === undefined ? null : scriptOf(first);
  if (!script) continue;
  const inScript = (ch: string) => chironInScript(script, ch.codePointAt(0)!);
  const glyphs = new Set<string>(); const rules: Array<{ g: string; raw: string }> = [];
  let i = 0;
  while (i < tape.length) { const g = tape[i]!; glyphs.add(g); let j = i + 1; while (j < tape.length && !(inScript(tape[j]!) && !glyphs.has(tape[j]!))) j++; rules.push({ g, raw: tape.slice(i + 1, j) }); i = j; }
  const G = rules.map((r) => r.g); const V = rules.map((r) => r.raw);
  const base = countTokens(tape, enc);
  const gAlone = countTokens(G.join(''), enc);
  console.log(`${p.split('/').pop()!.padEnd(16)} tape ${tape.length}ch ${base}tok | glyphRun ${G.length}ch ${gAlone}tok`);
  let best = { sep: '', tok: Infinity, form: '' };
  for (const sep of SEPS) {
    const t1 = countTokens(G.join('') + '¶' + V.join(sep), enc);
    const t2 = countTokens(G.join('') + '\n' + V.join(sep), enc);
    for (const [form, t] of [['¶+' + JSON.stringify(sep), t1], ['\\n+' + JSON.stringify(sep), t2]] as Array<[string, number]>) {
      if (t < best.tok) best = { sep, tok: t, form };
    }
  }
  console.log(`   best split layout: ${best.form} -> ${best.tok} tok (base ${base}, Δ ${best.tok - base})`);
  totBase.push(base); totBest.push(best.tok);
}
console.log(`\nTOTAL base ${totBase.reduce((a, b) => a + b, 0)} best ${totBest.reduce((a, b) => a + b, 0)} Δ ${totBest.reduce((a, b) => a + b, 0) - totBase.reduce((a, b) => a + b, 0)}`);
