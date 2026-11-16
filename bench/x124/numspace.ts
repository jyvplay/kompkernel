/**
 * X124 — the space before a number is a token of its own.
 *
 * o200k's pre-tokenizer is `[^\r\n\p{L}\p{N}]?\p{L}+ | \p{N}{1,3} |
 * ?[^\s\p{L}\p{N}]+[\r\n]* | \s*[\r\n]+ | \s+(?!\S) | \s+`. The LETTER group and
 * the PUNCTUATION group both begin with an optional leading character, so a
 * space before a letter or before a punctuation mark is absorbed into the next
 * token. The DIGIT group does not: " 409" has no ` ?`, so the space before a
 * number is billed as a token of its own. Measured: "root root 4096" is
 * ["root", " root", " ", "409", "6"] (5) and "root root4096" is 4.
 *
 * That is a junction cost no codec in this stack touches: LEXIS deletes the
 * space AFTER a sentence mark, STOICHOS the space after a line-initial
 * structural mark, PSEPHOS/AETOS/MORPHE the punctuation INSIDE a number. None
 * of them deletes the space BEFORE one. This probe counts what it is worth at
 * the raw level, which is the only honest place to start.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';

const enc = 'o200k_base' as const;
const lanes = fs.readFileSync('bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const SENTINELS = ['~', '^', '`', '|', '\\', '¢', '£', '¤', '¥', '§', '¨', '©', 'ª', '«', '¬', '®', '¯', '°', '±', '²'];

function transform(src: string): { text: string; elide: number; danger: number; lineStart: number; sent: string } | null {
  const sent = SENTINELS.find((s) => !src.includes(s));
  if (!sent) return null;
  let elide = 0, danger = 0, lineStart = 0;
  let out = '';
  let i = 0;
  const isDigit = (c: string) => c >= '0' && c <= '9';
  while (i < src.length) {
    const c = src[i];
    if (isDigit(c)) {
      const prev = out.length ? out[out.length - 1] : '';
      const srcPrev = i > 0 ? src[i - 1] : '';
      if (srcPrev === ' ') {
        // drop the space we just emitted
        out = out.slice(0, -1);
        elide++;
      } else if (srcPrev === '' || srcPrev === '\n' || srcPrev === '\r') {
        lineStart++;
      } else if (isDigit(srcPrev)) {
        // continuation of the run; cannot happen at a run start
      } else {
        out += sent;
        danger++;
      }
      let j = i;
      while (j < src.length && isDigit(src[j])) { out += src[j]; j++; }
      i = j;
      continue;
    }
    out += c; i++;
  }
  return { text: out, elide, danger, lineStart, sent };
}

let TE = 0, TD = 0, TR = 0, TN = 0;
console.log('lane                          elide danger lineStart    raw   new   delta  net(-12)');
for (const p of lanes) {
  const src = fs.readFileSync(p, 'utf8');
  const t = transform(src);
  if (!t) { console.log(`${p.split('/').pop()!.padEnd(30)} no sentinel`); continue; }
  const raw = countTokens(src, enc);
  const nw = countTokens(t.text, enc);
  const net = (raw - nw) - 12;
  TE += t.elide; TD += t.danger; TR += raw; TN += nw;
  console.log(`${p.split('/').pop()!.padEnd(30)}${String(t.elide).padStart(5)}${String(t.danger).padStart(7)}${String(t.lineStart).padStart(9)}${String(raw).padStart(8)}${String(nw).padStart(6)}${String(nw - raw).padStart(8)}${String(net).padStart(9)}`);
}
console.log(`TOTAL elide ${TE} danger ${TD} raw ${TR} new ${TN} delta ${TN - TR}`);
