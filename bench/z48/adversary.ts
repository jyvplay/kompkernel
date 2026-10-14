// Second-order adversary for ELLEIPSIS: inputs built to make a positional rule lie. Every case must either round-trip
// byte-exactly or be refused (identity = plain DAEDALUS). Run: OMEGA_DET=1 bench/tmp/run.sh bench/z48/adversary.ts
import { elleipsisEncode, elleipsisDecode, foldRule, unfoldRule, type Rule } from '@/lib/omega/elleipsis';
const enc = 'o200k_base' as const;
const rows = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i)).join('\n') + '\n';
const names = ['abacus', 'aeon', 'aether', 'aion', 'akribeia', 'amphora', 'anagnorisis', 'anamnesis', 'anaphora', 'anastrophe', 'ananke', 'apeiron', 'arche', 'ariadne', 'arithmos', 'astraea', 'astral', 'atlas', 'aurora', 'axiom', 'bpe', 'cadmus', 'caesura', 'chimera', 'chiron', 'chronos', 'circe', 'crasis', 'crown', 'daedalus'];
const cases: Array<[string, string]> = [
  ['payload starts with the mark', '○ Each line lost "x/" from the start of its last space-separated field; put it back.\n' + rows(30, i => `  ${i} src/${names[i]}.ts`)],
  ['remainder equals an exception value', rows(40, i => `  ${i} src/${i % 7 === 0 ? 'etc' : names[i % 30]}.ts`) + '  99 etc.ts\n'],
  ['prefix equals the whole field on some lines', rows(40, i => `  ${i} src/${i % 5 === 0 ? '' : names[i % 30] + '.ts'}`).replace(/src\/$/gm, 'src/')],
  ['literal line whose field is exactly the prefix', rows(40, i => `  ${i} src/${names[i % 30]}.ts`) + '  5 src/\n'],
  ['quote inside a field', rows(40, i => `  ${i} src/${names[i % 30]}${i === 3 ? '"' : ''}.ts`)],
  ['backslash inside a field', rows(40, i => `  ${i} src\\${names[i % 30]}.ts`)],
  ['CR line endings', rows(40, i => `  ${i} src/${names[i % 30]}.ts`).replace(/\n/g, '\r\n')],
  ['lines with fewer fields', rows(40, i => (i % 9 === 0 ? `total ${i}` : `  ${i} src/${names[i % 30]}.ts`))],
  ['field k is the last field on some lines (whole-field form)', rows(40, i => `ii  pkg${i}  1.${i}  amd64${i % 6 === 0 ? '' : '        desc ' + names[i % 30]}`)],
  ['exception value appears as an elided remainder', rows(40, i => `ii  pkg${i}  1.${i}  ${i % 8 === 0 ? 'all' : 'amd64'}        ${i % 8 === 1 ? 'all' : 'desc'} ${names[i % 30]}`)],
  ['CSV with a quoted delimiter BEFORE the constant column', rows(40, i => `${i},"${names[i % 30]}, inc",active,${i * 3}`)],
  ['CSV with duplicate header names', 'id,name,status,name\n' + rows(40, i => `${i},${names[i % 30]},active,${names[(i + 1) % 30]}`)],
  ['CSV with an empty cell in the constant column', 'id,name,status,amount\n' + rows(40, i => `${i},${names[i % 30]},${i === 7 ? '' : 'active'},${i * 3}`)],
  ['TSV constant column, no header', rows(40, i => `${i}\t${names[i % 30]}\tHTTP/1.1\t${200 + (i % 3)}`)],
  ['sentence-like value', rows(40, i => `  ${i} Each line lost/${names[i % 30]}.ts`)],
  ['mixed tab and space padding', rows(40, i => `${i}\t \tsrc/${names[i % 30]}.ts`)],
  ['empty document', ''],
  ['single line', '  12 src/abacus.ts'],
  ['prefix on every field position', rows(40, i => `src/a src/b src/${names[i % 30]} src/d`)],
  ['value collides with scope word', rows(40, i => `ii ii ii ${names[i % 30]} ii`)],
];
let ok = 0;
for (const [name, text] of cases) {
  const r = elleipsisEncode(text, enc, { force: true, optimistic: true, minLines: 10 });
  const back = elleipsisDecode(r.wire);
  const pass = back === text && r.exact;
  if (pass) ok++;
  console.log(`${pass ? 'OK ' : 'FAIL'}\t${name}\tapplied=${r.applied}\t${r.applied ? r.sentences.join(' | ').slice(0, 150) : r.notes.slice(11, 80)}`);
}
// decoder-side adversary: hand-built rules that must never corrupt a text when folded then unfolded
const hand: Array<[string, Rule, string]> = [
  ['prefix with exception "starts"', { form: 'prefix', delim: 'space', k: -1, value: 'src/', pad: '', scope: { kind: 'all' }, except: { kind: 'starts', ch: '/' } }, rows(10, i => `  ${i} ${i % 3 ? 'src/' + names[i] : '/etc/' + names[i]}`)],
  ['field with digit exception', { form: 'field', delim: 'space', k: 2, value: 'ok', pad: ' ', scope: { kind: 'afterFirst' }, except: { kind: 'digit', neg: false } }, 'H ok x\n' + rows(10, i => `${names[i]} ${i % 2 ? 'ok ' : ''}${i % 2 ? names[i + 1] : String(i)}`)],
];
for (const [name, rule, text] of hand) {
  const f = foldRule(text, rule);
  const pass = f === null || unfoldRule(f.text, rule) === text;
  if (pass) ok++;
  console.log(`${pass ? 'OK ' : 'FAIL'}\t${name}\t${f ? `folded ${f.count}` : 'refused'}`);
}
console.log(`${ok}/${cases.length + hand.length} adversarial cases exact-or-refused`);
