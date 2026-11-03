import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const pool: Record<string, string[]> = {
  baseLit: [
    'Lines A-B (from 0) below the directive line are one table split by SEP; the rest is literal.',
    'Lines A-B (0-based, below the contract) are one SEP-split table; all else is literal.',
    'A-B are the 0-based body lines of one SEP-split table; all else is literal.',
    'A-B are 0-based body lines forming one SEP-split table; the rest is literal.',
    'A-B are 0-based body lines of a SEP-split table; the rest is literal.',
  ],
  genHead: [
    'G<c>=<spec> restores deleted column c per row r;',
    'G<c>=<spec> rebuilds column c for row r;',
    'G<c>=<spec> gives column c from row r;',
    'G<c>=<spec> rebuilds column c at row r;',
  ],
  s3: ['zW=zero-pad to W', 'zW=pad to W digits', 'zW=zero-pad to W digits'],
  s4: ['cX is the r-th letter from X', 'cX=r-th letter of X', 'cX=letter r of X'],
  s2: ['mM=A+(B*r mod M)', 'mM=A+B*r mod M', 'mM=A+(B*r)%M'],
  s1: ['{A+B}=A+B*r', '{A+B}=A+B·r', '{A+B}=A,B→A+B*r'],
  cycle: ['#p:v,.. cycles p values.', '#p:v,.. cycles p values', '#p:v.. cycles p values.'],
  tail: ['print only.', 'print only'],
  verbatim: ['h = leading lines kept, then rows r=0,1,2,..', 'h = lines kept before r=0', 'h = leading lines kept, then rows count from 0'],
  align: ['A = field start columns, minus = end column of a right-aligned field.', 'A = field start columns; a negative entry is a right-aligned field end.', 'A = column starts; negative = right-aligned end.'],
  runs: ['_ = fields split by 2+ spaces, rejoined with 1; only the last may hold a space.', '_ = 2+ spaces split fields, redone as 1; only the last field may contain a space.', '_ = fields split on 2+ spaces, rejoined by 1 space; last field may keep spaces.'],
};
for (const [k, v] of Object.entries(pool)) {
  console.log(`-- ${k}`);
  for (const s of v) console.log(`  ${String(T(s)).padStart(3)}  ${s}`);
}
