import * as fs from 'node:fs';
import * as zlib from 'node:zlib';
import { countTokens } from '../../src/lib/omega/bpe';
const floorOf = (b: Buffer) => Math.ceil(zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length * 8 / 14.8);
const F: Record<string, number> = { 'find-listing.txt': 1142, 'git-numstat.txt': 1983, 'npm-ls.txt': 916, 'node-stacktraces.txt': 300, 'git-log-fuller.txt': 143, 'ls-full-iso.txt': 367, 'de-kb.txt': 457, 'es-kb.txt': 403, 'ja-kb.txt': 493, 'pl-kb.txt': 602, 'ru-kb.txt': 478, 'tr-kb.txt': 516, 'agent-history.md': 250 };
console.log('lane'.padEnd(24) + 'raw'.padStart(6) + 'F'.padStart(6) + 'floor'.padStart(7) + 'F/floor'.padStart(9));
for (const p of fs.readdirSync('bench/holdout-ops').map(f => 'bench/holdout-ops/' + f)
  .concat(['bench/holdout-x86/dpkg-l-full.txt','bench/holdout-x86/ls-la-usrbin.txt','bench/holdout-x86/npm-ls-all.txt','bench/holdout-x86/proc-cpuinfo.txt','bench/holdout-x86/proc-meminfo.txt','bench/holdout-x86/apt-policy.txt','bench/holdout-x86/pip-list.txt','bench/holdout-x86/sysinfo.txt'])) {
  const b = fs.readFileSync(p); const S = b.toString('utf8');
  const name = p.split('/').pop()!;
  const raw = countTokens(S, 'o200k_base'); const fl = floorOf(b); const f = F[name];
  console.log(name.padEnd(24) + String(raw).padStart(6) + String(f ?? '?').padStart(6) + String(fl).padStart(7) + (f ? (f / fl).toFixed(2).padStart(9) : '        ?'));
}
// --- find-listing fractional-second structure ---
const fl = fs.readFileSync('bench/holdout-ops/find-listing.txt', 'utf8').split('\n').filter(Boolean);
console.log('\nfind-listing lines', fl.length, 'first:', JSON.stringify(fl[0].slice(0, 60)));
const fr = fl.map(l => (l.match(/T\d\d:\d\d:\d\d\.(\d+)/) ?? [])[1]).filter(Boolean);
console.log('fractions', fr.length, 'len set', [...new Set(fr.map(x => x.length))].join(','));
const asNum = fr.map(x => Number(x.slice(0, 9)));
let mono = 0; for (let i = 1; i < asNum.length; i++) if (asNum[i] >= asNum[i-1]) mono++;
console.log('monotone steps', mono, '/', asNum.length - 1);
const dates = [...new Set(fl.map(l => l.slice(0, 19)))];
console.log('distinct date-time prefixes (first 19 chars):', dates.length, JSON.stringify(dates.slice(0,3)));
const secs = fl.map(l => l.slice(0, 19));
const fracCol = fr.join(' ');
console.log('tokens: whole file', countTokens(fl.join('\n'), 'o200k_base'),
  ' fraction column alone', countTokens(fracCol, 'o200k_base'),
  ' date prefixes alone', countTokens(secs.join(' '), 'o200k_base'));
// column 2 (size) and column 3 (path)
const sizes = fl.map(l => l.split(/\s+/)[1]); const paths = fl.map(l => l.split(/\s+/).slice(2).join(' '));
console.log('sizes tokens', countTokens(sizes.join(' '), 'o200k_base'), 'paths tokens', countTokens(paths.join('\n'), 'o200k_base'));
// what do the fraction digits look like: first3 vs rest
const a = fr.map(x => x.slice(0,3)), b = fr.map(x => x.slice(3));
console.log('first3 distinct', new Set(a).size, 'rest distinct', new Set(b).size, 'rest sample', b.slice(0,6).join(' '));
const bn = b.map(Number); let bmono = 0; for (let i=1;i<bn.length;i++) if (bn[i] >= bn[i-1]) bmono++;
console.log('rest monotone', bmono, '/', bn.length-1, 'min', Math.min(...bn), 'max', Math.max(...bn));
const dl = bn.slice(1).map((v,i) => v - bn[i]);
console.log('rest deltas: distinct', new Set(dl).size, 'min', Math.min(...dl), 'max', Math.max(...dl), 'tokens of deltas', countTokens(dl.join(' '), 'o200k_base'), 'vs tokens of rest', countTokens(b.join(' '), 'o200k_base'));
