/**
 * X100 — ΠΡΟΠΑΡΑΣΚΕΥΗ (proparaskeue, "preparation"): RELOCATE A RULE EARLIER SO IT BECOMES A FACTOR.
 *
 * THE COUPLING, STATED EXACTLY.  ΣΥΝΔΥΑΣΜΟΣ re-spells a value using references to STRICTLY EARLIER
 * rules.  So a rule j that sits AFTER rule i can never be a factor for i -- no matter how perfect a
 * prefix of value(i) its own value is.  ΜΕΤΑΤΑΞΙΣ relocates rules, but for ONE objective: boundary
 * fusion.  It has no notion that a relocation could ENABLE a re-spelling.
 *
 * THIS PROBE.  For every ordered pair (i, j) with j AFTER i, check whether value(j) is a prefix or a
 * suffix of value(i).  If so, relocating j to immediately before i makes it a legal factor, and
 * value(i) can be re-spelled k_j + rest (or rest + k_j) -- converting a DEAD script->ASCII boundary
 * into a live script->script one (glossa.json: 0 vocabulary tokens of the S->A shape against 823
 * cyrillic / 3 417 polyglot of the S->S shape).
 *
 * Two numbers decide it: the population of such pairs, and whether the relocation that enables them
 * is legal (j must not depend on i) and affordable (the relocation must not cost more than the
 * re-spelling saves).
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
import { syndyasmosEncode } from '../../src/lib/omega/syndyasmos';

process.env.OMEGA_DET = '1';
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
/** does rule j (at tape index j) depend on rule i?  i.e. does key j's letter occur in value i's text */
function depends(wr: Wire, from: number, on: number): boolean {
  return wr.values[from].includes(wr.keys[on]);
}
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41','bench/holdout','bench/holdout-work','bench/holdout-x42','bench/holdout-x42b','bench/holdout-tbl','bench/holdout-x40','bench/holdout-ops','bench/holdout-lang','bench/holdout-mk','bench/holdout-x86','bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const p = `${d}/${lane}${e}`; if (fs.existsSync(p)) return p; }
  }
  throw new Error('no source for ' + lane);
};

const rows: any[] = [];
let gPop = 0, gLegal = 0, gGain = 0;
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const lane = f.replace('.wire.txt', '');
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const t0 = countTokens(msg, enc);
  const S: any = syndyasmosEncode(text, enc, { message: msg, messageTokens: t0, decoded: text });
  const wr = parse(S.applied ? S.message : msg);
  const n = wr.keys.length;
  // POPULATION: pairs (i, j), j after i, value(j) a prefix or suffix of value(i)
  let pop = 0, legal = 0;
  const cands: Array<{ i: number; j: number; kind: 'pre' | 'suf' }> = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const v = wr.values[j];
      if (v.length === 0) continue;
      if (wr.values[i].startsWith(v)) { pop++; cands.push({ i, j, kind: 'pre' }); }
      else if (wr.values[i].endsWith(v)) { pop++; cands.push({ i, j, kind: 'suf' }); }
    }
  }
  // LEGALITY: relocating j to just before i is legal iff j does not depend on i (directly or via
  // the rules between).  A cheap sound test: j's value must not mention key i, and no rule between
  // i and j that j mentions may depend on i.
  for (const c of cands) {
    if (depends(wr, c.j, c.i)) continue;
    let ok = true;
    for (let k = c.i + 1; k < c.j; k++) if (wr.values[c.j].includes(wr.keys[k]) && depends(wr, k, c.i)) { ok = false; break; }
    if (ok) legal++;
  }
  // PRICE the best enabling relocation: move j to just before i, then re-spell value(i)
  let best = 0;
  for (const c of cands) {
    if (depends(wr, c.j, c.i)) continue;
    const order = wr.keys.map((_, x) => x);
    const rest = order.filter(x => x !== c.j);
    const at = rest.indexOf(c.i);
    const next = rest.slice(0, at).concat([c.j], rest.slice(at));
    const nv = wr.values.slice();
    nv[c.i] = c.kind === 'pre' ? wr.keys[c.j] + wr.values[c.i].slice(wr.values[c.j].length)
                               : wr.values[c.i].slice(0, wr.values[c.i].length - wr.values[c.j].length) + wr.keys[c.j];
    const m = emit(wr, next.map(x => wr.keys[x]), next.map(x => nv[x]));
    const tk = countTokens(m, enc);
    if (tk < best || best === 0) best = best === 0 ? tk - countTokens(emit(wr, wr.keys, wr.values), enc) : Math.min(best, tk - countTokens(emit(wr, wr.keys, wr.values), enc));
  }
  gPop += pop; gLegal += legal; gGain += best;
  rows.push({ lane: f, rules: n, population: pop, legal, bestDelta: best, synd: S.messageTokens, t0 });
  console.log(`${f.padEnd(20)} n=${String(n).padStart(3)}  enabling pairs=${String(pop).padStart(4)} legal=${String(legal).padStart(4)}  best single-move Δ=${String(best).padStart(4)}  (synd ${t0}->${S.messageTokens})`);
}
console.log(`\nΠΡΟΠΑΡΑΣΚΕΥΗ: population ${gPop} pairs, ${gLegal} legal, best single-move Δ ${gGain} over the ten wires`);
fs.writeFileSync('bench/x100/receipts/proparaskeue.json', JSON.stringify({ rows, gPop, gLegal, gGain }, null, 1));
