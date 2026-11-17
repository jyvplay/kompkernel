/**
 * X133 — TRUE-PRICED DICTIONARY PURGE (mechanism candidate "ΚΑΘΑΡΣΙΣ").
 *
 * A rule with value V costing T tokens, occurring c times, pays iff
 *      c*T  >  (1 + T + c)          [tape: 1 glyph + T value tokens; body: c refs]
 * i.e. c*(T-1) > T + 1.
 * For T = 1 this reads 0 > 2 — FALSE for every c. A one-token rule can NEVER
 * pay. The frontier's miners nevertheless emit them (code-ts ships rules whose
 * values are "\n", "     ", ".length", "1"), which means the miners price with
 * an ESTIMATE, in characters, not with the real tokenizer on the real message.
 *
 * This tool prices DROPPING each rule against the real whole-message token
 * count and iterates to a fixed point, then tries joint drops of pairs.
 * Candidate rules are also cross-checked against the analytic bound.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1'; process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';
type Rule = { g: string; v: string };

const MARKERS = new Set(['§', '¶', '¦', '†', '‡', '•', '·', '±', '×', '÷', '≠', '∞', '≈', '≤', '≥']);
function glyphSetFor(srcText: string, msg: string): Set<string> {
  const src = new Set<string>();
  for (let i = 0; i < srcText.length; i++) src.add(srcText[i]!);
  const g = new Set<string>();
  for (let i = 0; i < msg.length; i++) {
    const ch = msg[i]!;
    if (!src.has(ch) && !MARKERS.has(ch)) g.add(ch);
  }
  return g;
}
function parseTape(t: string, G: Set<string>): Rule[] {
  const rs: Rule[] = []; const seen = new Set<string>(); let cur: Rule | null = null;
  for (const ch of t) {
    if (G.has(ch) && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; rs.push(cur); }
    else if (cur) cur.v += ch;
  }
  return rs;
}
const buildTape = (rs: Rule[]) => '§' + rs.map(r => r.g + r.v).join('');
const rep = (s: string, a: string, b: string) => (a.length ? s.split(a).join(b) : s);

/** inline rule `drop` everywhere (body + sibling values) and return the message */
function without(rules: Rule[], body: string, drop: Rule): { rules: Rule[]; body: string } {
  return {
    rules: rules.filter(x => x.g !== drop.g).map(x => ({ g: x.g, v: rep(x.v, drop.g, drop.v) })),
    body: rep(body, drop.g, drop.v),
  };
}

let SUM_A = 0, SUM_B = 0, SUM_C = 0, lanes = 0;
for (const p of (process.env.LANES ?? '').split(',').filter(Boolean)) {
  const text = fs.readFileSync(p, 'utf8');
  const a: any = tagstackEncode(text, enc);
  const M = a.message as string;
  const G = glyphSetFor(text, M);
  const i1 = M.indexOf('§');
  const i2 = i1 < 0 ? -1 : M.indexOf('¶', i1);
  if (i1 < 0 || i2 < 0) { console.log(`${p.split('/').pop()!.padEnd(20)} no tape structure — skip`); continue; }
  const pre = M.slice(0, i1);
  const tape = M.slice(i1, i2);
  const body = M.slice(i2);
  let rules = parseTape(tape, G);
  let curBody = body;
  const base = a.messageTokens;
  const price = (rs: Rule[], b: string) => countTokens(pre + buildTape(rs) + b, enc);

  // sanity: the parse must reproduce the original message exactly
  const roundTrip = pre + buildTape(rules) + curBody === M;
  // analytic census: how many rules violate c*(T-1) > T+1 ?
  let t1 = 0;
  for (const r of rules) if (countTokens(r.v, enc) <= 1) t1++;

  // ---- pass 1: iterated single-rule drops, priced truly, to a fixed point
  let cur = price(rules, curBody);
  let dropped: string[] = [];
  for (let sweep = 0; sweep < 40; sweep++) {
    let bestGain = 0, bestIdx = -1;
    for (let k = 0; k < rules.length; k++) {
      const t = without(rules, curBody, rules[k]!);
      // a rule may only be dropped if it is not referenced by a LATER rule we keep
      const g2 = price(t.rules, t.body);
      if (cur - g2 > bestGain) { bestGain = cur - g2; bestIdx = k; }
    }
    if (bestIdx < 0) break;
    const d = rules[bestIdx]!;
    dropped.push(d.g);
    const t = without(rules, curBody, d);
    rules = t.rules; curBody = t.body; cur -= bestGain;
  }
  const after1 = cur;

  // ---- pass 2: SECOND-ORDER. now re-test every rule (context changed) and
  // also try dropping the two cheapest-value rules jointly.
  let after2 = after1;
  for (let sweep = 0; sweep < 20; sweep++) {
    let bestGain = 0, bestIdx = -1;
    for (let k = 0; k < rules.length; k++) {
      const t = without(rules, curBody, rules[k]!);
      const g2 = price(t.rules, t.body);
      if (after2 - g2 > bestGain) { bestGain = after2 - g2; bestIdx = k; }
    }
    if (bestIdx < 0) break;
    const d = rules[bestIdx]!;
    const t = without(rules, curBody, d);
    rules = t.rules; curBody = t.body; after2 -= bestGain;
  }

  SUM_A += base; SUM_B += after2; lanes++;
  console.log(`${p.split('/').pop()!.padEnd(20)} base=${String(base).padStart(5)} -> purge=${String(after2).padStart(5)}  Δ=${String(after2 - base).padStart(4)}   (rules ${a.messageTokens ? '' : ''}${rules.length}, T<=1: ${t1}, dropped ${dropped.length}, roundTrip=${roundTrip})`);
}
console.log(`\nPURGE ${lanes} lanes   A ${SUM_A}  B ${SUM_B}  ΣΔ ${SUM_B - SUM_A}`);
