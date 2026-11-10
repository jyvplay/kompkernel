/**
 * X97 — RUN-PACKING HEADROOM, MEASURED RATHER THAN ASSUMED.  The previous probe's 1 808-token bound
 * was loose in a way that matters: the body is a PLAIN STRING, so if three consecutive reference
 * glyphs already spell a vocabulary token, the tokenizer already charges 1 token for them and no
 * codec can do better.  The real headroom is therefore
 *
 *     Σ over maximal reference runs R of  ( tokens(R in context) - 1 )
 *
 * where tokens(R in context) is what the tokenizer actually charges.  Two numbers per lane:
 *   PACKED  = Σ (len(R) - tokens(R))   -> packing the incumbent assignment already achieves
 *   HEADROOM= Σ (tokens(R) - 1)        -> what a better assignment could at most reach
 * and HEADROOM is only reachable if the run's letters can be rearranged into a vocabulary token,
 * which the previous probe's capacity histogram says is feasible for L<=11 and impossible for L>=12.
 */
import * as fs from 'node:fs';
import { countTokensExact } from '../../src/lib/omega/bpe';
import { CHIRON_START } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
const wireDir = 'bench/x87/receipts/wires';
const lanes = fs.readdirSync(wireDir).filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));
const rows: any[] = [];
let gP = 0, gH = 0, gBody = 0, gFeas = 0;
for (const lane of lanes) {
  const msg = fs.readFileSync(`${wireDir}/${lane}.wire.txt`, 'utf8');
  const w = msg.indexOf(CHIRON_START);
  const tEnd = msg.indexOf('\u00b6', w);
  const tape = msg.slice(w + 1, tEnd), body = msg.slice(tEnd + 1);
  const keys = new Set<string>();
  for (const ch of tape) if (ch.charCodeAt(0) > 0x370) keys.add(ch);
  // maximal reference runs WITH their body offsets, so tokens are measured in context
  const runs: { s: string; from: number }[] = [];
  let cur = '', start = -1;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (keys.has(ch)) { if (cur === '') start = i; cur += ch; }
    else { if (cur !== '') { runs.push({ s: cur, from: start }); cur = ''; } }
  }
  if (cur !== '') runs.push({ s: cur, from: start });
  let packed = 0, head = 0, feas = 0;
  const byLen = new Map<number, { packed: number; head: number; feas: number }>();
  for (const r of runs) {
    if (r.s.length < 2) continue;
    // in-context token cost of the run: tokenise the whole body once and attribute
    const tk = countTokensExact(r.s, enc);
    const p = r.s.length - tk, h = tk - 1;
    packed += p; head += h;
    if (r.s.length <= 11) feas += h;   // capacity-feasible only
    const e = byLen.get(r.s.length) ?? { packed: 0, head: 0, feas: 0 };
    e.packed += p; e.head += h; if (r.s.length <= 11) e.feas += h;
    byLen.set(r.s.length, e);
  }
  const bodyTok = countTokensExact(body, enc);
  gP += packed; gH += head; gFeas += feas; gBody += bodyTok;
  rows.push({ lane, bodyTok, runs: runs.length, packed, head, feas,
    byLen: [...byLen.entries()].sort((a, b) => a[0] - b[0]).map(([L, e]) => ({ L, ...e })) });
}
fs.mkdirSync('bench/x97/receipts', { recursive: true });
fs.writeFileSync('bench/x97/receipts/runpack2.json', JSON.stringify({ note: 'X97 measured run-packing headroom; in-isolation token counts, whole-message price still required', rows }, null, 1) + '\n');
console.log(`lane                bodyTok  runs  ALREADY-PACKED  HEADROOM(all)  HEADROOM(L<=11)`);
for (const r of rows) console.log(`${r.lane.padEnd(18)} ${String(r.bodyTok).padStart(7)} ${String(r.runs).padStart(5)} ${String(r.packed).padStart(15)} ${String(r.head).padStart(14)} ${String(r.feas).padStart(17)}`);
console.log(`\nTOTAL body ${gBody}   already packed ${gP}   headroom(all L) ${gH}   headroom(L<=11, capacity-feasible) ${gFeas}`);
console.log(`      headroom as % of body: ${(100 * gH / gBody).toFixed(1)}% (all) / ${(100 * gFeas / gBody).toFixed(1)}% (feasible)`);
console.log(`\nby run length (all lanes):  L  packed  headroom  feasible-headroom`);
const H = new Map<number, { packed: number; head: number; feas: number }>();
for (const r of rows) for (const e of r.byLen) { const h = H.get(e.L) ?? { packed: 0, head: 0, feas: 0 }; h.packed += e.packed; h.head += e.head; h.feas += e.feas; H.set(e.L, h); }
for (const [L, e] of [...H.entries()].sort((a, b) => a[0] - b[0])) console.log(`  ${String(L).padStart(12)} ${String(e.packed).padStart(7)} ${String(e.head).padStart(9)} ${String(e.feas).padStart(17)}`);
console.log(`\nwrote bench/x97/receipts/runpack2.json`);
