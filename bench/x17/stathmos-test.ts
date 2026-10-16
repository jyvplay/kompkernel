// X17: STATHMOS tests. (1) edge cases, (2) seeded fuzz of random delimited tables, (3) 28 lanes (token M).
// Every case: decoded === input (byte exact) through stathmosDecode(wire), and the restore step of the
// transform is checked separately (restore(forward(x)) === x). Output: JSON lines on stdout, summary on stderr.
import fs from 'node:fs';
import path from 'node:path';
import { stathmosEncode, stathmosForward, stathmosRestore, stathmosDecode } from '@/lib/omega/stathmos';
import { lakonikosDualEncode } from '@/lib/omega/lakonikos-d';

const ROOT = '/home/user/kompkernel';
let fails = 0; let total = 0;
function check(name: string, input: string) {
  total++;
  const fw = stathmosForward(input);
  let restoreOk = true;
  if (fw) restoreOk = stathmosRestore(fw.text) === input;
  const enc = stathmosEncode(input);
  const dec = stathmosDecode(enc.wire);
  const ok = dec === input && restoreOk && enc.exact;
  if (!ok) { fails++; console.log(JSON.stringify({ FAIL: name, restoreOk, exact: enc.exact, decOk: dec === input })); }
  return { name, ok, transformed: enc.transformed, dp: enc.dp, o200k: enc.messageTokens.o200k_base, base: enc.baseTokens.o200k_base };
}

// (1) edge cases
const edge: [string, string][] = [
  ['empty', ''],
  ['one-line', 'a,1.500000\n'],
  ['header-only', 'name,x\n'],
  ['fixed-6dp', 'DATE,OPEN\n1990-01-02,17.240000\n1990-01-03,18.190000\n'],
  ['fixed-6dp-no-final-nl', 'DATE,OPEN\n1990-01-02,17.240000\n1990-01-03,18.190000'],
  ['crlf-fixed', 'DATE,OPEN\r\n1990-01-02,17.240000\r\n1990-01-03,18.190000\r\n'],
  ['zero-values', 'a,b\n0.000000,1.500000\n0.000000,2.000000\n'],
  ['all-zero-col', 'a,b\n1.000,0.000\n2.000,0.000\n'],
  ['mixed-dp-no-transform', 'a,b\n1.5,2.25\n2.5,3.5\n'],
  ['integer-col-not-fixed', 'a,b\n1,1.500\n2,2.500\n'],
  ['quoted-comma', 'city,v\n"Paris, FR",1.250000\n"Rome, IT",2.500000\n'],
  ['negatives', 'a,b\n-0.500000,-1.000000\n-0.250000,-0.000000\n'],
  ['header-marker-guard', '@dp 0,3\na,b\n1.500,2.000\n'],
  ['raw-marker-guard', '@raw\na,b\n1.500,2.000\n'],
  ['ragged', 'a,b\n1.500,2.500\n3.500\n'],
  ['empty-cells', 'a,b\n1.500,\n2.500,3.000\n'],
  ['unicode-cells', 'név,ár\nalma,1.500000\nkörte,2.000000\n'],
  ['prose-no-table', 'Hello world.\nThis is prose, with commas.\nNo numbers here.\n'],
];
const edgeRows = edge.map(([n, t]) => check('edge:' + n, t));

// (2) seeded fuzz
let seed = 12345;
function rnd() { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
function pick<T>(a: T[]): T { return a[Math.floor(rnd() * a.length)]; }
const fuzzRows: unknown[] = [];
for (let k = 0; k < 400; k++) {
  const ncol = 1 + Math.floor(rnd() * 5);
  const nrow = Math.floor(rnd() * 25);
  const eol = rnd() < 0.3 ? '\r\n' : '\n';
  const dps = Array.from({ length: ncol }, () => pick([0, 1, 2, 3, 6, 8]));
  const lines: string[] = [Array.from({ length: ncol }, (_, c) => 'c' + c).join(',')];
  for (let r = 0; r < nrow; r++) {
    lines.push(Array.from({ length: ncol }, (_, c) => {
      const D = dps[c];
      if (D === 0) return pick(['x', '12', 'a b', '"q,r"', '']);
      const ip = Math.floor(rnd() * 1000) - 300;
      let frac = '';
      for (let j = 0; j < D; j++) frac += rnd() < 0.5 ? '0' : String(Math.floor(rnd() * 10));
      return rnd() < 0.05 ? String(ip) + '.' + '0'.repeat(D) : `${ip}.${frac}`;
    }).join(','));
  }
  let text = lines.join(eol) + (rnd() < 0.8 ? eol : '');
  fuzzRows.push(check('fuzz' + k, text));
}
const fuzzOk = fuzzRows.filter((r: any) => r.ok).length;
const fuzzTransformed = fuzzRows.filter((r: any) => r.transformed).length;

// (3) lanes
const lanes = fs.readFileSync(path.join(ROOT, 'bench/x16/lanes-all.txt'), 'utf8').split('\n').filter(Boolean);
for (const rel of (process.env.SKIP_LANES ? [] : lanes)) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const r = check('lane:' + path.basename(rel), text);
  console.log(JSON.stringify({ lane: path.basename(rel), ok: r.ok, transformed: r.transformed, dp: r.dp.join(','), stathmosO200k: r.o200k, lakonikosDO200k: r.base }));
}
console.error(`edge ${edgeRows.filter((r: any) => r.ok).length}/${edge.length}; fuzz ${fuzzOk}/400 (transformed in ${fuzzTransformed}); total checks ${total}; FAILS ${fails}`);
