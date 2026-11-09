/** X88 probe 4 — the lanes that are NOT in the 29, where the brotli ratio says the
 *  headroom actually is. openstack-loghub-26.log is raw 4028 against a 686-token floor:
 *  a 5.9x ratio, the largest in the corpus. Test the transforms that suit log and
 *  package-lock structure, gross, before paying for any frontier run. */
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const floor = (s: string) => Math.ceil(zlib.brotliCompressSync(Buffer.from(s), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length * 8 / 14.8);

const LANES = ['bench/holdout-ops/openstack-loghub-26.log', 'bench/holdout-ops/package-lock-head.json',
  'bench/holdout-ops/npm-ls.txt', 'bench/holdout-ops/git-numstat.txt', 'bench/holdout-ops/find-listing.txt',
  'bench/holdout-x86/dpkg-l-full.txt', 'bench/holdout-x86/ls-la-usrbin.txt', 'bench/holdout-x86/npm-ls-all.txt',
  'bench/holdout-x86/proc-cpuinfo.txt', 'bench/holdout/json-pkg.txt'];

for (const p of LANES) {
  if (!fs.existsSync(p)) { console.log('missing', p); continue; }
  const S = fs.readFileSync(p, 'utf8');
  const L = S.split('\n');
  const raw = T(S), fl = floor(S);
  console.log(`\n===== ${p.split('/').pop()}  lines=${L.length} raw=${raw} brotliFloor=${fl} ratio=${(raw / fl).toFixed(2)}`);

  // char-level shared prefix with the previous line
  const cp: number[] = []; for (let i = 1; i < L.length; i++) { let k = 0; const m = Math.min(L[i].length, L[i-1].length); while (k < m && L[i][k] === L[i-1][k]) k++; cp.push(k); }
  const cpAvg = cp.length ? cp.reduce((a, b) => a + b, 0) / cp.length : 0;
  const cpDelta = L.slice(1).map((l, i) => l.slice(cp[i]));
  const cpWire = L[0] + '\n' + cpDelta.map((d, i) => `${cp[i]} ${d}`).join('\n');
  console.log(`  char-prefix-vs-prev: mean shared ${cpAvg.toFixed(1)} chars  wire=${T(cpWire)} (gross ${T(cpWire) - raw})`);

  // word-level shared prefix with the previous line
  const W = L.map(l => l.split(' '));
  const wp: number[] = []; for (let i = 1; i < W.length; i++) { let k = 0; const m = Math.min(W[i].length, W[i-1].length); while (k < m && W[i][k] === W[i-1][k]) k++; wp.push(k); }
  const wpAvg = wp.length ? wp.reduce((a, b) => a + b, 0) / wp.length : 0;
  const wpWire = L[0] + '\n' + W.slice(1).map((w, i) => `${wp[i]}:` + w.slice(wp[i]).join(' ')).join('\n');
  console.log(`  word-prefix-vs-prev: mean shared ${wpAvg.toFixed(2)} words  wire=${T(wpWire)} (gross ${T(wpWire) - raw})`);

  // shared prefix against the MODAL line shape (a fixed template, not the previous line)
  const firsts = L.filter(Boolean).map(l => l.split(' ')[0]);
  const modal = new Set(firsts).size;
  console.log(`  distinct first fields: ${modal}/${firsts.length}`);

  // quote strip (JSON-ish)
  const q = S.replace(/"/g, '');
  if (q !== S) console.log(`  quote-strip: ${T(q)} (gross ${T(q) - raw})`);
  const jm = S.replace(/\n\s*/g, '');
  if (jm !== S) console.log(`  json-minify(no ws): ${T(jm)} (gross ${T(jm) - raw})`);
  // hex/uuid census
  const uuids = S.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g) ?? [];
  const hex32 = S.match(/\b[0-9a-f]{32}\b/g) ?? [];
  const sha = S.match(/\b[0-9a-f]{40,64}\b/g) ?? [];
  if (uuids.length + hex32.length + sha.length) {
    const u = T(uuids.join(' ')), h = T(hex32.join(' ')), sh = T(sha.join(' '));
    console.log(`  uuid x${uuids.length} = ${u} tok (${(u / Math.max(1,uuids.length)).toFixed(1)}/ea)  hex32 x${hex32.length} = ${h} (${(h / Math.max(1,hex32.length)).toFixed(1)}/ea)  sha x${sha.length} = ${sh} (${(sh / Math.max(1,sha.length)).toFixed(1)}/ea)`);
    console.log(`    => id-like tokens ${u + h + sh} of ${raw} (${(100 * (u + h + sh) / raw).toFixed(1)}%)  brotli floor for the same: ${floor(uuids.concat(hex32, sha).join(' '))}`);
  }
  console.log(`  first line: ${JSON.stringify(L.find(Boolean)?.slice(0, 150))}`);
}
