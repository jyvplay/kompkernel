/**
 * X76 / t6 — IS THE TAPE FRONT-CODABLE?
 *
 * The tape is 26.4% of the message (t5). It is a dictionary of (glyph, text) rules written
 * in order. If consecutive rules share prefixes, the tape can be front-coded: write the
 * shared-prefix length and only the tail. This measures how much is actually shared, both
 * in the encoder's order and in the best (prefix-sorted) order.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { chironParseTape, CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS } from '../../src/lib/omega/chiron';
const enc: any = 'o200k_base';
const lcp = (a: string, b: string) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
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
  const texts: string[] = parsed.map((x: any) => x.raw as string);
  let shareSeq = 0;
  for (let i = 1; i < texts.length; i++) shareSeq += Math.min(2, lcp(texts[i - 1], texts[i])); // cap: a 2-char code
  const sorted = [...texts].sort();
  let shareSorted = 0;
  for (let i = 1; i < sorted.length; i++) shareSorted += Math.min(2, lcp(sorted[i - 1], sorted[i]));
  // how much would a 2-char front-code save in TOKENS? build the front-coded tape and count
  const parts: string[] = [texts[0]];
  for (let i = 1; i < texts.length; i++) {
    const n = Math.min(2, lcp(texts[i - 1], texts[i]));
    parts.push(String(n) + texts[i].slice(n));
  }
  const fc = T(parts.join(''), enc);   // underestimate: glyphs and codes cost tokens too
  rows.push({ path: p, tapeTokens: T(tape, enc), rules: texts.length, shareSeq, shareSorted, fcTextTokens: fc });
  console.log(`${p.split('/').pop()!.padEnd(22)} tape ${String(T(tape, enc)).padStart(4)} tok / ${String(texts.length).padStart(3)} rules | sharable chars: seq ${String(shareSeq).padStart(3)} sorted ${String(shareSorted).padStart(3)} | text-only front-coded ${String(fc).padStart(4)}`);
  fs.writeFileSync('bench/x76/receipts/tape-frontcode.json', JSON.stringify(rows, null, 1) + '\n');
}
console.log(`\nTOTAL tape ${rows.reduce((a, b) => a + b.tapeTokens, 0)} tok; sharable (seq) ${rows.reduce((a, b) => a + b.shareSeq, 0)} chars; front-coded text-only ${rows.reduce((a, b) => a + b.fcTextTokens, 0)} tok`);
