import { countTokens } from '@/lib/omega/bpe';
const ENC='o200k_base' as any;
const T=(s:string)=>countTokens(s,ENC);
const cands:Array<[string,string,string]>=[
  ['[',']','~'],['(',')','~'],['<','>','~'],['{','}','~'],
  ['«','»','~'],['⟦','⟧','⇤'],['‹','›','~'],['⌈','⌉','~'],
  ['[',']','#'],['(',')','#'],['[',']','@'],['[',']','*'],
];
const units=['17.240000,','src/lib/omega/','node_modules/@babel/','the quick brown fox '];
console.log('framing'.padEnd(16),'per-char tok'.padStart(14),units.map(u=>u.slice(0,14).padStart(16)).join(''),'  AVG');
for(const [o,c,m] of cands){
  const pc=`${T(o)}/${T(c)}/${T(m)}`;
  const costs=units.map(u=>T(o+'4'+m+u+c)-T(u));
  const avg=costs.reduce((a,b)=>a+b,0)/costs.length;
  console.log((o+'N'+m+'X'+c).padEnd(16),pc.padStart(14),costs.map(x=>String(x).padStart(16)).join(''),String(avg.toFixed(1)).padStart(6));
}
