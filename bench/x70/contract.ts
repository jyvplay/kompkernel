import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const C = (s: string) => countTokens(s, enc);
const drafts: Record<string,string> = {
  kanon: `T: lines a-b are one table split by SEP into fields; the first hn lines stay verbatim and the rest are data rows r=0,1,2,... G<c>=<spec>: rebuild deleted column c for each data row r=0,1,2,... and put it back in its own position. In spec {A+D} is the number A+D*r; {{ and }} are literal braces. mM in a slot means A+((D*r) mod M). zW in a slot = zero-pad to W digits. #p:v0,v1,... = cycle through those p values.`,
  v1: `Each G<c>=<spec> rebuilds column c of data rows r=0,1,2,.. from row h on; put it back where it was. {A+D} is A+D*r; a slot suffix mN means mod N; zN means zero-pad to N digits; #N:a,b,.. cycles those N values. Print only.`,
  v2: `Rows h.. are data rows r=0,1,2,..; G<c>=<spec> rebuilds column c there. {A+D}=A+D*r; mM=mod M; zW=pad to W digits; #p:v,..=cycle p values. Print the text only.`,
  v3: `h = verbatim head lines. Rows after are r=0,1,2,..; each G<c>=<spec> restores column c. In a spec {A+D}=A+D*r, mM=that mod M, zW=zero-pad W digits, #p:a,b,..=cycle. Print only.`,
  v4: `h=head lines. Rows after are r=0,1,..: G<c>=<spec> restores column c; {n+d}=n+d*r, mN=mod N, zW=pad W, #N:a,b..=cycle. Print only.`,
};
for (const [k,v] of Object.entries(drafts)) console.log(String(C(v)).padStart(4), k, v.length);
// cost of empty residual rows
const empties = '\n'.repeat(25);
console.log('25 newlines =', C(empties), 'tok');
console.log('1 newline =', C('\n'));
