import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const C = (s: string) => countTokens(s, enc);
const F: Record<string, string> = {
  head: 'Decode the tape after the first LF by the rule it states, then:',
  headA: 'Decode the tape after the LF by its own rule, then:',
  headB: 'Tape after the LF decodes by its own rule; then',
  table: 'lines A-B are one table split by SEP into fields and the rest is literal.',
  tableA: 'lines A-B form a table split by SEP; the rest is literal.',
  tableB: 'A-B are a table split by SEP; rest literal.',
  runs: 'SEP _ means source fields are split by runs of 2+ spaces and come back joined by one; no non-final field holds a space.',
  runsA: '_ = source fields split by 2+ spaces, rejoined with 1; no non-final field has one.',
  runsB: '_ = fields split by 2+ spaces, rejoin with 1; only the last may hold a space.',
  verbatim: 'The first N lines of the table stay verbatim and the rest are rows r=0,1,2,...',
  verbatimA: 'first N table lines verbatim, the rest are rows r=0,1,..',
  align: "A lists each field's start column; a negative entry is the column where a right-aligned field ends.",
  alignA: "A = each field's start column, or with a minus the end column of a right-aligned field.",
  alignB: 'A = field start columns; minus = end column of a right-aligned field.',
  gen: 'G<c>=<spec> deletes column c and rebuilds it for each r in its own position.',
  genA: 'G<c>=<spec> deletes column c, rebuilt per r in place.',
  slot: 'In a spec {A+B}=A+B*r, {{ and }} are braces, mM=A+(B*r mod M), zW zero-pads to W digits, cX counts letters from X.',
  slotA: 'In a spec {A+B}=A+B*r, mM adds B*r mod M instead, zW zero-pads to W, cX counts letters from X, {{ }} are braces.',
  slotB: 'spec: {A+B}=A+B*r; m M = B*r mod M; z W = pad W; c X = letters from X; {{ }} = braces.',
  cycle: '#p:a,b,... cycles those p values.',
  date: '@A..B or @A+N is one date per row from A: w counts weekdays only and -i,j skips day offsets i and j.',
  tail: 'Print only the rebuilt text.',
  tailA: 'print only.',
};
for (const [k,v] of Object.entries(F)) console.log(String(C(v)).padStart(3), k.padEnd(9), v);
// sample assemblies
const asm1=[F.headA,F.tableA,F.verbatimA,F.genA,F.slotB,F.cycle,F.tailA].join(' ');
const asm2=[F.headB,F.tableB,F.verbatimA,F.genA,F.slotB,F.cycle,F.tailA].join(' ');
console.log('asm1',C(asm1)); console.log(asm1);
console.log('asm2',C(asm2)); console.log(asm2);
