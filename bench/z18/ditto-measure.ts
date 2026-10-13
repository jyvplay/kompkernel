// Pre-codec measurement: how many o200k tokens does a per-field "same as the field above" mark save,
// on the holdout-ops corpora, BEFORE any codec is written. Exactness is checked for every file.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const MARK = '″';
const files = ['find-listing.txt', 'ls-full-iso.txt', 'git-numstat.txt', 'npm-ls.txt', 'node-stacktraces.txt', 'openstack-loghub-26.log', 'git-log-fuller.txt'];
function enc(text: string, minLen: number): { wire: string; n: number } {
  const lines = text.split('\n');
  let prev: string[] = [];
  let n = 0;
  const out = lines.map(line => {
    const f = line.split(' ');
    const r = f.map((v, j) => { if (v.length >= minLen && j < prev.length && prev[j] === v) { n++; return MARK; } return v; });
    prev = f;
    return r.join(' ');
  });
  return { wire: out.join('\n'), n };
}
function dec(wire: string): string {
  const lines = wire.split('\n');
  let prev: string[] = [];
  return lines.map(line => { const f = line.split(' ').map((v, j) => (v === MARK ? prev[j] : v)); prev = f; return f.join(' '); }).join('\n');
}
for (const minLen of [3, 6, 10]) {
  for (const f of files) {
    const t = fs.readFileSync(`bench/holdout-ops/${f}`, 'utf8');
    if (t.includes(MARK)) { console.log('marker present', f); continue; }
    const e = enc(t, minLen);
    const ok = dec(e.wire) === t;
    const id = countTokens(t, 'o200k_base'), w = countTokens(e.wire, 'o200k_base');
    console.log(JSON.stringify({ minLen, f, marks: e.n, identity: id, ditto: w, delta: w - id, pct: +(100 * (w - id) / id).toFixed(2), exact: ok }));
  }
}
