// X17c: UPPER BOUND on the token prize of replacing every multi-token English word by a one-token alias,
// with zero table cost and zero collision cost. o200k via gpt-tokenizer (same package as bpe.ts).
// prize(lane) = sum over word occurrences of (tokens(word) - 1); words = maximal runs of ASCII letters.
const fs = require('fs');
const path = require('path');
const { encode } = require('gpt-tokenizer/encoding/o200k_base');
const root = path.join(__dirname, '..', '..', '..');
const D = path.join(root, 'bench/x16/lakonikos-d');
const srcs = fs.readdirSync(D).filter(f => f.endsWith('.src.txt')).sort();
const rows = [];
for (const f of srcs) {
  const lane = f.replace(/\.src\.txt$/, '');
  const text = fs.readFileSync(path.join(D, f), 'utf8');
  const total = encode(text).length;
  const words = text.match(/[A-Za-z]+/g) || [];
  const cache = new Map();
  let prize = 0, multiOcc = 0;
  for (const w of words) {
    let t = cache.get(w);
    if (t === undefined) { t = encode(w).length; cache.set(w, t); }
    if (t >= 2) { prize += t - 1; multiOcc++; }
  }
  const pf = path.join(D, lane + '.prompt.txt');
  const m = fs.existsSync(pf) ? encode(fs.readFileSync(pf, 'utf8')).length : null;
  rows.push({ lane, total, multiOcc, prize, pct: +(100 * prize / total).toFixed(1), lkdM: m });
}
const agg = rows.reduce((a, r) => ({ total: a.total + r.total, prize: a.prize + r.prize, lkdM: a.lkdM + (r.lkdM || 0) }), { total: 0, prize: 0, lkdM: 0 });
console.log(JSON.stringify({ lanes: rows.length, aggregate: agg, aggPrizePctOfSrc: +(100 * agg.prize / agg.total).toFixed(1), aggPrizePctOfLkdM: +(100 * agg.prize / agg.lkdM).toFixed(1) }));
for (const r of rows) console.log(r.lane.padEnd(34), 'src', String(r.total).padStart(5), 'multiTokOcc', String(r.multiOcc).padStart(5), 'prize', String(r.prize).padStart(5), 'pct', String(r.pct).padStart(5), 'lkdM', r.lkdM);
