import { countTokens } from '../src/lib/omega/bpe';
import { CHIRON_SCRIPTS } from '../src/lib/omega/chiron';
const T=(s:string)=>countTokens(s,'o200k_base');
console.log('--- script labels ---');
for(const s of CHIRON_SCRIPTS) console.log(String(T(s.label)).padStart(3), s.name, JSON.stringify(s.label));
console.log('\n--- rules clause, CHIRON original per script ---');
for(const s of CHIRON_SCRIPTS){
  const c=`Every new ${s.label} before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.`;
  console.log(String(T(c)).padStart(3), s.name);
}
console.log('\n--- candidate minimal clauses (generic label) ---');
const cands=[
 'Every new non-English letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.',
 'Before ¶, each new non-English letter labels the text up to the next new letter. After ¶, expand all and print only the result.',
 'Before ¶ a new non-English letter labels the text after it, up to the next new letter. After ¶ expand all; print only the result.',
 'Before ¶ each new non-English letter labels the text after it. After ¶ expand all; print only the result.',
 'Before ¶ each new foreign letter labels the text after it. After ¶ expand all; print only the result.',
 'Before ¶ each new letter labels the text after it. After ¶ expand all; print only the result.',
 'Before ¶ a new letter labels the text after it. After ¶ expand all, print only the result.',
 'Before ¶ every new letter labels what follows it. After ¶ expand all; print only the result.',
];
for(const c of cands) console.log(String(T(c)).padStart(3), JSON.stringify(c));
console.log('\n--- with repeat/list op clauses ---');
const rep='×btn: t written n times.';
const repf='×btn: t written n times. Any letters after n are lists; in copy i the k-th b is item i of list k, cycling.';
const rng='…a..b = integers a to b.';
const spl='In a list the character right after … separates the items.';
const both='…a..b = integers a to b. Otherwise the character after … separates the items.';
for(const [n,c] of [['rep',rep],['rep+fill',repf],['range',rng],['split',spl],['both',both]] as Array<[string,string]>) console.log(String(T(c)).padStart(3), n);
const shorter=[
 ['rep','×btn = t n times.'],
 ['rep+fill','×btn = t n times; letters after n are lists, copy i takes item i of each, cycling.'],
 ['range','…a..b = a to b.'],
 ['split','In a list the char right after … splits the items.'],
 ['both','…a..b = a to b, else the char after … splits the items.'],
];
console.log('--- shortened op clauses ---');
for(const [n,c] of shorter) console.log(String(T(c)).padStart(3), n, JSON.stringify(c));
