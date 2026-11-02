/**
 * Screen: does a contract-lean rebuild of the KANON table-fold representation
 * beat the shipped frontier on any real lane? Nothing is implemented here; this
 * only measures the two terms (spec-wire tokens, contract tokens) that a real
 * codec would have to pay, against the frontier number measured by frontier.ts.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { kanonEncode } from '../../src/lib/omega/kanon';
import { metronEncode } from '../../src/lib/omega/metron';

const enc: any = 'o200k_base';
const C = (s: string) => countTokens(s, enc);
const LEAN = `h=head lines. Rows after are r=0,1,..: G<c>=<spec> restores column c; {n+d}=n+d*r, mN=mod N, zW=pad W, #N:a,b..=cycle. Print only.`;
console.log('lean contract =', C(LEAN), 'tok');
const lanes = process.argv.slice(2);
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  let k: any, m: any;
  try { k = kanonEncode(text, enc); } catch (e) { k = null; }
  try { m = metronEncode(text, enc); } catch (e) { m = null; }
  const kTok = k ? C(k.wire) : null;
  const kMsg = k ? k.messageTokens : null;
  const lean = kTok === null ? null : C(LEAN) + kTok;
  console.log(JSON.stringify({
    p, raw: C(text), kanonM: kMsg, kanonWire: kTok, kanonPrompt: k ? C(k.decoderPrompt) : null,
    leanEstimate: lean, metronM: m ? m.messageTokens : null,
    kanonExact: k ? k.decoded === text : null,
  }));
}
