/** X122 — what is inside the tape's 531 tokens? Decompose each rule's value
 *  into glyph-reference characters and literal characters, and price each part. */
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
  while (i < tape.length) {
    const g = tape[i]!; glyphs.add(g); let j = i + 1;
    while (j < tape.length && !(inScript(tape[j]!) && !glyphs.has(tape[j]!))) j++;
    rules.push({ g, raw: tape.slice(i + 1, j) }); i = j;
  }
  let gRef = 0, lRef = 0, gTok = 0, lTok = 0;
  const litOnly: string[] = [];
  for (const r of rules) {
    let lit = '';
    for (const c of r.raw) {
      if (glyphs.has(c)) { gRef++; gTok += countTokens(c, enc); if (lit) { litOnly.push(lit); lit = ''; } }
      else { lit += c; lRef++; }
    }
    if (lit) litOnly.push(lit);
  }
  const litJoined = countTokens(litOnly.join(''), enc);
  const litAlone = litOnly.reduce((a, s) => a + countTokens(s, enc), 0);
  console.log(`${p}\n  tape ${tape.length} chars / ${countTokens(tape, enc)} tok; rules=${rules.length}`);
  console.log(`  inside values: glyph refs ${gRef} chars -> ${gTok} tok (${(gTok / Math.max(1, gRef)).toFixed(2)}/char); literal ${lRef} chars -> ${lTok} tok (${(lTok / Math.max(1, lRef)).toFixed(3)}/char)`);
  console.log(`  literal pieces: ${litOnly.length} pieces, ${lRef} chars; joined ${litJoined} tok (${(litJoined / Math.max(1, lRef)).toFixed(3)}/char); alone ${litAlone} tok`);
  const lens = litOnly.map((s) => s.length).sort((a, b) => a - b);
  console.log(`  piece length distribution: min ${lens[0]} p25 ${lens[(lens.length * 0.25) | 0]} median ${lens[(lens.length / 2) | 0]} p75 ${lens[(lens.length * 0.75) | 0]} max ${lens[lens.length - 1]}`);
}
