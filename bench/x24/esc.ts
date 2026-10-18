import {countTokens} from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const base='44539475';
console.log('baseline',JSON.stringify(base),T(base));
const cands=['~',"'",';','|','#','^','*','`','!','?','%','&','+','=','/','\\','_','@','$','"',',','.','-'];
const res:string[]=[];
for(const c of cands){
  const suf=T(base+c), pre=T(c+base);
  res.push(`${JSON.stringify(c)}: suf=${suf}(${suf-T(base)>=0?'+':''}${suf-T(base)}) pre=${pre}(${pre-T(base)>=0?'+':''}${pre-T(base)})`);
}
console.log(res.join('  '));
console.log('--- date with sentinel ---');
for(const c of ['~',"'",';','|','#','^','*','_'])
  console.log(JSON.stringify(c+'20260814'),T(c+'20260814'),JSON.stringify('20260814'+c),T('20260814'+c));
