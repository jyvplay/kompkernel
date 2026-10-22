/**
 * X26: is the TAPE tokenized efficiently?
 *
 * The tape is a delimiter-free concatenation `g1 raw1 g2 raw2 ...`. Because a
 * glyph and its raw are both letters, they land in the SAME pre-tokenizer chunk
 * whenever the raw starts with a letter -- a mixed-script chunk, which BPE
 * prices badly (the X25 census found MIX chunks are the second-largest class on
 * the wire). Every entry therefore pays a boundary tax.
 *
 * This probe compares
 *      T(tape)                        -- what we actually pay
 *   vs sum_i [ T(glyph_i) + T(raw_i) ]  -- what the parts would cost alone
 * and then measures a few concrete rearrangements that a decoder could still
 * parse:
 *    'space'      insert a space between glyph and raw (parser must skip it)
 *    'rev'        raw BEFORE glyph, still delimiter-free
 * The point is to see whether the boundary tax is large enough to be worth
 * spending contract words on.
 */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '@/lib/omega/chiron';
import { polytroposEncode } from '@/lib/omega/polytropos';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

const SCRIPTS: Array<[string, [number, number][]]> = [
  ['hangul', [[0xAC00, 0xD7A4]]], ['katakana', [[0x30A0, 0x3100]]],
  ['cyrillic', [[0x0400, 0x0500]]], ['arabic', [[0x0600, 0x0700]]],
  ['myanmar', [[0x1000, 0x10A0]]], ['khmer', [[0x1780, 0x1800]]],
  ['cjk', [[0x4E00, 0xA000]]],
  ['polyglot', [[0x0370, 0x0400], [0x0530, 0x0590], [0x0590, 0x0600], [0x0900, 0x0980],
    [0x0980, 0x0A00], [0x0A00, 0x0A80], [0x0A80, 0x0B00], [0x0B80, 0x0C00],
    [0x0C00, 0x0C80], [0x0C80, 0x0D00], [0x0D00, 0x0D80], [0x0D80, 0x0E00],
    [0x0E00, 0x0E80], [0x10A0, 0x1100]]],
];
const scriptOf = (cp: number) => { for (const [n, rs] of SCRIPTS) for (const [a, b] of rs) if (cp >= a && cp < b) return n; return null; };
function parseTape(tape: string) {
  const out: Array<[string, string]> = [];
  const used = new Set<string>(); let i = 0;
  const sc = scriptOf(tape.charCodeAt(0)); if (!sc) return out;
  const rs = SCRIPTS.find(([n]) => n === sc)![1];
  const inS = (c: string) => rs.some(([a, b]) => c.codePointAt(0)! >= a && c.codePointAt(0)! < b);
  while (i < tape.length) {
    const g = tape[i]; used.add(g); let j = i + 1;
    while (j < tape.length && !(inS(tape[j]) && !used.has(tape[j]))) j++;
    out.push([g, tape.slice(i + 1, j)]); i = j;
  }
  return out;
}

const lanes = fs.readFileSync('bench/x21/lanes.txt', 'utf8').trim().split('\n');
console.log('lane'.padEnd(38), 'rules'.padStart(6), 'T(tape)'.padStart(8), 'sumParts'.padStart(9), 'tax'.padStart(5), '| +space'.padStart(8), 'rev'.padStart(6));
let TT = 0, SP = 0, SPACE = 0, REV = 0;
for (let i = 0; i < lanes.length; i++) {
  const r: any = polytroposEncode(fs.readFileSync(lanes[i], 'utf8'), enc);
  const wire = String(r.wire);
  const cut = wire.indexOf(CHIRON_SEP, CHIRON_START.length);
  const tape = wire.slice(CHIRON_START.length, cut);
  const rules = parseTape(tape);
  if (rules.length < 4) continue;
  const t = T(tape);
  let parts = 0;
  for (const [g, raw] of rules) parts += T(g) + (raw ? T(raw) : 0);
  const space = T(rules.map(([g, raw]) => g + ' ' + raw).join(''));
  const rev = T(rules.map(([g, raw]) => raw + g).join(''));
  TT += t; SP += parts; SPACE += space; REV += rev;
  console.log(lanes[i].split('/').pop()!.padEnd(38), String(rules.length).padStart(6),
    String(t).padStart(8), String(parts).padStart(9), String(t - parts).padStart(5),
    '|', String(space - t >= 0 ? '+' + (space - t) : String(space - t)).padStart(7),
    String(rev - t >= 0 ? '+' + (rev - t) : String(rev - t)).padStart(6));
}
console.log('\nTOTALS: T(tape)', TT, '| sumParts', SP, '| boundary tax', TT - SP,
  '| +space costs', SPACE - TT, '| reversed costs', REV - TT);
