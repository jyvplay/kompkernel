// z52 red team for DENDRON-S. For every case: (a) the real encoder densEncode, (b) every tree arm FORCED
// (sep '.' and '/', rule chosen as the encoder would). All wires are decoded by the TS reader and by the
// independent CPython reader (bench/dendrons_decode.py); both must equal the input byte for byte.
import fs from 'node:fs';
import { densEncode, densDecode, densWireLines, densExpand, DENS_RULE, DENS_RULE_V, DENS_ESCAPE, DENS_SEPARATORS } from '@/lib/omega/dendrons';
import { daedalusEncode } from '@/lib/omega/daedalus';
const enc = 'o200k_base' as const;
const cases: { name: string; text: string }[] = [
  { name: 'empty', text: '' },
  { name: 'one-line', text: 'a.b.c' },
  { name: 'two-lines-share-head', text: 'a.b\na.c' },
  { name: 'three-dotted', text: 'net.a = 1\nnet.b = 2\nnet.c = 3' },
  { name: 'trailing-newline', text: 'x.a\nx.b\nx.c\n' },
  { name: 'leading-newlines', text: '\n\nx.a\nx.b\nx.c' },
  { name: 'interior-empty', text: 'x.a\n\nx.b\nx.c' },
  { name: 'only-empty-lines', text: '\n\n\n' },
  { name: 'bang-lines', text: '!important\n!!\n!\nx.a\nx.b' },
  { name: 'bang-inside-group', text: 'a.!x\na.y\na.z' },
  { name: 'braces-in-line', text: 'a.{b}\na.c\na.d' },
  { name: 'comma-values', text: 'k.a = 1,2\nk.b = 3,4\nk.c = 5' },
  { name: 'stray-close', text: 'a.}\na.x\na.y' },
  { name: 'stray-comma-top', text: 'a,b\na.c\na.d' },
  { name: 'empty-items', text: 'a.\na.b\na.' },
  { name: 'separator-only', text: '....\n...\n..\n.' },
  { name: 'dup-lines', text: 'p.q\np.q\np.q' },
  { name: 'unicode', text: 'ü.ä\nü.ö\nü.ß\n日.本\n日.語' },
  { name: 'nul-char', text: 'a.\u0000x\na.\u0000y\na.z' },
  { name: 'crlf', text: 'a.b\r\na.c\r\na.d\r' },
  { name: 'tabs-spaces', text: 'a.\tb\na. c\na.  d' },
  { name: 'bash-specials', text: 'v.$HOME\nv.*\nv.~x\nv.[a]\nv.`x`' },
  { name: 'dispatch-line-as-payload', text: DENS_RULE + '\nx.a\nx.b' },
  { name: 'dispatch-vline-as-payload', text: DENS_RULE_V + '\nx.a\nx.b' },
  { name: 'escape-line-as-payload', text: DENS_ESCAPE + '\nx.a\nx.b' },
  { name: 'deep-nesting', text: 'a.b.c.d.e.f\na.b.c.d.e.g\na.b.c.d.h\na.b.c.i\na.b.j\na.k' },
  { name: 'long-line', text: 'z.' + 'q'.repeat(3000) + '\nz.' + 'q'.repeat(2999) + 'r\nz.s' },
  { name: 'single-char-lines', text: 'a\nb\nc' },
  { name: 'prose-with-commas', text: 'Hello, world.\nIt is fine, really.\nYes, the end.' },
];
const wires: string[] = [];
const expected: string[] = [];
const rows: any[] = [];
for (const c of cases) {
  const r = densEncode(c.text, enc, {});
  const tsEnc = densDecode(r.wire) === c.text;
  wires.push(r.wire); expected.push(c.text);
  rows.push({ case: c.name, arm: 'encoder', applied: r.applied, sep: r.sep, tsExact: tsEnc, notes: r.notes.slice(0, 80) });
  for (const sep of DENS_SEPARATORS) {
    const wl = densWireLines(c.text, sep);
    const treeText = wl.join('\n');
    const expandOk = densExpand(treeText) === c.text;
    const rule = wl.some(l => l.startsWith('!')) ? DENS_RULE_V : DENS_RULE;
    const td = daedalusEncode(treeText, enc, {});
    const wire = rule + '\n' + td.wire;
    const tsOk = densDecode(wire) === c.text;
    wires.push(wire); expected.push(c.text);
    rows.push({ case: c.name, arm: 'forced:' + sep, expandOk, tsExact: tsOk });
  }
}
fs.mkdirSync('bench/z52/receipts', { recursive: true });
fs.writeFileSync('bench/z52/receipts/redteam-dens.wires.json', JSON.stringify(wires));
fs.writeFileSync('bench/z52/receipts/redteam-dens.expected.json', JSON.stringify(expected));
fs.writeFileSync('bench/z52/receipts/redteam-dens.ts.jsonl', rows.map(r => JSON.stringify(r)).join('\n') + '\n');
const bad = rows.filter(r => r.tsExact === false || r.expandOk === false);
console.log(`TS rows=${rows.length} tsFailures=${bad.length}`);
for (const b of bad) console.log(JSON.stringify(b));
