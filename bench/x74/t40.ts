/** Is the marker safe? Count 1 token, absent from sources, and — decisive — does the
 *  PARENT frontier reproduce it byte for byte after its own round trip? */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const marks = ['\u00a7', '\u00b6', '\u2042', '\u2234', '\u2a3f', '\u26a1', '\u21af', '\u0298'];
const t = fs.readFileSync('bench/holdout-x41/ls-l-real.txt', 'utf8');
for (const m of marks) {
  const tok = T(m, enc);
  const present = t.includes(m);
  const r: any = tagstackEncode(`lrwx 1 r r 1 Jan 1 libx.so -> ${m}.1\n${t}`, enc);
  const exact = r.decoded === `lrwx 1 r r 1 Jan 1 libx.so -> ${m}.1\n${t}`;
  console.log(`${JSON.stringify(m)} tok ${tok} inSource ${present} parentRoundTrip ${exact}`);
}
