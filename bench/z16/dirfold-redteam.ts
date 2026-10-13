// DIRFOLD-D1 red team: edge cases + seeded fuzz. Every case must round-trip exactly, and identity must hold when a gate fails.
import { dirfoldEncode, dirfoldDecode } from '@/lib/omega/dirfold';

const cases: [string, string][] = [
  ['empty', ''],
  ['single line', 'a/b/c.txt'],
  ['root-level files only', 'a.txt\nb.txt\nc.txt'],
  ['same dir run', 'node_modules/@babel/x/a.js\nnode_modules/@babel/x/b.js\nnode_modules/@babel/x/c.js'],
  ['first line has no previous', 'src/lib/a.ts\nsrc/lib/b.ts'],
  ['trailing slash dir line', 'pkg/dir/\npkg/dir/file.txt\npkg/dir/other.txt'],
  ['path with spaces', 'my dir/sub/a file.txt\nmy dir/sub/b file.txt'],
  ['tab separated', '2026-10-01 12:00\t4096\tsrc/lib/a.ts\n2026-10-01 12:01\t12\tsrc/lib/b.ts'],
  ['absolute paths', '/usr/lib/a.so\n/usr/lib/b.so\n/usr/lib/c.so'],
  ['short dir below threshold', 'a/b\na/c\na/d'],
  ['CRLF input (identity)', 'src/lib/a.ts\r\nsrc/lib/b.ts\r\nsrc/lib/c.ts'],
  ['contains marker char (identity)', 'src/lib/a.ts\nsrc/lib/↑b.ts\nsrc/lib/c.ts'],
  ['empty lines in run', 'src/lib/a.ts\n\nsrc/lib/b.ts\n\nsrc/lib/c.ts'],
  ['trailing newline', 'src/lib/a.ts\nsrc/lib/b.ts\n'],
  ['double slash', 'src//lib/a.ts\nsrc//lib/b.ts\nsrc//lib/c.ts'],
  ['dir then deeper dir', 'src/lib/a.ts\nsrc/lib/deep/b.ts\nsrc/lib/deep/c.ts'],
  ['prev line ends with slash-only', '/\n/a/file\n/a/file2'],
  ['name equal to dir', 'src/lib/\nsrc/lib/lib/x'],
  ['only slashes', '////\n////\n////'],
  ['unicode names', 'docs/日本語/a.md\ndocs/日本語/b.md\ndocs/日本語/c.md'],
  ['trailing space line', 'src/lib/a.ts \nsrc/lib/b.ts '],
  ['header-like input', 'DIRFOLD: ↑ = the same directory as the line above; the file name follows\nsrc/lib/a.ts'],
  ['header-like input without marker', 'DIRFOLD: rule\nsrc/lib/a.ts\nsrc/lib/b.ts\nsrc/lib/c.ts'],
];

let fails = 0;
for (const [name, text] of cases) {
  const r = dirfoldEncode(text, 'o200k_base');
  const ok = dirfoldDecode(r.wire) === text && r.decoded === text;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(36)} mode=${r.mode.padEnd(8)} folded=${r.folded} in=${r.inTokens} out=${r.outTokens}`);
}

// seeded fuzz: random sorted-ish path listings with mixed separators, spaces, tabs, empties
let s = 20261011 >>> 0;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const parts = ['src', 'lib', 'node_modules', '@babel', 'x', 'a b', 'deep', '', 'docs', 'é', 'long_directory_name'];
let fuzzFails = 0, fuzzFolded = 0;
for (let k = 0; k < 3000; k++) {
  const n = 1 + Math.floor(rnd() * 40);
  const lines: string[] = [];
  let dir = 'src/lib';
  for (let i = 0; i < n; i++) {
    if (rnd() < 0.3) dir = Array.from({ length: 1 + Math.floor(rnd() * 4) }, () => pick(parts)).join('/') + (rnd() < 0.7 ? '/' : '');
    const sep = pick([' ', '\t', ' ', '  ']);
    const name = pick(['a.ts', 'b', 'file name', 'c.d.e', '', 'x/', '.hidden']);
    const seg = rnd() < 0.05 ? name : dir + name;
    lines.push(`${i} ${i * 7}${sep}${seg}`);
  }
  if (rnd() < 0.1) lines.push('');
  const text = lines.join('\n');
  const r = dirfoldEncode(text, 'o200k_base');
  if (r.mode === 'dirfold') fuzzFolded++;
  if (dirfoldDecode(r.wire) !== text || r.decoded !== text) fuzzFails++;
}
console.log(`fuzz: 3000 listings, decode fails=${fuzzFails}, listings that folded=${fuzzFolded}`);
console.log(fails === 0 && fuzzFails === 0 ? 'ALL EXACT' : `FAILURES: cases=${fails} fuzz=${fuzzFails}`);
