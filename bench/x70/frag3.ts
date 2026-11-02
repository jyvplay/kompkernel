import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const C = (s: string) => countTokens(s, enc);
const cand: Record<string, string[]> = {
  base_b: [
    'Lines A-B of the text after the first LF are one table split by SEP; the rest of it is literal.',
    'The text after the first LF: lines A-B are one table split by SEP, the rest is literal.',
    'After the first LF: lines A-B are one table split by SEP; rest literal.',
  ],
  base_c: [
    'The text after the first LF is a c-tape: decode it by its own rule. Lines A-B of the result are one table split by SEP; the rest is literal.',
    'Decode the text after the first LF by its own tape rule; lines A-B of the result are one table split by SEP, the rest literal.',
  ],
  runs: [
    '_ = fields split by 2+ spaces and rejoined with 1; only the last may hold a space.',
    '_ = split on 2+ spaces, rejoin with 1; only the last field may hold a space.',
  ],
  verbatim: [
    'h = leading table lines kept as written; the others are rows r=0,1,2,..',
    'h = table lines kept as written, the rest are rows r=0,1,2,..',
  ],
  align: [
    "A = each field's start column; a minus sign means the column a right-aligned field ends at.",
    'A = field start columns; minus = end column of a right-aligned field.',
  ],
  gen: [
    'G<c>=<spec> deletes column c and rebuilds it per r in place.',
    'G<c>=<spec> restores deleted column c per r.',
    'G<c>=<spec>: column c deleted, rebuilt per r in place.',
    'G<c>=<spec> puts column c back, rebuilt per r.',
  ],
  s1: ['{A+B}=A+B*r', 'in specs {A+B}=A+B*r', '{A+B}=A+B*r;'],
  s2: ['mM=B*r mod M', 'mM = (B*r) mod M', 'mM=B*r mod M;'],
  s3: ['zW=pad to W', 'zW zero-pads W', 'zW=zero-pad W'],
  s4: ['cX=letter from X', 'cX=r-th letter from X'],
  s5: ['{{ }}={ }', '{{ and }} are braces'],
  cycle: ['#p:v,.. cycles p values', '#p:a,b,..=cycle'],
  date: ['@A..B or @A+N = one date per row from A, w=weekdays, -i skips day offset i'],
  tail: ['print only.', 'Print only the rebuilt text.'],
};
for (const [k, list] of Object.entries(cand)) for (const v of list) console.log(String(C(v)).padStart(3), k.padEnd(9), JSON.stringify(v));
