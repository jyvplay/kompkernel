/**
 * X100 — ΣΥΣΣΩΡΕΥΣΗ (syssoreuse, "heaping"): HOIST A REPEATED BODY TOKEN-N-GRAM INTO A RULE.
 *
 * THE GAP THIS TARGETS, STATED AS A MEASUREMENT CONTRADICTION.
 *   · X97's FUSE arm searched for a repeated *run* of reference letters of length >= 5 and found
 *     none ("extracting a repeated run of length >=5 (none exist)"), so it concluded 0/93.
 *   · X100's ΣΤΗΛΗ scan of the same bodies found n-grams of the REDUCED reference sequence with
 *     n = 2 occurring up to 7 times: dpkg-l "іі" x6, json-pkg "сс" x7, ls-real "лӷ" x5,
 *     ls-l-real "סय" x5.
 * Those are different objects.  A 2-gram occurring 7 times is not a 5-run.  FUSE's length
 * predicate excluded exactly the population that exists.
 *
 * THE CONSTRUCTION.  The body is a token sequence.  Take a token n-gram g occurring c times.  Add a
 * tape rule whose key is a fresh script letter and whose value is g's source text (a string of
 * already-declared reference letters, hence a legal strictly-backwards reference).  Replace every
 * occurrence of g in the body with the new key.
 *
 *     rule cost      = 1 key + countTokens(value)
 *     body saving    = c * (n - 1)          -- n tokens become 1
 *     net            = 1 + countTokens(value) - c * (n - 1)
 *
 * For "сс" x7 with a 2-token value that is 1 + 2 - 7 = -4.  Break-even is c*(n-1) > 1 + n, i.e.
 * c >= 4 for n = 2.
 *
 * PLACEMENT IS A FREE PARAMETER.  The rule may be appended at the end of the tape or inserted after
 * its last factor; both are legal, and they price differently because the tape is delimiter-free and
 * every insertion re-prices the boundary it lands on.  Both are measured.
 */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode, CHIRON_SCRIPTS } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
interface Wire { contract: string; keys: string[]; values: string[]; body: string }
function parse(msg: string): Wire {
  const w = msg.indexOf(CHIRON_START), t = msg.indexOf(CHIRON_SEP, w);
  const tape = msg.slice(w + 1, t);
  const keys: string[] = [], values: string[] = [];
  const seen = new Set<string>(); let ck = '', cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) { if (ck !== '') { keys.push(ck); values.push(cv); } seen.add(ch); ck = ch; cv = ''; }
    else cv += ch;
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  return { contract: msg.slice(0, w), keys, values, body: msg.slice(t + 1) };
}
const emit = (wr: Wire, keys: string[], values: string[]): string =>
  wr.contract + CHIRON_START + keys.map((k, i) => k + values[i]).join('') + CHIRON_SEP + wr.body;
/** a fresh key letter: the first letter of the wire's declared script not already used */
function freshKey(wr: Wire): string {
  const sc = CHIRON_SCRIPTS.find((s: any) => wr.keys.length > 0 && wr.keys[0] >= String.fromCodePoint(s.ranges ? s.ranges[0][0] : s.lo) && wr.keys[0] <= String.fromCodePoint(s.ranges ? s.ranges[s.ranges.length-1][1] : s.hi)) as any;
  const spans = sc?.ranges ?? [[0x400, 0x500]];
  const used = new Set(wr.keys);
  for (const [a, b] of spans) for (let cp = a; cp < b; cp++) { const c = String.fromCodePoint(cp); if (!used.has(c) && countTokens(c, enc) === 1) return c; }
  throw new Error('no fresh key');
}
const rows: any[] = [];
let gBest = 0;
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const wr = parse(msg);
  const T = tokenStrings(wr.body, enc).map(x => x.s);
  const base = countTokens(msg, enc);
  // count token n-grams of the body, n = 2..6
  const found: Array<{ g: string; c: number; n: number }> = [];
  for (let n = 2; n <= 6; n++) {
    const cnt = new Map<string, number>();
    for (let i = 0; i + n <= T.length; i++) {
      const g = T.slice(i, i + n).join('\u0001');
      cnt.set(g, (cnt.get(g) ?? 0) + 1);
    }
    for (const [g, c] of cnt) if (c >= 3) found.push({ g, c, n });
  }
  // rank by the exact net model, then whole-message price the top candidates
  const nk = freshKey(wr);
  const scored = found.map(x => ({ ...x, net: 1 + countTokens(x.g.split('\u0001').join(''), enc) - x.c * (x.n - 1) }))
                      .sort((a, b) => a.net - b.net).slice(0, 40);
  let best = 0, bestDesc = '';
  for (const c of scored) {
    if (c.net >= 0) continue;
    const val = c.g.split('\u0001').join('');
    for (const mode of ['append', 'afterLastFactor']) {
      let keys = wr.keys.slice(), values = wr.values.slice();
      if (mode === 'append') { keys.push(nk); values.push(val); }
      else {
        let at = 0;
        for (let i = 0; i < wr.keys.length; i++) if (val.includes(wr.keys[i])) at = i;
        keys = keys.slice(0, at + 1).concat([nk], keys.slice(at + 1));
        values = values.slice(0, at + 1).concat([val], values.slice(at + 1));
      }
      const nw: Wire = { ...wr, keys, values };
      // replace every occurrence of the n-gram in the body with the fresh key
      const src = c.g.split('\u0001').join('');
      let body = wr.body, guard = 0;
      while (body.includes(src) && guard++ < 500) body = body.replace(src, nk);
      const m = emit(nw, keys, values).slice(0, emit(nw, keys, values).indexOf(CHIRON_SEP) + 1) + body;
      const tk = countTokens(m, enc);
      const d = tk - base;
      if (d < best) { best = d; bestDesc = `${mode} n=${c.n} x${c.c} ${val.slice(0, 14)} net=${c.net}`; }
    }
  }
  gBest += best;
  rows.push({ lane: f, base, candidates: found.length, bestDelta: best, bestDesc });
  console.log(`${f.padEnd(20)} base=${String(base).padStart(5)} cands=${String(found.length).padStart(4)}  BEST Δ=${String(best).padStart(4)}  ${bestDesc}`);
}
console.log(`\nΣΥΣΣΩΡΕΥΣΗ: pooled best single-hoist Δ = ${gBest} tokens over the ten wires (${(100 * gBest / 7844).toFixed(3)}% of 7 844)`);
fs.writeFileSync('bench/x100/receipts/syssoreuse.json', JSON.stringify({ rows, pooled: gBest }, null, 1));
