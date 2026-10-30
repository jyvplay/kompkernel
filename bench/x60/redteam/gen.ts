// X60 EIRMOS red-team generator (seeded, deterministic).
import * as fs from 'node:fs';
const DIR = 'bench/x60/redteam/cases';
fs.mkdirSync(DIR, { recursive: true });
let seed = 0x6060;
const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const ri = (n: number): number => Math.floor(rnd() * n);
const FIRST = ['Ada', 'Alan', 'Grace', 'Edsger', 'Barbara', 'Donald', 'Radia', 'Linus', 'Margaret', 'Katherine', 'Dennis', 'Frances', 'Tim', 'Vint', 'Radia', 'Shafi', 'Leslie', 'John', 'Mary', 'James'];
const LAST = ['Lovelace', 'Turing', 'Hopper', 'Dijkstra', 'Liskov', 'Knuth', 'Perlman', 'Torvalds', 'Hamilton', 'Johnson', 'Ritchie', 'Allen', 'Berners-Lee', 'Cerf', 'Goldwasser', 'Lamport', 'von Neumann', 'Smith', 'Garcia', 'Kim'];
const pick = <T,>(a: T[]): T => a[ri(a.length)]!;
const cases: { name: string; text: string; expect: 'apply' | 'refuse' | 'any' }[] = [];
function people(n: number): [string, string][] {
  return Array.from({ length: n }, (_, i) => [`${pick(FIRST)}${i}`, `${pick(LAST)}${i}`] as [string, string]);
}
// 1 full name
{
  const rows = ['first,last,full,age'];
  people(160).forEach(([f, l], i) => rows.push(`${f},${l},${f} ${l},${20 + ri(50)}`));
  cases.push({ name: 'full-name', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 2 email lower first.last@domain
{
  const rows = ['first,last,email'];
  people(160).forEach(([f, l]) => rows.push(`${f},${l},${f.toLowerCase()}.${l.toLowerCase()}@example.com`));
  cases.push({ name: 'email', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 3 sortable Last, First (quoted target!) - render with quotes via wrapping in writer: value contains comma -> quote
{
  const rows = ['first,last,sortable'];
  people(160).forEach(([f, l]) => rows.push(`${f},${l},"${l}, ${f}"`));
  cases.push({ name: 'sortable-quoted', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 4 username initial+lower last
{
  const rows = ['first,last,username'];
  people(160).forEach(([f, l]) => rows.push(`${f},${l},${f[0]!.toLowerCase()}${l.toLowerCase()}`));
  cases.push({ name: 'username', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 5 SKU prefix + id + suffix literal, upper code
{
  const rows = ['code,id,sku'];
  const codes = ['ab', 'cd', 'ef', 'gh', 'ij', 'kl', 'mn', 'op'];
  for (let i = 0; i < 160; i++) { const c = pick(codes) + i; rows.push(`${c},${1000 + i},SKU-${c.toUpperCase()}-${1000 + i}-X`); }
  cases.push({ name: 'sku', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 6 three sources: first + middle initial + last
{
  const rows = ['first,middle,last,display'];
  people(160).forEach(([f, l]) => { const m = pick(FIRST); rows.push(`${f},${m},${l},${f} ${m[0]}. ${l}`); });
  cases.push({ name: 'three-source', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 7 two exceptions
{
  const rows = ['first,last,full'];
  people(160).forEach(([f, l], i) => rows.push(`${f},${l},${i === 5 || i === 99 ? 'REDACTED' : `${f} ${l}`}`));
  cases.push({ name: 'exceptions', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 8 many exceptions -> refuse this column
{
  const rows = ['first,last,full'];
  people(160).forEach(([f, l], i) => rows.push(`${f},${l},${i % 10 === 0 ? '???' : `${f} ${l}`}`));
  cases.push({ name: 'too-many-exceptions', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 9 duplicate column (pure copy) -> refuse (APOGRAPHE owns)
{
  const rows = ['a,b'];
  for (let i = 0; i < 160; i++) rows.push(`v${i},v${i}`);
  cases.push({ name: 'pure-copy', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 10 UPPER of low-cardinality code (<=64 distinct) -> refuse (lookup owns)
{
  const rows = ['code,CODE'];
  const codes = ['aa', 'bb', 'cc', 'dd', 'ee', 'ff'];
  for (let i = 0; i < 160; i++) { const c = codes[i % codes.length]!; rows.push(`${c},${c.toUpperCase()}`); }
  cases.push({ name: 'upper-lowcard', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 11 UPPER of high-cardinality code -> apply
{
  const rows = ['code,CODE'];
  for (let i = 0; i < 200; i++) { const c = `x${i}y${ri(100)}`; rows.push(`${c},${c.toUpperCase()}`); }
  cases.push({ name: 'upper-highcard', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 12 random target (not a template) -> refuse
{
  const rows = ['first,last,note'];
  people(160).forEach(([f, l]) => rows.push(`${f},${l},z${ri(100000)}q`));
  cases.push({ name: 'random-target', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 13 empty middle parts: full built from first+last but some last empty
{
  const rows = ['first,last,full'];
  people(160).forEach(([f, l], i) => { const last = i % 17 === 0 ? '' : l; rows.push(`${f},${last},${f} ${last}`); });
  cases.push({ name: 'empty-source-cells', text: rows.join('\n') + '\n', expect: 'any' });
}
// 14 TSV + CRLF email
{
  const rows = ['first\tlast\temail'];
  people(160).forEach(([f, l]) => rows.push(`${f}\t${l}\t${f.toLowerCase()}.${l.toLowerCase()}@x.io`));
  cases.push({ name: 'tsv-crlf', text: rows.join('\r\n') + '\r\n', expect: 'apply' });
}
// 15 non-ASCII case transform (Turkish I) -> planner must not claim lower; any outcome but exact-if-applied
{
  const rows = ['name,lower'];
  for (let i = 0; i < 160; i++) { const nm = `İPEK${i}`; rows.push(`${nm},${nm.toLowerCase()}`); }
  cases.push({ name: 'nonascii-case', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 16 overlapping segmentation trap: first is prefix of full in two ways (Ann + "A Lee"? ) first="Ann", last="Ann", full="Ann Ann"
{
  const rows = ['first,last,full'];
  for (let i = 0; i < 160; i++) { const f = `Ann${i}`; rows.push(`${f},${f},${f} ${f}`); }
  cases.push({ name: 'overlap-trap', text: rows.join('\n') + '\n', expect: 'any' });
}
// 17 target in first column position (drop col 0), sources after
{
  const rows = ['full,first,last'];
  people(160).forEach(([f, l]) => rows.push(`${f} ${l},${f},${l}`));
  cases.push({ name: 'target-first-col', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 18 two derived columns at once (full + email) -> apply (>=1 drop)
{
  const rows = ['first,last,full,email'];
  people(200).forEach(([f, l]) => rows.push(`${f},${l},${f} ${l},${f.toLowerCase()}.${l.toLowerCase()}@ex.com`));
  cases.push({ name: 'two-drops', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 19 quoted sources with commas ("Smith, Jr.")
{
  const rows = ['first,last,full'];
  people(160).forEach(([f, l], i) => { const last = i % 9 === 0 ? `${l}, Jr.` : l; const lastRaw = last.includes(',') ? `"${last}"` : last; const full = `${f} ${last}`; const fullRaw = full.includes(',') ? `"${full}"` : full; rows.push(`${f},${lastRaw},${fullRaw}`); });
  cases.push({ name: 'quoted-source-comma', text: rows.join('\n') + '\n', expect: 'any' });
}
// 20 tiny -> refuse
cases.push({ name: 'tiny', text: 'f,l,full\nA,B,A B\nC,D,C D\n', expect: 'refuse' });
// 21 no trailing newline
{
  const rows = ['first,last,full'];
  people(140).forEach(([f, l]) => rows.push(`${f},${l},${f} ${l}`));
  cases.push({ name: 'no-trailing-nl', text: rows.join('\n'), expect: 'apply' });
}
// 22 city, ST display (two sources + literal ", ")
{
  const rows = ['city,state,display,zip'];
  const cities = ['Austin', 'Denver', 'Miami', 'Seattle', 'Boston', 'Chicago'];
  const states = ['TX', 'CO', 'FL', 'WA', 'MA', 'IL'];
  for (let i = 0; i < 180; i++) { const j = ri(6); const ct = `${cities[j]}${i}`; rows.push(`${ct},${states[j]},"${ct}, ${states[j]}",${10000 + ri(89999)}`); }
  cases.push({ name: 'city-state', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 23 copy disguised as UPPER over letter-free values -> refuse
{
  const rows = ['a,b'];
  for (let i = 0; i < 160; i++) rows.push(`123-${i},123-${i}`);
  cases.push({ name: 'copy-disguise-upper', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 24 exception in the FIRST data row
{
  const rows = ['first,last,full'];
  people(160).forEach(([f, l], i) => rows.push(`${f},${l},${i === 0 ? 'REDACTED' : `${f} ${l}`}`));
  cases.push({ name: 'exception-first-row', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 25 copy disguised as capfirst over already-capitalized values -> refuse
{
  const rows = ['a,b'];
  for (let i = 0; i < 160; i++) rows.push(`V${i}x,V${i}x`);
  cases.push({ name: 'copy-disguise-capfirst', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 26 comma in exception would collide with the contract's exception separator -> refuse
{
  const rows = ['first,last,full'];
  people(160).forEach(([f, l], i) => { const v = i === 51 ? 'EXCEPTION,WITH-COMMA' : `${f} ${l}`; const raw = v.includes(',') ? '"' + v + '"' : v; rows.push(`${f},${l},${raw}`); });
  cases.push({ name: 'exception-comma-contract', text: rows.join('\n') + '\n', expect: 'refuse' });
}
// 27 header requiring positional field reference due braces/comma
{
  const rows = ['first,last,"full,name"'];
  people(160).forEach(([f, l]) => rows.push(`${f},${l},${f} ${l}`));
  cases.push({ name: 'special-header', text: rows.join('\n') + '\n', expect: 'apply' });
}
// 28 astral-codepoint slicing: first2 must not split a UTF-16 surrogate pair
{
  const rows = ['source,prefix,detail'];
  for (let i = 0; i < 240; i++) {
    const a = String.fromCodePoint(0x1F600 + i);
    const b = String.fromCodePoint(0x1F680 + i);
    rows.push(`${a}${b}TAIL${i},${a}${b},${'x'.repeat(40)}`);
  }
  cases.push({ name: 'astral-first2', text: rows.join('\n') + '\n', expect: 'apply' });
}
for (const c of cases) fs.writeFileSync(`${DIR}/${c.name}.csv`, c.text);
// Decoder-only astral test: the planner properly refuses this uneconomic
// 2-codepoint field, but a hand-authored valid one-chat contract still must
// decode the first two Unicode code points without splitting surrogate pairs.
{
  const text = cases.find((c) => c.name === 'astral-first2')!.text;
  const lines = text.trimEnd().split('\n');
  const reduced = lines.map((line) => { const p = line.split(','); return `${p[0]},${p[2]}`; }).join('\n') + '\n';
  fs.writeFileSync(`${DIR}/astral-tf.csv`, text);
  fs.writeFileSync(`${DIR}/astral-tf.reduced.txt`, reduced);
  fs.writeFileSync(`${DIR}/astral-tf.contract.txt`, 'EIRMOS: after decoding below, in the comma-separated table insert as header field and value in every row: field 2 "prefix": first2 {source}. {x} means that row\'s decoded {x}; + joins text pieces end to end; quoted pieces are literal text; first2 {x} = the first 2 Unicode code points of {x} (fewer if {x} is shorter). Change nothing else.');
}
fs.writeFileSync(`${DIR}/manifest.json`, JSON.stringify(cases.map((c) => ({ name: c.name, expect: c.expect })), null, 1));
console.log('cases', cases.length);
