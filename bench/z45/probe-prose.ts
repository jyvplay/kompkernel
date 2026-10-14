// Z45 probe: where do prose tokens go? Token classes per file + tokenizer hypothesis tests.
import fs from 'node:fs';
import { encodeIds, decodeIds, tokenStrings, countTokens, type EncodingName } from '@/lib/omega/bpe';

const files = process.argv.slice(2);
const enc: EncodingName = (process.env.ENC as EncodingName) || 'o200k_base';

function classify(text: string) {
  const toks = tokenStrings(text, enc);
  const c = { wordStart: 0, wordCont: 0, punct: 0, ws: 0, digit: 0, other: 0, total: toks.length, words: 0, multiTokWords: 0, extraPieces: 0 };
  let prevWasWordPiece = false;
  for (const t of toks) {
    const s = t.s;
    if (/^\s+$/.test(s)) { c.ws++; prevWasWordPiece = false; continue; }
    if (/^ ?\p{N}+$/u.test(s)) { c.digit++; prevWasWordPiece = false; continue; }
    if (/^ ?[\p{L}\p{M}]+(?:'\p{L}+)?$/u.test(s)) {
      if (s.startsWith(' ') || !prevWasWordPiece) { c.wordStart++; c.words++; }
      else { c.wordCont++; }
      prevWasWordPiece = true;
      continue;
    }
    if (/^ ?[^\s\p{L}\p{N}]+[\r\n]*$/u.test(s)) { c.punct++; prevWasWordPiece = false; continue; }
    c.other++; prevWasWordPiece = false;
  }
  return c;
}

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const c = classify(text);
  const pct = (n: number) => (100 * n / c.total).toFixed(1) + '%';
  console.log(`${f.split('/').slice(-1)[0].padEnd(28)} total=${c.total} wordStart=${c.wordStart}(${pct(c.wordStart)}) wordCont=${c.wordCont}(${pct(c.wordCont)}) punct=${c.punct}(${pct(c.punct)}) ws=${c.ws}(${pct(c.ws)}) digit=${c.digit}(${pct(c.digit)}) other=${c.other}`);
}

// Hypothesis tests
console.log('\n--- vocab probes (tokens) ---');
const probes = ['.The', ',the', '.This', ' .The', 'fox.The', 'fox. The', 'ofthe', ' ofthe', ' inthe', 'the quick brown fox', 'thequickbrownfox', 'theQuickBrownFox', ' Tokenization', ' tokenization', 'Tokenization', 'tokenization', ' Compression', ' compression', ' Byte', ' byte', ' Lossless', ' lossless', 'don\'t', 'do not', ' cannot', ' can not', ' 2026-10-13', ' 20261013', '2026-10-13T21:59:01Z', '20261013T215901Z', 'https://github.com/', ' https://', 'http://', '**bold**', '## Header', '- item', '  - item', '1. first', '```', '```ts\n', '\n\n', '.\n', '.\n\n', ' ', '  ', '    ', '\t'];
for (const p of probes) {
  const ts = tokenStrings(p, enc).map(t => JSON.stringify(t.s)).join('|');
  console.log(`${JSON.stringify(p).padEnd(28)} ${encodeIds(p, enc).length}  ${ts}`);
}
