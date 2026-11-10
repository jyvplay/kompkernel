/**
 * X101 — ΜΕΡΙΔΕΣ (merides, "portions"): cost breakdown of the FINAL chain output on the ten
 * authoritative lanes, plus the literal-token histogram of the body.
 *
 * Every local move in the wire-level stack is closed by measurement, so the next mechanism has to be
 * aimed at whatever is actually left.  This probe prices the shipped chain's own output and splits it
 * into contract / tape / body, then histograms the body's tokens by whether they are references
 * (single script letter) or literals, so the residual is characterised rather than guessed at.
 */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const wireDir = 'bench/x87/receipts/wires';
const lanes = fs.readdirSync(wireDir).filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41', 'bench/holdout', 'bench/holdout-work', 'bench/holdout-x42', 'bench/holdout-x42b', 'bench/holdout-tbl', 'bench/holdout-x40', 'bench/holdout-ops', 'bench/holdout-lang', 'bench/holdout-mk', 'bench/holdout-x86', 'bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const f = `${d}/${lane}${e}`; if (fs.existsSync(f)) return f; }
  }
  throw new Error('no source for ' + lane);
};
const rows: any[] = [];
let gC = 0, gT = 0, gB = 0, gRef = 0, gLit = 0;
for (const lane of lanes) {
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const R: any = tagstackEncode(text, enc);
  const msg = R.message;
  const w = msg.indexOf(CHIRON_START);
  const t = msg.indexOf(CHIRON_SEP, w);
  const contract = w < 0 ? msg : msg.slice(0, w);
  const tape = w < 0 ? '' : msg.slice(w + 1, t);
  const body = w < 0 ? '' : msg.slice(t + 1);
  const cT = w < 0 ? countTokens(msg, enc) : countTokens(contract, enc);
  const tT = w < 0 ? 0 : countTokens(CHIRON_START + tape + CHIRON_SEP, enc);
  const bT = w < 0 ? 0 : countTokens(body, enc);
  const T = w < 0 ? [] : tokenStrings(body, enc).map(x => x.s);
  const refs = T.filter(s => s.length === 1 && s.codePointAt(0)! > 0x370).length;
  const lits = T.length - refs;
  gC += cT; gT += tT; gB += bT; gRef += refs; gLit += lits;
  // most common literal tokens in the body
  const hist = new Map<string, number>();
  for (const s of T) if (!(s.length === 1 && s.codePointAt(0)! > 0x370)) hist.set(s, (hist.get(s) ?? 0) + 1);
  const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  rows.push({ lane, total: R.messageTokens, contract: cT, tape: tT, body: bT, bodyTokens: T.length, refs, lits, topLiterals: top });
  console.log(`${lane.padEnd(18)} tot=${String(R.messageTokens).padStart(5)}  contract=${String(cT).padStart(3)} tape=${String(tT).padStart(4)} (${(100 * tT / R.messageTokens).toFixed(0)}%) body=${String(bT).padStart(4)} (${(100 * bT / R.messageTokens).toFixed(0)}%)  bodyTok=${String(T.length).padStart(4)} ref=${String(refs).padStart(4)} lit=${String(lits).padStart(4)}  top=${JSON.stringify(top.slice(0, 5))}`);
}
const tot = gC + gT + gB;
fs.writeFileSync('bench/x101/receipts/merides.json', JSON.stringify({ rows, totals: { contract: gC, tape: gT, body: gB, refs: gRef, lits: gLit, sum: tot } }, null, 1));
console.log(`\nMERIDES over the ten lanes: contract=${gC} tape=${gT} (${(100 * gT / tot).toFixed(1)}%) body=${gB} (${(100 * gB / tot).toFixed(1)}%)  sum=${tot}`);
console.log(`  body literals=${gLit} (${(100 * gLit / tot).toFixed(1)}% of the message), body references=${gRef}`);
