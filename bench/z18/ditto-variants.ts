// Variant measurement (before any codec change): mark glyph (″ vs ^) and DITTO stacked on UUIDFOLD.
// Each variant is decode-checked with its own inverse.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
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
const RULE_U = 'DITTO: ″ = the same field as the same position in the line above; fields are split on single spaces';
const RULE_A = 'DITTO: ^ = the same field as the same position in the line above; fields are split on single spaces';
for (const f of ['openstack-loghub-26.log', 'ls-full-iso.txt', 'npm-ls.txt', 'find-listing.txt', 'git-numstat.txt', 'node-stacktraces.txt']) {
  const t = fs.readFileSync(`bench/holdout-ops/${f}`, 'utf8');
  const id = countTokens(t, 'o200k_base');
  const u = enc(t, '″'); const wU = RULE_U + '\n' + u.body;
  const a = enc(t, '^'); const wA = RULE_A + '\n' + a.body;
  const okU = dec(u.body, '″') === t, okA = dec(a.body, '^') === t;
  const uf = uuidfoldEncode(t, 'o200k_base');
  const ufText = uf.wire;
  const s = enc(ufText, '^'); const wS = RULE_A + '\n' + s.body;
  const okS = (uuidfoldDecode(dec(s.body, '^')) === t);
  console.log(JSON.stringify({ f, identity: id, ditto_unicode: countTokens(wU, 'o200k_base'), okU, ditto_ascii: countTokens(wA, 'o200k_base'), okA, uuidfold: uf.mode, uuidfold_tok: uf.outTokens, uuidfold_then_ditto_ascii: countTokens(wS, 'o200k_base'), okStack: okS, marks: u.n }));
}
