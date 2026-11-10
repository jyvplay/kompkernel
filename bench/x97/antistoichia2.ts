/**
 * X97 — ΑΝΤΙΣΤΟΙΧΊΑ, PRICED ON THE TOKENIZER'S OWN SEGMENTATION.
 *
 * antistoichia.ts counted every printable-ASCII bigram window that is not a vocabulary token.
 * That is the WRONG population: in "the" the tokenizer emits ONE token, so neither "th" nor "he"
 * is ever split.  The lesson the repository already paid for -- "vocabulary membership is not
 * encoding behaviour; price the exact message" -- applies here too.
 *
 * This re-prices on `tokenStrings`, i.e. the tokenization o200k actually produces for the message,
 * and counts only ADJACENT TOKEN PAIRS where both tokens are exactly one printable ASCII
 * character.  Each such pair is one token that a 2-character vocabulary token could replace, so
 * this is the exact, priced population.  A bigram is eligible only if SOME 2-char vocabulary token
 * exists that we may map it to (8 789 non-ASCII 2-char tokens, bigram.ts).
 */
import * as fs from 'node:fs';
import { countTokens, decodeIds, tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
// the codomain: 2-char vocabulary tokens made of two non-ASCII characters
const SUPPLY: string[] = [];
for (let id = 0; id < 200007; id++) {
  let s: string; try { s = decodeIds([id], enc); } catch { continue; }
  const c = [...s].map(x => x.codePointAt(0)!);
  if (c.length === 2 && c.every(x => x >= 0x80 && !(x >= 0xD800 && x <= 0xDFFF) && x !== 0xFFFD)) SUPPLY.push(s);
}
console.log(`codomain (2-char non-ASCII vocabulary tokens): ${SUPPLY.length}`);
const isAscii1 = (s: string): boolean => s.length === 1 && s >= ' ' && s <= '~';
const rows: any[] = [];
let poolMissing = 0, poolNet3 = 0, poolNet2 = 0;
for (const f of fs.readdirSync('bench/x87/receipts/wires')) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const ts = tokenStrings(msg, enc).map(t => t.s);
  const freq = new Map<string, number>();
  for (let i = 0; i + 1 < ts.length; i++) {
    if (!isAscii1(ts[i]) || !isAscii1(ts[i + 1])) continue;
    const b = ts[i] + ts[i + 1];
    freq.set(b, (freq.get(b) ?? 0) + 1);
  }
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const missing = sorted.reduce((a, e) => a + e[1], 0);
  // best K at a fixed per-entry map cost c
  const bestAt = (c: number): { K: number; net: number } => {
    let best = { K: 0, net: 0 }, F = 0;
    for (let K = 1; K <= sorted.length; K++) { F += sorted[K - 1][1]; const net = F - c * K; if (net > best.net) best = { K, net }; }
    return best;
  };
  const b2 = bestAt(2), b3 = bestAt(3);
  poolMissing += missing; poolNet2 += b2.net; poolNet3 += b3.net;
  rows.push({ lane: f, distinct: sorted.length, missing, bestK2: b2.K, net2: b2.net, bestK3: b3.K, net3: b3.net,
              top: sorted.slice(0, 6).map(e => `${e[0]}x${e[1]}`).join(' ') });
}
console.log(`\n${'lane'.padEnd(20)} ${'distinct'.padStart(8)} ${'pairs'.padStart(6)} ${'K@2'.padStart(5)} ${'net@2'.padStart(6)} ${'K@3'.padStart(5)} ${'net@3'.padStart(6)}  top`);
for (const r of rows) console.log(`${r.lane.padEnd(20)} ${String(r.distinct).padStart(8)} ${String(r.missing).padStart(6)} ${String(r.bestK2).padStart(5)} ${String(r.net2).padStart(6)} ${String(r.bestK3).padStart(5)} ${String(r.net3).padStart(6)}  ${r.top}`);
console.log(`\npooled adjacent single-ASCII-char token pairs = ${poolMissing}`);
console.log(`pooled net at 2 tok/entry = ${poolNet2}   at 3 tok/entry = ${poolNet3}   (over the ten wires, 7 844 tokens)`);
console.log(`=> ${(100 * poolNet2 / 7844).toFixed(2)}% / ${(100 * poolNet3 / 7844).toFixed(2)}% of the message`);
fs.writeFileSync('bench/x97/receipts/antistoichia2.json', JSON.stringify({ supply: SUPPLY.length, poolMissing, poolNet2, poolNet3, rows }, null, 1));
