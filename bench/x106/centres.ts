/**
 * X106 — COST-CENTRE CENSUS OF THE **CURRENT** FRONTIER.
 *
 * bench/x97/centres.ts is the right instrument but it reads the X87 committed
 * wires, which predate ΓΕΝΝΑΔΑΣ, ΣΤΑΘΜΟΣ, ΤΥΠΟΣ, ΔΙΑΓΡΑΦΗ, ΠΑΛΙΝΔΡΟΜΟΣ,
 * ΠΡΟΑΓΩΓΗ and the X104 clock repair.  This probe runs the same split on the
 * messages the current chain actually emits, under the same pinned flags as
 * bench/x104/frontier.ts, so the numbers describe the frontier that has to be
 * beaten and not a superseded one.
 *
 * The split is the ΧΕΙΡΩΝ frame: contract ‖ §tape ¶ body.  Inside the body it
 * counts tokens that are a lone rule glyph (a reference) against literal text,
 * because that ratio is what decides the next codec: if references dominate the
 * body, the win is in encoding the reference SEQUENCE; if literals dominate,
 * the win is in finding more or better rules.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { CHIRON_START } from '../../src/lib/omega/chiron';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0';

const enc: any = 'o200k_base';
const lanes = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean);
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
  const r: any = tagstackFrontier(text, enc);
  const msg: string = r.message ?? r.wire ?? '';
  const w = msg.indexOf(CHIRON_START);
  const tEnd = msg.indexOf('\u00b6', w);
  const contract = msg.slice(0, w), tape = msg.slice(w + 1, tEnd), body = msg.slice(tEnd + 1);
  const tc = countTokens(contract, enc), tt = countTokens(tape, enc), tb = countTokens(body, enc);
  // A rule glyph is any non-ASCII-plane code point the tape introduces.  Count
  // BODY tokens that consist of a single such glyph (possibly with a leading
  // space, which o200k folds into the token) — those are pure references.
  const keys = new Set<string>();
  for (const ch of tape) if (ch.codePointAt(0)! > 0x370) keys.add(ch);
  let refToks = 0, litToks = 0;
  for (const c of (body.match(/ ?[\s\S]+?(?=[\s]|$)|[\s]/g) ?? [])) {
    const n = countTokens(c, enc);
    const stripped = c.replace(/^ /, '');
    if (stripped.length === 1 && keys.has(stripped)) refToks += n; else litToks += n;
  }
  rows.push({ lane: p.split('/').pop()!, cat: CAT[p.split('/').pop()!] ?? '?',
    total: r.messageTokens, sum: tc + tt + tb, contract: tc, tape: tt, body: tb,
    refToks, litToks, refFrac: +(refToks / Math.max(1, tb)).toFixed(4),
    rules: keys.size, bodyChars: body.length, chPerTok: +(body.length / Math.max(1, tb)).toFixed(2),
    raw: countTokens(text, enc), exact: r.decoded === text, parent: r.parentCodec });
}
fs.mkdirSync('bench/x104/receipts', { recursive: true });
fs.writeFileSync('bench/x104/receipts/centres-x106.json', JSON.stringify({ note: 'X106 cost centres of the CURRENT frontier, pinned flags as bench/x104/frontier.ts', rows }, null, 1) + '\n');
console.log('lane                       cat           total   ctr   tape  body  refs   lit   ref%  rules  ch/tok  raw');
for (const r of rows) console.log(`${r.lane.padEnd(24)} ${r.cat.padEnd(12)} ${String(r.total).padStart(5)} ${String(r.contract).padStart(5)} ${String(r.tape).padStart(5)} ${String(r.body).padStart(5)} ${String(r.refToks).padStart(5)} ${String(r.litToks).padStart(5)} ${(100 * r.refFrac).toFixed(1).padStart(5)}% ${String(r.rules).padStart(6)} ${String(r.chPerTok).padStart(6)} ${String(r.raw).padStart(5)}`);
const T = rows;
console.log(`\nTOTAL ${T.reduce((a, b) => a + b.total, 0)}  contract ${T.reduce((a, b) => a + b.contract, 0)}  tape ${T.reduce((a, b) => a + b.tape, 0)}  body ${T.reduce((a, b) => a + b.body, 0)}  (refs ${T.reduce((a, b) => a + b.refToks, 0)} = ${(100 * T.reduce((a, b) => a + b.refToks, 0) / T.reduce((a, b) => a + b.body, 0)).toFixed(1)}% of body)`);
console.log('by category:');
for (const c of [...new Set(rows.map((r) => r.cat))]) {
  const g = rows.filter((r) => r.cat === c);
  const tot = g.reduce((a, b) => a + b.total, 0), ct = g.reduce((a, b) => a + b.contract, 0), tp = g.reduce((a, b) => a + b.tape, 0), bd = g.reduce((a, b) => a + b.body, 0), rf = g.reduce((a, b) => a + b.refToks, 0);
  console.log(`  ${c.padEnd(12)} n=${String(g.length).padStart(2)}  total ${String(tot).padStart(5)}  contract ${String(ct).padStart(4)} (${(100 * ct / tot).toFixed(1)}%)  tape ${String(tp).padStart(5)} (${(100 * tp / tot).toFixed(1)}%)  body ${String(bd).padStart(5)} (${(100 * bd / tot).toFixed(1)}%)  refs ${String(rf).padStart(4)} (${(100 * rf / Math.max(1, bd)).toFixed(1)}% of body)`);
}
console.log(`\nexact ${rows.filter((r) => r.exact).length}/${rows.length}`);
