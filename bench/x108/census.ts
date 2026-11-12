/**
 * X108 — WHERE DO THE 12 315 TOKENS SIT, AND IS THERE HEADROOM IN THE GLYPH STREAM?
 *
 * X106's census split the IDENTITY layer (734/3403/8878).  ΠΕΡΙΚΟΠΈ has since taken
 * ~45 tokens off the contract, and the honest frontier is now the `tagstackEncode`
 * figure.  This probe re-runs the split on the function the encoder actually ships.
 *
 * THE NEW MEASUREMENT, and the reason this probe exists.  ΧΕΙΡΩΝ emits a glyph
 * stream.  Every glyph is a token *if the tokenizer does not merge adjacent glyphs*.
 * If some adjacent glyph PAIR is a single o200k token, then two glyphs placed next to
 * each other cost 1 token instead of 2 — and the number of such adjacencies in the
 * emitted body is unclaimed headroom that no per-glyph pass can see.  This is the
 * lever "glyph relabelling" was supposed to test and did not, because relabelling
 * changes WHICH glyph is which while this asks whether the tokenizer merges the PAIR.
 *
 * A control the code under test did not produce: the same adjacency count computed on
 * a string with the glyphs replaced by a fixed non-merging placeholder, which gives
 * the count the merge hypothesis predicts when it is false.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { CHIRON_START } from '../../src/lib/omega/chiron';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';
const laneFile = process.argv[2] ?? '/tmp/lanes.txt';
const lanes = fs.readFileSync(laneFile, 'utf8').split('\n').filter(Boolean);
const CAT: Record<string, string> = {
  'lsblk.txt': 'ops-listing', 'uptime-w.txt': 'ops-listing', 'free-m.txt': 'ops-listing',
  'vmstat.txt': 'ops-listing', 'df-h.txt': 'ops-table', 'df-real.txt': 'ops-table',
  'du-real.txt': 'ops-table', 'findmnt.txt': 'ops-table', 'kubectl-get-pods.txt': 'ops-table',
  'ps-ef.txt': 'ops-table', 'ps-real.txt': 'ops-table', 'ps-aux-real.txt': 'ops-table',
  'apt-real.txt': 'ops-table', 'ls-real.txt': 'ops-listing', 'ls-l-real.txt': 'ops-listing',
  'dpkg-l.txt': 'ops-table', 'metrics.tsv': 'ops-table',
  'unified-diff.patch': 'code-markup', 'json-pkg.txt': 'code-markup', 'code-ts.txt': 'code-markup',
  'markdown-table.md': 'data', 'prices.csv': 'data', 'psql-output.txt': 'data',
  'kb-article.txt': 'prose', 'node-help.txt': 'prose', 'email-thread.txt': 'prose', 'llm-answer.md': 'prose',
};
const rows: any[] = [];
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const r: any = tagstackEncode(text, enc);
  const msg: string = r.message ?? r.wire ?? '';
  const w = msg.indexOf(CHIRON_START);
  const tEnd = w < 0 ? -1 : msg.indexOf('\u00b6', w);
  if (w < 0 || tEnd < 0) {
    rows.push({ lane: p.split('/').pop()!, cat: CAT[p.split('/').pop()!] ?? '?', total: r.messageTokens, noFrame: true, exact: r.decoded === text, parent: r.parentCodec, msg, msgTok: r.messageTokens });
    console.log(`${p.split('/').pop()!.padEnd(22)} NO ΧΕΙΡΩΝ FRAME (parent ${r.parentCodec}) total ${r.messageTokens}`);
    continue;
  }
  const contract = msg.slice(0, w), tape = msg.slice(w + 1, tEnd), body = msg.slice(tEnd + 1);
  const tc = countTokens(contract, enc), tt = countTokens(tape, enc), tb = countTokens(body, enc);
  const keys = new Set<string>();
  for (const ch of tape) if (ch.codePointAt(0)! > 0x370) keys.add(ch);
  let refToks = 0, litToks = 0;
  for (const c of (body.match(/ ?[\s\S]+?(?=[\s]|$)|[\s]/g) ?? [])) {
    const n = countTokens(c, enc);
    const stripped = c.replace(/^ /, '');
    if (stripped.length === 1 && keys.has(stripped)) refToks += n; else litToks += n;
  }
  // ---- THE NEW MEASUREMENT: adjacent glyph-glyph pairs in tape+body, and how many
  //      of them the tokenizer already merges into ONE token.
  const stream = tape + body;
  let adjPairs = 0, mergedPairs = 0, ctrlPairs = 0, ctrlMerged = 0;
  const seen = new Set<string>();
  for (let i = 0; i + 1 < stream.length; i++) {
    const a = stream[i]!, b = stream[i + 1]!;
    if (a.codePointAt(0)! <= 0x370 || b.codePointAt(0)! <= 0x370) continue;
    adjPairs++;
    const k = a + b;
    if (seen.has(k)) continue;
    seen.add(k);
    if (countTokens(k, enc) === 1) mergedPairs++;
    // control: the same adjacency with the glyphs replaced by a placeholder that the
    // tokenizer has no reason to merge (U+E000 private use, one token each)
    const ck = '\uE000\uE001';
    if (countTokens(ck, enc) === 1) ctrlMerged++;
    ctrlPairs++;
  }
  rows.push({ lane: p.split('/').pop()!, cat: CAT[p.split('/').pop()!] ?? '?', total: r.messageTokens,
    contract: tc, tape: tt, body: tb, refToks, litToks, refFrac: +(refToks / Math.max(1, tb)).toFixed(4),
    rules: keys.size, adjPairs, uniqPairs: seen.size, mergedPairs, ctrlPairs, ctrlMerged,
    exact: r.decoded === text, parent: r.parentCodec, raw: countTokens(text, enc) });
}
fs.mkdirSync('bench/x108/receipts', { recursive: true });
fs.writeFileSync('bench/x108/receipts/census.json', JSON.stringify({ note: 'X108 cost centres of the CURRENT chain (tagstackEncode), with the glyph-adjacency measurement', rows }, null, 1) + '\n');
console.log('lane                       cat           total   ctr   tape  body  refs   lit   ref%  rules  adj  uniq  mrg  ctl');
for (const r of rows) {
  if (r.noFrame) continue;
  console.log(`${r.lane.padEnd(24)} ${r.cat.padEnd(12)} ${String(r.total).padStart(5)} ${String(r.contract).padStart(5)} ${String(r.tape).padStart(5)} ${String(r.body).padStart(5)} ${String(r.refToks).padStart(5)} ${String(r.litToks).padStart(5)} ${(100 * r.refFrac).toFixed(1).padStart(5)}% ${String(r.rules).padStart(6)} ${String(r.adjPairs).padStart(5)} ${String(r.uniqPairs).padStart(5)} ${String(r.mergedPairs).padStart(4)} ${String(r.ctrlMerged).padStart(4)}`);
}
const T = rows.filter((r) => !r.noFrame);
if (T.length) {
  console.log(`\nTOTAL ${T.reduce((a, b) => a + b.total, 0)}  contract ${T.reduce((a, b) => a + b.contract, 0)} (${(100 * T.reduce((a, b) => a + b.contract, 0) / T.reduce((a, b) => a + b.total, 0)).toFixed(1)}%)  tape ${T.reduce((a, b) => a + b.tape, 0)} (${(100 * T.reduce((a, b) => a + b.tape, 0) / T.reduce((a, b) => a + b.total, 0)).toFixed(1)}%)  body ${T.reduce((a, b) => a + b.body, 0)} (${(100 * T.reduce((a, b) => a + b.body, 0) / T.reduce((a, b) => a + b.total, 0)).toFixed(1)}%)`);
  console.log(`refs ${T.reduce((a, b) => a + b.refToks, 0)} = ${(100 * T.reduce((a, b) => a + b.refToks, 0) / T.reduce((a, b) => a + b.body, 0)).toFixed(1)}% of body`);
  console.log(`adjacent glyph-glyph pairs ${T.reduce((a, b) => a + b.adjPairs, 0)}  distinct ${T.reduce((a, b) => a + b.uniqPairs, 0)}  merged to 1 token ${T.reduce((a, b) => a + b.mergedPairs, 0)}  control merged ${T.reduce((a, b) => a + b.ctrlMerged, 0)}`);
}
console.log(`exact ${rows.filter((r) => r.exact).length}/${rows.length}`);
