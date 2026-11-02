import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const C = (s: string) => countTokens(s, enc);
const psql: Record<string,string> = {
  cur: 'After the first LF, lines A-B (0-based) of the rest are one table split by SEP; what is outside it is literal. h = leading lines kept as written, then rows r=0,1,2,.. G<c>=<spec> restores deleted column c in place, rebuilt per r, where {A+B}=A+B*r, mM=B*r mod M, zW=pad W. #p:v,.. cycles p values. print only.',
  d1: 'Directive line, then the text. Lines A-B of it (from 0) are a table split by SEP; the rest is literal. G<c>=<spec> puts deleted column c back, per row r, where {A+B}=A+B*r, mM=B*r mod M, zW=pad W. #p:v,.. cycles p values. print only.',
  d2: 'Directive line then text. Text lines A-B (from 0) are one table split by SEP, the rest literal. G<c>=<spec> puts deleted column c back per row r, where {A+B}=A+B*r, mM=B*r mod M, zW=pad W, #p:v,.. cycles p values. print only.',
  d3: 'Text lines A-B (from 0) are one table split by SEP, rest literal. G<c>=<spec> puts deleted column c back per row r; {A+B}=A+B*r, mM=B*r mod M, zW=pad W, #p:v,.. cycles p values. print only.',
  d4: 'Lines A-B (from 0) of the text are one table split by SEP; rest literal. G<c>=<spec> restores deleted column c per row r; {A+B}=A+B*r mM=B*r mod M zW=pad W; #p:v,.. cycles p values. print only.',
};
for (const [k,v] of Object.entries(psql)) console.log(String(C(v)).padStart(3), k, v);
const metricsNoH = {
  d3: 'Text lines A-B (from 0) are one table split by SEP, rest literal. h = leading lines kept, then rows r=0,1,2,.. G<c>=<spec> puts deleted column c back per row r; {A+B}=A+B*r, mM=B*r mod M, zW=pad W, #p:v,.. cycles p values. print only.',
};
for (const [k,v] of Object.entries(metricsNoH)) console.log(String(C(v)).padStart(3), 'metrics-'+k, v);
const kub = 'Lines A-B (from 0) of the text are one table split by SEP; rest literal. _ = fields split by 2+ spaces, rejoined with 1; only the last may hold a space. h = leading lines kept, then rows r=0,1,2,.. A = field start columns, minus = end column of a right-aligned field. G<c>=<spec> restores deleted column c per row r; {A+B}=A+B*r mM=B*r mod M zW=pad W cX=letter from X; #p:v,.. cycles p values. print only.';
console.log(String(C(kub)).padStart(3), 'kubectl');
