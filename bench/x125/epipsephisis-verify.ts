/**
 * bench/x125/epipsephisis-verify.ts — the differential test that binds
 * ἘΠΙΨΉΦΙΣΙΣ. For every edit: price the edited string with the window re-pricer
 * ON and with it OFF, and require the two to be equal, on real lane text, on
 * real CHIRON wires, and on adversarial whitespace/slash/newline neighbourhoods.
 */
import * as fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { epipsephisisStats, epipsephisisReset, epipsephisisLast } from '../../src/lib/omega/epipsephisis';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

const enc: EncodingName = 'o200k_base';
const ON = process.env.OMEGA_NO_EPIPSEPHISIS !== '1';
// The arm is off by default (X125 speed verdict); this script measures it, so opt in.
process.env.OMEGA_EPIPSEPHISIS = ON ? '1' : '0';
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const lanes = fs.readFileSync('bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const wires = fs.readFileSync('bench/x124/receipts/steli-ab-messages.jsonl', 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l).message as string)
  .map((m) => { const i = m.indexOf(CHIRON_START); return i < 0 ? m : m.slice(i); });

const ADVERSARY = ['\n', '\r\n', ' \n', '/', '//', '\n/', '\t', '  ', '\n\n', 'a', '0', '.', '§', 'ы'];

let cases = 0, bad = 0, hits = 0;
function check(base: string, edited: string, tag: string) {
  if (base === edited) return;
  // OFF (truth): temporarily disable via env is not possible mid-process, so the
  // truth is the library path itself
  const truth = truthCount(edited);
  const got = countTokens(edited, enc);   // may use the window re-pricer
  cases++;
  const st = epipsephisisStats();
  if (st.hits > hits) hits = st.hits;
  if (got !== truth) {
    bad++;
    if (bad <= 10) {
      console.log(`MISMATCH [${tag}] truth=${truth} got=${got} len=${edited.length} baseLen=${base.length}`);
      process.env.OMEGA_EPI_TRACE = '1';
      countTokens(edited, enc);
      process.env.OMEGA_EPI_TRACE = '0';
      let d = 0; while (d < Math.min(base.length, edited.length) && base[d] === edited[d]) d++;
      console.log(`   divergence at ${d}: base=${JSON.stringify(base.slice(Math.max(0,d-12), d+12))} edited=${JSON.stringify(edited.slice(Math.max(0,d-12), d+12))}`);
      const l = epipsephisisLast();
      const last = l.length ? l[l.length - 1]! : null;
      fs.appendFileSync('/tmp/epi-fail.jsonl', JSON.stringify({ base, edited, truth, got,
        ref: last ? last.ref : null, lo: last?.lo, hi: last?.hi, ws: last?.ws, we: last?.we, weN: last?.weN, lt: last?.lt, ln: last?.ln }) + '\n');
    }
  }
}
/** the unaccelerated reference: the tokenizer library itself */
function truthCount(s: string): number {
  return (countTokens as any) === null ? 0 : truthFn(s);
}
import { countTokensExact } from '../../src/lib/omega/bpe';
const truthFn = (s: string) => countTokensExact(s, enc);

const rand = rng(Number(process.env.SEED ?? '125125'));
const ROUNDS = Number(process.env.ROUNDS ?? '400');

for (const src of [...lanes.map((p) => fs.readFileSync(p, 'utf8')), ...wires]) {
  if (src.length < 200) continue;
  for (let r = 0; r < ROUNDS; r++) {
    // 1. replace a span with random-ish text
    const lo = Math.floor(rand() * (src.length - 8));
    const span = 1 + Math.floor(rand() * 40);
    const mode = Math.floor(rand() * 4);
    let edited: string;
    if (mode === 0) {
      let ins = '';
      const k = 1 + Math.floor(rand() * 40);
      for (let i = 0; i < k; i++) ins += ADVERSARY[Math.floor(rand() * ADVERSARY.length)]!;
      edited = src.slice(0, lo) + ins + src.slice(lo + span);
    } else if (mode === 1) {
      edited = src.slice(0, lo) + src.slice(lo + span);          // delete
    } else if (mode === 2) {
      // move a slice: two edits far apart -> should be rejected, not wrong
      const lo2 = Math.min(src.length - 4, lo + 200 + Math.floor(rand() * 200));
      edited = src.slice(0, lo) + src.slice(lo + span, lo2) + src.slice(lo, lo + span) + src.slice(lo2);
    } else {
      // whitespace/adversarial substitution near a newline
      const i = src.indexOf('\n', lo);
      if (i < 0 || i > src.length - 4) continue;
      const rep = ADVERSARY[Math.floor(rand() * ADVERSARY.length)]!;
      edited = src.slice(0, i) + rep + src.slice(i + 1);
    }
    // record the base first so the re-pricer has a reference
    countTokens(src, enc);
    check(src, edited, `mode${mode}`);
  }
}

const st = epipsephisisStats();
console.log(`cases ${cases}  mismatches ${bad}  ${bad === 0 ? 'EXACT' : 'FAILED'}`);
console.log(`stats ${JSON.stringify(st)}`);
console.log(`window-priced fraction of attempts: ${(st.hits / Math.max(1, st.attempts) * 100).toFixed(2)}%`);
process.exit(bad === 0 ? 0 : 1);
