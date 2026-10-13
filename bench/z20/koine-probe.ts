// KOINE-K1 probe: KOINE alone, and KOINE inserted at different points of the PHALANX-P1 chain.
// Every stage is decode-checked. All 17 holdout files (ops + prose/code). o200k_base.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { uuidfoldEncode, uuidfoldDecode } from '@/lib/omega/uuidfold';
import { dirfoldAEncode, dirfoldADecode } from '@/lib/omega/dirfold-a';
import { dittoEncode, dittoDecode } from '@/lib/omega/ditto';
import { veritasEncode, veritasDecode } from '@/lib/omega/veritas';
import { koineEncode, koineDecode, koineEncodeBody } from '@/lib/omega/koine';
import { phalanxEncode } from '@/lib/omega/phalanx';

type Stage = { name: string; enc: (s: string) => string; dec: (s: string) => string };
const U: Stage = { name: 'U', enc: s => uuidfoldEncode(s, 'o200k_base').wire, dec: uuidfoldDecode };
const DA: Stage = { name: 'DA', enc: s => dirfoldAEncode(s, 'o200k_base').wire, dec: dirfoldADecode };
const T: Stage = { name: 'T', enc: s => dittoEncode(s, 'o200k_base').wire, dec: dittoDecode };
const V: Stage = { name: 'V', enc: s => veritasEncode(s, 'o200k_base').wire, dec: veritasDecode };
const K: Stage = { name: 'K', enc: s => koineEncode(s, 'o200k_base').wire, dec: koineDecode };

const pipelines: Record<string, Stage[]> = {
  'PHALANX-P1 (U,DA,T,V)': [U, DA, T, V],
  'U,DA,T': [U, DA, T],
  'U,DA,K': [U, DA, K],
  'U,DA,V': [U, DA, V],
  'U,DA,T,V,K': [U, DA, T, V, K],
  'K alone': [K],
  'U,DA,K,V': [U, DA, K, V],
  'U,DA,T,K,V': [U, DA, T, K, V],
  'U,DA,K,T,V': [U, DA, K, T, V],
  'U,DA,T,K': [U, DA, T, K],
  'U,DA,K,T': [U, DA, K, T],
};

const files = [
  ...['find-listing.txt', 'ls-full-iso.txt', 'git-numstat.txt', 'npm-ls.txt', 'node-stacktraces.txt', 'openstack-loghub-26.log', 'git-log-fuller.txt', 'package-lock-head.json'].map(f => `bench/holdout-ops/${f}`),
  ...fs.readdirSync('bench/holdout').map(f => `bench/holdout/${f}`),
];
const rows: Record<string, any>[] = [];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const row: Record<string, any> = { f: f.replace(/^bench\//, ''), identity: countTokens(t, 'o200k_base') };
  for (const [name, stages] of Object.entries(pipelines)) {
    let w = t;
    let ok = true;
    for (const s of stages) { w = s.enc(w); }
    let d = w;
    for (let i = stages.length - 1; i >= 0; i--) d = stages[i].dec(d);
    ok = d === t;
    row[name] = { tok: countTokens(w, 'o200k_base'), exact: ok };
  }
  const ph = phalanxEncode(t, 'o200k_base');
  row.phalanx_module = { tok: ph.outTokens, mode: ph.mode };
  const kk = koineEncode(t, 'o200k_base');
  row.koine_module = { tok: kk.outTokens, mode: kk.mode, folded: kk.folded, exact: kk.decoded === t };
  rows.push(row);
}
// compact table
const cols = Object.keys(pipelines);
console.log(['file', 'identity', ...cols.map(c => c.slice(0, 22)), 'koine_mod', 'phalanx_mod', 'K-folds'].join(' | '));
for (const r of rows) {
  const cells = cols.map(c => `${r[c].tok}${r[c].exact ? '' : '!!FAIL'}`);
  console.log([r.f, r.identity, ...cells, `${r.koine_module.tok}(${r.koine_module.mode}${r.koine_module.exact ? '' : '!!'})`, `${r.phalanx_module.tok}(${r.phalanx_module.mode})`, r.koine_module.folded].join(' | '));
}
fs.writeFileSync('bench/z20/koine-probe.json', JSON.stringify(rows, null, 1));
