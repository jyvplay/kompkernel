/**
 * Z44: dissect a DAEDALUS/CHIRON wire — where do its tokens sit, and what does
 * the contract actually buy?
 * Run: ./bench/z44/build.sh bench/z44/dissect.ts <file>... [--enc=cl100k_base]
 */
import fs from 'node:fs';
import { countTokens, tokenStrings, type EncodingName } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

const args = process.argv.slice(2);
const enc = (args.find((a) => a.startsWith('--enc='))?.slice(6) ?? 'o200k_base') as EncodingName;
const files = args.filter((a) => !a.startsWith('--'));

const isGlyph = (t: string) => /[^\x00-\x7F]/.test(t) && !/^[\s\u00a0-\u00bf\u2000-\u206f]+$/.test(t);
const isWs = (t: string) => /^\s+$/.test(t);
const isPunct = (t: string) => /^[\p{P}\p{S}]+$/u.test(t);
const isDigitOnly = (t: string) => /^ ?\d+$/.test(t);
const isAsciiWord = (t: string) => /^ ?[A-Za-z]+$/.test(t);

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const I = countTokens(text, enc);
  const r = daedalusEncode(text, enc, { maxArms: 2 });
  const wire = r.wire;
  console.log(`\n=== ${f.split('/').slice(-2).join('/')}  chars=${text.length} I=${I} (${(text.length / Math.max(1, I)).toFixed(2)} ch/tok) M=${r.messageTokens} W=${r.outTokens} contract=${r.contractTokens} mode=${r.mode} arm=${r.winningArm} rules=${r.phraseRules}+${r.wordRules} blocks=${r.blocks} lists=${r.lists} exact=${r.exact} ms=${r.ms}`);
  if (r.mode !== 'daedalus') { console.log('   (identity/raw fallback)'); continue; }
  const sep = wire.indexOf(CHIRON_SEP);
  const tape = wire.slice(CHIRON_START.length, sep);
  const body = wire.slice(sep + 1);
  const tapeT = countTokens(CHIRON_START + tape.concat(CHIRON_SEP), enc);
  const bodyT = countTokens(body, enc);
  console.log(`   tape = ${tapeT} tok (${tape.length} chars, ${(100 * tapeT / r.outTokens).toFixed(1)}% of wire), body = ${bodyT} tok (${body.length} chars)`);
  const bodyTok = tokenStrings(body, enc).map((x) => x.s);
  let glyph = 0, ws = 0, punct = 0, latin = 0, digit = 0, other = 0;
  for (const t of bodyTok) {
    if (isGlyph(t)) glyph++;
    else if (isWs(t)) ws++;
    else if (isPunct(t)) punct++;
    else if (isDigitOnly(t)) digit++;
    else if (isAsciiWord(t)) latin++;
    else other++;
  }
  const pc = (x: number) => `${x} (${(100 * x / Math.max(1, bodyT)).toFixed(1)}%)`;
  console.log(`   body: glyph-ref=${pc(glyph)} ws=${pc(ws)} punct=${pc(punct)} digit=${pc(digit)} asciiWord=${pc(latin)} mixed=${pc(other)}`);
  // rule count and rule text cost
  const nameRe = /[^\x00-\x7F]/u;
  let rules = 0, prev = false;
  for (const ch of tape) { const g = nameRe.test(ch); if (g && !prev) rules++; prev = g; }
  console.log(`   ~${rules} rule names in tape; tape chars/rule = ${(tape.length / Math.max(1, rules)).toFixed(1)}`);
}
