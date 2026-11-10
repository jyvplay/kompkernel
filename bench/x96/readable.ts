/**
 * X96 — MODEL-READABILITY OF ἸΣΟΜΟΡΦΊΑ'S OUTPUT.  The user's standing requirement is that the
 * coded text be decodable by an LLM from a basic single chat input/output, with no skills.md and
 * no system-prompt box.  ἸΣΟΜΟΡΦΊΑ permutes rules and relabels letters, so the question is
 * whether the WIRE LANGUAGE is preserved -- not merely whether the bytes decode.
 *
 * This prints, for one lane: the contract, the first N characters of the incumbent tape, the first
 * N characters of the ἸΣΟΜΟΡΦΊΑ tape, and the decoded text's first N characters.  A reader can then
 * see directly that (a) the contract is byte-identical, (b) the operators are the same set, (c) the
 * rules are the same strings in a different order under different letters, and (d) chironDecode
 * recovers the source exactly.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { chironDecode, CHIRON_START } from '../../src/lib/omega/chiron';

process.env.OMEGA_DET = '1';
// OMEGA_NO_MEMO is LOAD-BEARING here, not an optimisation. `tagstackEncode`'s memo key is
// `X\u0000<text>\u0000<enc>` and does NOT include the environment, so without this the second
// `shot` is served the FIRST arm's cached object and both arms print the same wire. Measured: with
// the memo on, apt-real.txt printed 850 for both arms; with it off, 850 and 846. Receipt:
// bench/x96/receipts/readable.log.
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const p = process.argv[2] ?? 'bench/holdout-x41/apt-real.txt';
const N = Number(process.argv[3] ?? 420);
const text = fs.readFileSync(p, 'utf8');

const shot = (tag: string, setup: () => void): void => {
  setup();
  const r: any = tagstackEncode(text, enc);
  const msg: string = r.message;
  const w = msg.indexOf(CHIRON_START);
  const tape = msg.slice(w + 1, msg.indexOf('\u00b6', w));
  const body = msg.slice(msg.indexOf('\u00b6', w) + 1);
  const ops = [...new Set([...msg].filter((c) => c === '\u00d7' || c === '\u2026'))];
  console.log(`--- ${tag}: tokens=${r.messageTokens} exact=${r.decoded === text} parent=${r.parentCodec}`);
  console.log(`    contract (${msg.slice(0, w).length} ch): ${JSON.stringify(msg.slice(0, Math.min(w, 300)))}`);
  console.log(`    operators present: ${ops.length ? ops.join(' ') : '(none)'}   tape entries=${tape.split(/(?=[^\n])/).length}`);
  console.log(`    tape[0..${N}]: ${tape.slice(0, N)}`);
  console.log(`    decoded[0..${N}]: ${JSON.stringify(r.decoded.slice(0, N))}`);
  const again = chironDecode(msg.slice(w), enc);
  console.log(`    chironDecode(wire) === source: ${again === text}`);
};
shot('INCUMBENT (ἸΣΟΜΟΡΦΊΑ skipped)', () => { process.env.OMEGA_NO_ISO = '1'; });
shot('ἸΣΟΜΟΡΦΊΑ', () => { delete process.env.OMEGA_NO_ISO; process.env.OMEGA_ISO_ITERS = '400'; });
