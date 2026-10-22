import { countTokens } from '@/lib/omega/bpe';
const ENC='o200k_base' as any;
const T=(s:string)=>countTokens(s,ENC);
const O='\u27e6',C='\u27e7',M='\u21e4';
const ALTS:Array<[string,string,string,string]>=[
  ['current (⟦ ⟧ ⇤)',O,C,M],
  ['brackets [] ~',   '[',']','~'],
  ['braces {} ~',     '{','}','~'],
  ['angle <> ~',      '<','>','~'],
  ['parens () ~',     '(',')','~'],
];
const units=['17.240000,','src/lib/omega/','node_modules/@babel/','the quick brown fox '];
console.log('unit'.padEnd(24),ALTS.map(a=>a[0].padStart(18)).join(''));
for(const u of units){
  const row=ALTS.map(([n,o,c,m])=>{
    const bare=T(u); const framed=T(o+'4'+m+u+c);
    return String(framed-bare).padStart(18);
  });
  console.log(u.padEnd(24).slice(0,24),row.join(''));
}
console.log('\n(lower = cheaper framing; current model charges 5)');
// also: does the count need a delimiter? test digit-run ambiguity with next-char digits
for(const [n,o,c,m] of ALTS){
  const s=o+'4'+m+'17.240000,'+c+'1990';
  console.log(n.padEnd(20),'full ctx tokens',T(s),'| worst case parse k=',/^4/.test('41990')?'4 (ok)':'ambiguous');
}
