/**
 * X95 — THE TAPE'S VALUES ARE THE WEAKEST BLOCK IN THE MESSAGE, AND THEY ARE PREFIX-STRUCTURED.
 *
 * THE MEASUREMENT THAT OPENS THIS. tape-values.ts priced the tape's value population exactly:
 * 4 323 characters costing 1 671 tokens in isolation (2.59 ch/tok), against a 3.0 ch/tok digit
 * ceiling and a ~4.3 ch/tok English ceiling. ls-l-real's values are at 1.99 ch/tok, ps-aux-real
 * at 2.35, llm-answer at 2.29. This is the only block in the message that is priced far below
 * every known ceiling, and it is the largest block after the body: 1 671 of 7 864 tokens.
 *
 * WHY IT IS STRUCTURED. The values are the distinct content -- absolute paths, permission
 * strings, long identifiers -- and such strings share stems: `/usr/lib/`, `/etc/`, `/opt/`,
 * `../lib/`. 56 adjacent pairs in sorted order share a prefix of at least four characters.
 *
 * WHY THIS IS NOT X94's FACTOR. X94 priced 513 FACTOR moves and the corrected screen pruned 100 %
 * of them, but that census screened candidates by an ESTIMATE before pricing, and the estimate
 * law it was fit on (a marginal reference costs ~0.98 tokens net) was measured on BODY references,
 * where a reference sits between two non-glyph characters. A reference inside a tape value sits
 * between a glyph and a following suffix, which is a different boundary. So the tape-side
 * reference price is a measurement, not an assumption, and it has never been taken.
 *
 * THE EXACT TEST. A prefix P shared by k values is extracted into one new entry `h = P` placed at
 * the HEAD of the tape, so h is defined before every use and the tape stays positional. Each
 * value `P + s` becomes `h + s`. The body is untouched, so the entire delta is on the tape, and
 * the contract is untouched too -- the entry is an ordinary entry and needs no new rule. The
 * delta is an exact countTokens on the complete new message.
 *
 * ZERO frontier calls, zero encodes of any lane.
 */
import { countTokensExact, type EncodingName } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ENC = (process.env.X95_ENC ?? 'o200k_base') as EncodingName;
const ct = (s: string) => countTokensExact(s, ENC);
const CYRILLIC = 'абвгдежзийклмнопрстуфхцчшщъыьэюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';

function parseTape(tape: string): { g: string; v: string }[] {
  const seen = new Set<string>();
  const ents: { g: string; v: string }[] = [];
  let cur: { g: string; v: string } | null = null;
  for (const ch of tape) {
    if (ch.codePointAt(0)! > 127 && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; ents.push(cur); }
    else if (cur) cur.v += ch;
  }
  return ents;
}

/** every pure-ASCII prefix length that at least `minK` values share, longest first */
function prefixCandidates(ents: { g: string; v: string }[], minK: number): { p: string; k: number }[] {
  const byLen = new Map<number, Map<string, number>>();
  for (const e of ents) {
    // only values that BEGIN with literal ASCII can have their stem replaced unambiguously
    let lit = '';
    for (const ch of e.v) { if (ch.codePointAt(0)! > 127) break; lit += ch; }
    for (let L = 2; L <= lit.length; L++) {
      const p = lit.slice(0, L);
      let m = byLen.get(L); if (!m) { m = new Map(); byLen.set(L, m); }
      m.set(p, (m.get(p) ?? 0) + 1);
    }
  }
  const out: { p: string; k: number }[] = [];
  for (const [, m] of byLen) for (const [p, k] of m) if (k >= minK) out.push({ p, k });
  // drop a prefix that is a strict extension of another with the SAME support: the shorter one
  // dominates because it costs no more to enter and applies to at least as many values.
  out.sort((a, b) => a.p.length - b.p.length || b.k - a.k);
  const kept: { p: string; k: number }[] = [];
  for (const c of out) {
    const dominated = kept.some(x => c.p.startsWith(x.p) && x.k >= c.k);
    if (!dominated) kept.push(c);
  }
  return kept.sort((a, b) => b.k - a.k || b.p.length - a.p.length);
}

const files = process.argv.slice(2);
const L: string[] = [];
const receipt: any = { note: 'exact whole-message price of tape prefix extraction; zero frontier calls', lanes: [] };
let T = { msg: 0, best: 0, wins: 0, tested: 0 };
L.push('lane'.padEnd(14) + 'msgTok  cands  tested  WINS  best delta  best prefix');
for (const f of files) {
  const wire = fs.readFileSync(f, 'utf8');
  const name = path.basename(f).replace('.wire.txt', '');
  const sec = wire.indexOf('§'), pil = wire.indexOf('¶', sec);
  const contract = wire.slice(0, sec), tape = wire.slice(sec + 1, pil), body = wire.slice(pil + 1);
  const ents = parseTape(tape);
  const used = new Set<string>([...wire]);
  const h = [...CYRILLIC].find(c => !used.has(c)) ?? 'ҥ';
  const cands = prefixCandidates(ents, 2).slice(0, Number(process.env.X95_TOP ?? 40));
  let best = 0, bestP = '', wins = 0, tested = 0;
  const cases: any[] = [];
  for (const c of cands) {
    // rebuild the tape: head entry `h = P`, then every entry whose value starts with P gets that
    // stem replaced by a single reference h. Values that do not start with P are untouched.
    let newTape = h + c.p;
    let touched = 0;
    for (const e of ents) {
      newTape += e.g;
      if (e.v.startsWith(c.p)) { newTape += h + e.v.slice(c.p.length); touched++; }
      else newTape += e.v;
    }
    if (touched < c.k) continue;   // safety: the census must agree with the rebuild
    tested++;
    const delta = ct(contract + '§' + newTape + '¶' + body) - ct(wire);
    if (delta < 0) { wins++; cases.push({ prefix: c.p, k: touched, delta }); }
    if (delta < best) { best = delta; bestP = c.p; }
  }
  L.push(name.padEnd(14) + String(ct(wire)).padStart(6) + String(prefixCandidates(ents, 2).length).padStart(6) +
    String(tested).padStart(7) + String(wins).padStart(6) + String(best).padStart(11) + '  ' + JSON.stringify(bestP));
  receipt.lanes.push({ lane: name, msgTokens: ct(wire), candidates: prefixCandidates(ents, 2).length, tested, wins, bestDelta: best, bestPrefix: bestP, winningCases: cases.slice(0, 6) });
  T.msg += ct(wire); T.best = Math.min(T.best, best); T.wins += wins; T.tested += tested;
}
L.push('-'.repeat(96));
L.push(`TOTAL: msg ${T.msg}  candidates priced ${T.tested}  WINS ${T.wins}  best delta ${T.best}`);
L.push('');
L.push('reading: a NEGATIVE delta is an exact saving on the complete message, with the body and the');
L.push('contract both untouched. The winning cases are listed per lane in the receipt. A single');
L.push('prefix is tested at a time; a real arm would compose them, and the composition is bounded');
L.push('above by the sum of the individual negatives only if the moves do not interact, which they');
L.push('do -- so the sum is an upper bound on a composed arm, never a promise.');
const log = L.join('\n') + '\n';
fs.mkdirSync('bench/x95/receipts', { recursive: true });
fs.writeFileSync('bench/x95/receipts/tape-prefix.json', JSON.stringify(receipt, null, 1) + '\n');
fs.writeFileSync('bench/x95/receipts/tape-prefix.log', log);
console.log(log);
