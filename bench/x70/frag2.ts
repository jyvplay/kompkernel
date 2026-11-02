import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const C = (s: string) => countTokens(s, enc);
const D: Record<string,string> = {
  D: `h=head lines; rows r=0,1,..; G<c>=<spec> deletes col c, restore per r in place; {A+B}=A+B*r; mM=B*r mod M; zW=pad W; cX=nth letter from X; #p:v,..=cycle; first LF: rest is a c-tape, decode by its own rule; print only.`,
  E: `h=head lines. rows r=0,1,..: G<c>=<spec> deletes col c, restore per r. {A+B}=A+B*r. mM=B*r mod M. zW=pad W. cX=letter from X. #p:v,..=cycle. rest of msg = c-tape by its rule. print only.`,
  F: `h=head. rows r=0,1,.. G<c>=<spec> deletes col c, restore per r. {A+B}=A+B*r mM=B*r mod M zW=pad W cX=letter from X #p:v,..=cycle. rest= c-tape, own rule. print only.`,
  G: `h=head. r=0,1,.. per row. G<c>=<spec> deletes col c, restored per r. {A+B}=A+B*r; mM=B*r mod M; zW=pad W; cX=letter from X; #p:v,..=cycle. after LF: c-tape, own rule. print only.`,
};
for (const [k,v] of Object.entries(D)) console.log(String(C(v)).padStart(3), k, v);
const runs = `_ = fields split by 2+ spaces, rejoin with 1; only the last holds a space.`;
const align = `A = field start cols; minus = end col of a right-aligned field.`;
console.log('runs', C(runs), 'align', C(align));
const kub = [D.G, runs, align].join(' ');
console.log('kubectl-ish total', C(kub));
console.log(kub);
