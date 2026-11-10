/**
 * X97 — COST-CENTRE CENSUS OF THE SHIPPED MESSAGES.  Zero frontier calls: it reads the committed
 * receipt for the shipped parent per lane and re-derives nothing.  For each lane it splits the
 * committed message into CONTRACT / TAPE / BODY and, inside the body, counts how many tokens are
 * single reference glyphs (a rule key standing alone) versus literal text.  That last number is the
 * one that decides the next codec: if the body's references dominate, the win is in encoding the
 * reference SEQUENCE, not in finding more rules.
 */
import * as fs from 'node:fs';
import { countTokensExact } from '../../src/lib/omega/bpe';
import { CHIRON_START } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
const lanes = fs.readdirSync('bench/x87/receipts/wires').filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));
const wireDir = 'bench/x87/receipts/wires';
const rows: any[] = [];
for (const p of lanes) {
  const lane = p;
  const f = `${wireDir}/${lane}.wire.txt`;
  if (!fs.existsSync(f)) { rows.push({ lane, missing: true }); continue; }
  const msg = fs.readFileSync(f, 'utf8');
  const w = msg.indexOf(CHIRON_START);
  const tEnd = msg.indexOf('\u00b6', w);
  const contract = msg.slice(0, w), tape = msg.slice(w + 1, tEnd), body = msg.slice(tEnd + 1);
  const tc = countTokensExact(contract, enc), tt = countTokensExact(tape, enc), tb = countTokensExact(body, enc);
  // keys = letters that appear in the tape before any reference use
  const keys = new Set<string>();
  for (const ch of tape) if (ch.charCodeAt(0) > 0x370 && !keys.has(ch)) keys.add(ch);
  let refToks = 0, litToks = 0;
  const pretok = body.match(/ ?[\s\S]+?(?=[\s]|$)|[\s]/g) ?? [];
  for (const c of pretok) {
    const n = countTokensExact(c, enc);
    if (c.length === 1 && keys.has(c)) refToks += n; else litToks += n;
  }
  rows.push({ lane, path: p, total: tc + tt + tb, contract: tc, tape: tt, body: tb,
    refToks, litToks, refFrac: +(refToks / Math.max(1, tb)).toFixed(4), rules: keys.size,
    bodyChars: body.length, chPerTok: +(body.length / Math.max(1, tb)).toFixed(2) });
}
fs.mkdirSync('bench/x97/receipts', { recursive: true });
fs.writeFileSync('bench/x97/receipts/centres.json', JSON.stringify({ note: 'X97 cost centres, zero frontier calls, wires from bench/x87/receipts/wires', rows }, null, 1) + '\n');
console.log(`lane                       total  contract  tape  body   refs  lit   ref%  rules  ch/tok`);
for (const r of rows) {
  if (r.missing) { console.log(`${r.lane.padEnd(24)} (no committed wire)`); continue; }
  console.log(`${r.lane.padEnd(24)} ${String(r.total).padStart(5)} ${String(r.contract).padStart(9)} ${String(r.tape).padStart(5)} ${String(r.body).padStart(5)} ${String(r.refToks).padStart(6)} ${String(r.litToks).padStart(5)} ${(100 * r.refFrac).toFixed(1).padStart(5)}% ${String(r.rules).padStart(6)} ${String(r.chPerTok).padStart(6)}`);
}
const T = rows.filter((r) => !r.missing);
console.log(`\nTOTAL contract ${T.reduce((a, b) => a + b.contract, 0)}  tape ${T.reduce((a, b) => a + b.tape, 0)}  body ${T.reduce((a, b) => a + b.body, 0)}  (refs ${T.reduce((a, b) => a + b.refToks, 0)} = ${(100 * T.reduce((a, b) => a + b.refToks, 0) / T.reduce((a, b) => a + b.body, 0)).toFixed(1)}% of body)`);
console.log(`\nwrote bench/x97/receipts/centres.json`);
