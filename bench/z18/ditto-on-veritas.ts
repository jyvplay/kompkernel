// Stacking test: is DITTO additive on top of the strongest ASCII-clean codec (VERITAS-VX)?
// A stacked wire is accepted here only if the full inverse chain reproduces the input exactly.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasEncode } from '@/lib/omega/veritas';
import { uuidfoldEncode, uuidfoldDecode } from '@/lib/omega/uuidfold';
function enc(text: string, mark: string, minLen = 3) {
  let prev: string[] = []; let n = 0;
  const body = text.split('\n').map(line => { const f = line.split(' ');
    const r = f.map((v, j) => { if (v.length >= minLen && j < prev.length && prev[j] === v) { n++; return mark; } return v; });
    prev = f; return r.join(' '); }).join('\n');
  return { body, n };
}
function dec(body: string, mark: string) {
  let prev: string[] = [];
  return body.split('\n').map(line => { const f = line.split(' ').map((v, j) => (v === mark ? prev[j] ?? '' : v)); prev = f; return f.join(' '); }).join('\n');
}
const RULE = 'DITTO: ^ = the same field as the same position in the line above; fields are split on single spaces';
for (const f of ['openstack-loghub-26.log', 'ls-full-iso.txt', 'npm-ls.txt', 'find-listing.txt', 'git-numstat.txt', 'node-stacktraces.txt']) {
  const t = fs.readFileSync(`bench/holdout-ops/${f}`, 'utf8');
  const hasMark = t.includes('^');
  const v = veritasEncode(t, 'o200k_base');
  const vTok = countTokens(v.wire, 'o200k_base');
  // ditto after veritas: only if the veritas wire has no '^'
  const vw = v.wire;
  const dv = hasMark || vw.includes('^') ? null : enc(vw, '^');
  const dvWire = dv ? RULE + '\n' + dv.body : null;
  const dvExact = dv ? dec(dv.body, '^') === vw && v.decoded === t : null;
  const dvTok = dvWire ? countTokens(dvWire, 'o200k_base') : null;
  // ditto after uuidfold then veritas
  console.log(JSON.stringify({ f, identity: countTokens(t, 'o200k_base'), veritas: vTok, veritas_exact: v.decoded === t, veritas_mode: v.mode, ditto_on_veritas: dvTok, marks: dv?.n ?? 0, exact: dvExact, hasMarkInInput: hasMark }));
}
