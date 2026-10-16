// X17c: NET upper bound for ANY single-token alias scheme over the ASCII words of a LAKONIKOS-D wire.
// Model: each distinct word type w with t = o200k tokens(w) >= 2 and k occurrences in the wire gets a
// one-token alias. Saving = (t-1)*k. Table cost = t (the spelled word, written once in the table) + 3 overhead
// tokens per entry (alias marker, separator, newline). Net(w) = (t-1)*k - (t+3). Only types with Net > 0 are kept.
// This is an OPTIMISTIC bound: it assumes free aliases with no collisions and a reader that never errs.
const fs = require('fs');
const path = require('path');
const { encode } = require('gpt-tokenizer/encoding/o200k_base');
const root = path.join(__dirname, '..', '..', '..');
const D = path.join(root, 'bench/x16/lakonikos-d');
const wires = fs.readdirSync(D).filter(f => f.endsWith('.wire.txt')).sort();
const OVER = 3;
function bound(text) {
  const words = text.match(/[A-Za-z]+/g) || [];
  const k = new Map();
  for (const w of words) k.set(w, (k.get(w) || 0) + 1);
  let saving = 0, types = 0;
  for (const [w, occ] of k) {
    const t = encode(w).length;
    if (t < 2) continue;
    const net = (t - 1) * occ - (t + OVER);
    if (net > 0) { saving += net; types++; }
  }
  return { saving, types };
}
const rows = [];
for (const f of wires) {
  const lane = f.replace(/\.wire\.txt$/, '');
  const wire = fs.readFileSync(path.join(D, f), 'utf8');
  const pf = path.join(D, lane + '.prompt.txt');
  const M = fs.existsSync(pf) ? encode(fs.readFileSync(pf, 'utf8')).length : null;
  const wt = encode(wire).length;
  const b = bound(wire);
  rows.push({ lane, wireTokens: wt, M, netBound: b.saving, types: b.types, netPctOfM: M ? +(100 * b.saving / M).toFixed(1) : null });
}
const T = rows.reduce((a, r) => ({ M: a.M + (r.M || 0), net: a.net + r.netBound }), { M: 0, net: 0 });
console.log(JSON.stringify({ lanes: rows.length, sumM: T.M, sumNetBound: T.net, pctOfM: +(100 * T.net / T.M).toFixed(1) }));
for (const r of rows) console.log(r.lane.padEnd(34), 'wire', String(r.wireTokens).padStart(5), 'M', String(r.M).padStart(5), 'aliasTypes', String(r.types).padStart(4), 'netBound', String(r.netBound).padStart(5), 'pct', r.netPctOfM);
