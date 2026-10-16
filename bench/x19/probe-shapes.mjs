// X19: histogram of "digit cluster shapes" per lane.
// A digit cluster = maximal sequence  D (s D)*  where D is a run of >=1 digits and
// s is a single character separator from a small set.
// Shape = run-length vector + separator string.  If one shape dominates, a single
// declarative sentence can restore it.
import fs from 'node:fs';
import { encode } from 'gpt-tokenizer';

const SEPS = new Set([...'-.:/,;_+*x×']);
const lanes = fs.readFileSync('bench/x16/lanes-all.txt', 'utf8').split('\n').filter(Boolean);

const T = (s) => encode(s).length;

function clusters(text) {
  // scan
  const out = [];
  const isD = (c) => c >= '0' && c <= '9';
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (!isD(text[i])) { i++; continue; }
    // start a cluster
    let j = i;
    let runs = [];
    let seps = [];
    let ok = true;
    while (j < n) {
      // read a digit run
      let st = j;
      while (j < n && isD(text[j])) j++;
      runs.push(text.slice(st, j));
      if (j >= n) break;
      const c = text[j];
      if (SEPS.has(c) && j + 1 < n && isD(text[j + 1])) { seps.push(c); j++; }
      else break;
    }
    if (runs.length >= 2) {
      out.push({ start: i, end: j, runs, seps, raw: text.slice(i, j) });
    }
    i = j;
  }
  return out;
}

let grand = { clusters: 0, sepTok: 0, chunkWaste: 0, groups: 0 };
for (const f of lanes) {
  const text = fs.readFileSync(f, 'utf8');
  const cs = clusters(text);
  const hist = new Map();
  let savedSep = 0, savedChunk = 0;
  for (const c of cs) {
    const shape = c.runs.map(r => r.length).join('/') + '|' + c.seps.join('');
    hist.set(shape, (hist.get(shape) ?? 0) + 1);
    // tokens of the cluster as-is
    const asis = T(c.raw);
    // tokens if separators are dropped
    const packed = c.runs.join('');
    savedSep += asis - T(packed);
  }
  const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  console.log(f.padEnd(62), 'clus=' + String(cs.length).padStart(5),
    'savedIfPacked=' + String(savedSep).padStart(5),
    'top=' + top.map(([s, k]) => `${s}×${k}`).join(' '));
  grand.clusters += cs.length;
  grand.sepTok += savedSep;
}
console.log('TOTAL clusters', grand.clusters, 'tokens saved if all packed (no restore cost)', grand.sepTok);
