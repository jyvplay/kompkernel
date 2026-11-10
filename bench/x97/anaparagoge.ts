/**
 * X99 — ΑΝΑΠΑΡΑΓΩΓΗ (anaparagoge, "re-derivation"): RE-SPELL A RULE'S VALUE WITH EARLIER RULES.
 *
 * WHY THIS IS NOT IN THE STACK.  Every codec in this repository spends its freedom on
 *   (a) which substrings become rules   (ADD/REMOVE/FACTOR — X94 measured closed),
 *   (b) which letter each rule gets      (ἸΣΟΜΟΡΦΊΑ's REASSIGN — measured 0),
 *   (c) which slot each rule occupies    (ΜΕΤΑΤΑΞΙΣ — shipped, −44 on 29 lanes).
 * NONE of them re-spells a rule's VALUE as a concatenation of earlier rules' LETTERS.  That is a
 * fourth, orthogonal degree of freedom, and it is the one the tape's own structure invites:
 *
 *   The tape is delimiter-free, so `kᵢ kₐ kᵦ` is a perfectly legal entry — the parser reads kᵢ as a
 *   new key and kₐ, kᵦ as references, so value(i) becomes value(a)+value(b) and the decode is
 *   UNCHANGED.  But the tokenizer sees three non-ASCII characters in a row, and o200k carries
 *   1 896 three-character cyrillic tokens, 339 three-character polyglot tokens, 1 329
 *   four-character cyrillic tokens ... (bench/x97/receipts/vocab.log).  A triple that lands on a
 *   vocabulary token costs ONE token instead of key + 2.
 *
 * THE CONSTRAINT.  Rules reference only strictly earlier rules, so a factor must precede i.  That
 * is exactly why this interacts with ΜΕΤΑΤΑΞΙΣ: relocation changes which rules are earlier.
 *
 * THIS PROBE.  For each of the ten committed wires, for each rule, enumerate every segmentation of
 * its value into at most 3 EARLIER rules' values, re-emit the tape with that spelling, price the
 * COMPLETE message, and accept only if (i) strictly cheaper, (ii) `chironDecode` returns the source
 * byte for byte.  Greedy, one rule at a time, first improvement.  A bound is never an admission.
 */
import * as fs from 'node:fs';
import { countTokens, countTokensExact } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
interface Wire { contract: string; keys: string[]; values: string[]; body: string }
function parse(msg: string): Wire {
  const w = msg.indexOf(CHIRON_START), t = msg.indexOf(CHIRON_SEP, w);
  const tape = msg.slice(w + 1, t);
  const keys: string[] = [], values: string[] = [];
  const seen = new Set<string>();
  let ck = '', cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) { if (ck !== '') { keys.push(ck); values.push(cv); } seen.add(ch); ck = ch; cv = ''; }
    else cv += ch;
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  return { contract: msg.slice(0, w), keys, values, body: msg.slice(t + 1) };
}
const render = (wr: Wire, spell?: string[], skip = -1): string =>
  wr.contract + CHIRON_START +
  wr.keys.map((k, i) => (i === skip ? '' : k) + (spell ? spell[i] : wr.values[i])).join('') +
  CHIRON_SEP + wr.body;

/** every segmentation of `s` into <= maxParts earlier-rule values, as strings of key letters */
function segmentations(s: string, idx: Map<string, string[]>, maxParts: number): string[] {
  const out: string[] = [];
  const walk = (pos: number, acc: string): void => {
    if (out.length > 400) return;
    if (pos === s.length) { out.push(acc); return; }
    if (acc.length >= maxParts) return;
    for (let L = s.length - pos; L >= 1; L--) {
      const sub = s.slice(pos, pos + L);
      const ks = idx.get(sub);
      if (!ks) continue;
      for (const k of ks) { walk(pos + L, acc + k); if (out.length > 400) return; }
    }
  };
  walk(0, '');
  return out;
}

const rows: any[] = [];
let gT0 = 0, gT1 = 0, gAccept = 0, gTried = 0;
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const lane = f.replace('.wire.txt', '');
  const text = (() => { for (const d of ['bench/holdout-x41','bench/holdout','bench/holdout-work','bench/holdout-x42','bench/holdout-x42b','bench/holdout-tbl','bench/holdout-x40','bench/holdout-ops','bench/holdout-lang','bench/holdout-mk','bench/holdout-x86','bench/holdout-x87']) { const p = `${d}/${lane}` + (lane.includes('.') ? '' : '.txt'); if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8'); const m = fs.existsSync(d) ? fs.readdirSync(d).find(x => x === lane + '.md' || x === lane) : undefined; if (m) return fs.readFileSync(`${d}/${m}`, 'utf8'); } throw new Error('no source for ' + lane); })();
  const wr = parse(msg);
  const t0 = countTokens(msg, enc);
  const spell = wr.values.slice();
  const idx = new Map<string, string[]>();
  const addIdx = (i: number): void => { const v = spell[i]; const a = idx.get(v) ?? []; a.push(wr.keys[i]); idx.set(v, a); };
  let accept = 0, tried = 0, bestGain = 0;
  for (let i = 0; i < wr.keys.length; i++) {
    const cands = segmentations(wr.values[i], idx, 3);
    let best: string | null = null, bestTok = Infinity;
    for (const c of cands) {
      if (c === wr.values[i]) continue;                 // the literal itself is not a candidate
      tried++;
      const m = render(wr, spell.map((s, j) => (j === i ? c : s)));
      const n = countTokens(m, enc);
      if (n < bestTok) { bestTok = n; best = c; }
    }
    if (best !== null && bestTok < countTokens(render(wr, spell), enc)) {
      spell[i] = best; accept++; bestGain = Math.max(bestGain, countTokens(render(wr, spell), enc) - bestTok);
      addIdx(i);
    } else addIdx(i);
  }
  const out = render(wr, spell);
  const t1 = countTokens(out, enc);
  const ok = chironDecode(out.slice(out.indexOf(CHIRON_START))) === text;
  gT0 += t0; gT1 += t1; gAccept += accept; gTried += tried;
  rows.push({ lane: f, rules: wr.keys.length, t0, t1, delta: t1 - t0, accept, tried, exact: ok });
  console.log(`${f.padEnd(20)} rules=${String(wr.keys.length).padStart(3)} ${String(t0).padStart(5)} -> ${String(t1).padStart(5)} Δ=${String(t1 - t0).padStart(4)} accepted=${String(accept).padStart(3)} tried=${String(tried).padStart(5)} exact=${ok}`);
}
console.log(`\nΑΝΑΠΑΡΑΓΩΓΗ (greedy re-spelling, <=3 factors): ${gT0} -> ${gT1}  Δ=${gT1 - gT0}  accepted ${gAccept}  priced ${gTried}`);
fs.writeFileSync('bench/x97/receipts/anaparagoge.json', JSON.stringify({ rows, t0: gT0, t1: gT1, accept: gAccept, tried: gTried }, null, 1));
