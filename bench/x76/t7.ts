/**
 * X76 / t7 — RULE COMPOSITION: does one rule's text contain another rule's text?
 *
 * t6 measured CONSECUTIVE PREFIX sharing (39 chars over 10 lanes — nothing). This is
 * different: a rule's text may CONTAIN an earlier rule's text anywhere, in which case the
 * tape can write the glyph instead of the text. CHIRON already permits this (a rule's
 * text may reference earlier glyphs), so the question is whether the encoder USES it.
 * If it does not, the tape (26.4% of the message) has unexploited redundancy.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { chironParseTape, CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS } from '../../src/lib/omega/chiron';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = tagstackEncode(t, enc);
  const msg: string = r.message;
  const s = msg.indexOf(CHIRON_START); if (s < 0) continue;
  const cut = msg.indexOf(CHIRON_SEP, s + 1); if (cut < 0) continue;
  const tape = msg.slice(s + 1, cut);
  let parsed: any = null;
  for (const sc of CHIRON_SCRIPTS) { parsed = chironParseTape(tape, sc); if (parsed) break; }
  if (!parsed) continue;
  const glyphs: string[] = parsed.map((x: any) => x.glyph as string);
  const texts: string[] = parsed.map((x: any) => x.raw as string);
  let alreadyUsed = 0, potential = 0, saveChars = 0;
  const examples: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    // does rule i already reference an earlier glyph?
    let used = false;
    for (let j = 0; j < i; j++) if (texts[i].includes(glyphs[j])) { used = true; break; }
    if (used) alreadyUsed++;
    // could it? find the longest earlier rule TEXT contained in this one
    let best = 0, bestJ = -1;
    for (let j = 0; j < i; j++) {
      if (texts[j].length > best && texts[i].includes(texts[j])) { best = texts[j].length; bestJ = j; }
    }
    if (bestJ >= 0) { potential++; saveChars += best - 1; if (examples.length < 3) examples.push(`[${i}] ${JSON.stringify(texts[i].slice(0, 40))} contains rule ${bestJ} ${JSON.stringify(texts[bestJ].slice(0, 24))}`); }
  }
  rows.push({ path: p, tapeTokens: T(tape, enc), rules: texts.length, alreadyUsed, potential, saveChars });
  console.log(`${p.split('/').pop()!.padEnd(22)} tape ${String(T(tape, enc)).padStart(4)} tok / ${String(texts.length).padStart(3)} rules | already compose ${String(alreadyUsed).padStart(3)} | COULD compose ${String(potential).padStart(3)} saving ${String(saveChars).padStart(4)} chars`);
  examples.forEach((e) => console.log(`      e.g. ${e}`));
  fs.writeFileSync('bench/x76/receipts/tape-compose.json', JSON.stringify(rows, null, 1) + '\n');
}
console.log(`\nTOTAL tape ${rows.reduce((a, b) => a + b.tapeTokens, 0)} tok, ${rows.reduce((a, b) => a + b.rules, 0)} rules; already compose ${rows.reduce((a, b) => a + b.alreadyUsed, 0)}, could compose ${rows.reduce((a, b) => a + b.potential, 0)} saving ${rows.reduce((a, b) => a + b.saveChars, 0)} chars`);
