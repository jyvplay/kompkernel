// z51 red team for DENDRON: adversarial inputs; each wire is decoded by the TS reader AND by bench/dendron_decode.py.
// usage: OMEGA_DET=1 bench/tmp/run.sh bench/z51/redteam-dendron.ts   (then python3 bench/dendron_decode.py cases.json py.json)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { denEncode, denDecode, DEN_RULE, DEN_ESCAPE } from '@/lib/omega/dendron';
const enc = 'o200k_base' as const;
const deep: string[] = [];
for (let i = 0; i < 300; i++) deep.push(`src/lib/omega/mod${i % 20}/part${Math.floor(i / 20)}/file${i}.ts`);
const cases: Array<[string, string]> = [
  ['url-host-run', ['https://github.com/a/b', 'https://github.com/a/c', 'https://github.com/a/d/e'].join('\n')],
  ['deep-300', deep.join('\n')],
  ['dup-lines', ['p/q', 'p/q', 'p/r', 'p/q/s'].join('\n')],
  ['empty-item', ['dir/', 'dir/x', 'dir/y'].join('\n')],
  ['prefix-equal', ['a/b', 'a/b/c', 'a/b/d', 'a/e'].join('\n')],
  ['abs-and-dot', ['/usr/bin/a', '/usr/bin/b', './x/y', './x/z'].join('\n')],
  ['unicode-paths', ['ünï/cödé/α', 'ünï/cödé/β', 'ünï/ß'].join('\n')],
  ['trailing-newline-refused', ['a/b', 'a/c', 'a/d', ''].join('\n')],
  ['space-in-path-refused', ['a b/c', 'a b/d', 'a b/e'].join('\n')],
  ['brace-in-path-refused', ['a/{b', 'a/c', 'a/d'].join('\n')],
  ['comma-in-path-refused', ['a/b,c', 'a/d', 'a/e'].join('\n')],
  ['prose-no-slash', 'The quick brown fox.\nIt jumps over the lazy dog.\nAgain, and again.'],
  ['payload-starts-with-rule', [DEN_RULE, 'a/b', 'a/c', 'a/d'].join('\n')],
  ['payload-starts-with-escape', [DEN_ESCAPE, 'x/y', 'x/z', 'x/w'].join('\n')],
  ['rule-line-in-middle', ['a/b', 'a/c', DEN_RULE, 'a/d'].join('\n')],
  ['section-sign-first', ['§ not a program', 'a/b', 'a/c', 'a/d'].join('\n')],
];
const rows: any[] = [];
const wires: string[] = [];
for (const [name, text] of cases) {
  const r = denEncode(text, enc, {});
  const tsDec = denDecode(r.wire);
  rows.push({ name, raw: r.inTokens, frontier: r.frontierM, dendron: r.messageTokens, delta: r.messageTokens - r.frontierM, applied: r.applied, treeLines: r.treeLines, notes: r.notes, tsExact: tsDec === text && r.exact });
  wires.push(r.wire);
  rows[rows.length - 1].original = text;
}
fs.mkdirSync('bench/z51/receipts', { recursive: true });
fs.writeFileSync('bench/z51/receipts/redteam-dendron.cases.json', JSON.stringify(wires));
fs.writeFileSync('bench/z51/receipts/redteam-dendron.expected.json', JSON.stringify(cases.map(c => c[1])));
execFileSync('python3', ['bench/dendron_decode.py', 'bench/z51/receipts/redteam-dendron.cases.json', 'bench/z51/receipts/redteam-dendron.py.json'], { stdio: 'inherit' });
const py: string[] = JSON.parse(fs.readFileSync('bench/z51/receipts/redteam-dendron.py.json', 'utf8'));
let pass = 0;
rows.forEach((row, i) => {
  row.pyExact = py[i] === row.original;
  if (row.tsExact && row.pyExact) pass++;
  delete row.original;
  console.log(JSON.stringify(row));
});
console.log(`RED-TEAM: ${pass}/${rows.length} byte-identical under native (TS) and CPython readers`);
