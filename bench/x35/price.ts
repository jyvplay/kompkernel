import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
let s=12345; const rnd=()=>((s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff);
const pick=(A:string,n:number)=>{let o='';for(let i=0;i<n;i++)o+=A[Math.floor(rnd()*A.length)];return o;};
const HEX='0123456789abcdef', DIG='0123456789';
const ALPHAS:Record<string,string>={
  hex:HEX, digits:DIG,
  pyr:'etaoinsrhldcumyp',            // PYKNOSIS alphabet (letters)
  a16:'abcdefghijklmnop',            // 16 letters contiguous
  a10:'abcdefghij',                  // 10 letters
  dig16:'0123456789abcdef',          // = hex
  upper:'ABCDEFGHIJKLMNOP',
  mixed:'0123456789ABCDEF',
};
// remap hex -> digits via base-16 index expressed in the target alphabet
const fwd=(src:string,to:string)=>{let o='';for(const c of src)o+=to[HEX.indexOf(c)];return o;};
for(const L of [8,16,24,32,48,64]){
  const out:string[]=[];
  const base=pick(HEX,L);
  for(const [name,A] of Object.entries(ALPHAS)){
    const s2 = A===HEX? base : (A===DIG? fwd(base,'0123456789'+'abcdef') : fwd(base,A));
    if(name==='mixed'||name==='upper') {}
    let tot=0; const N=40;
    for(let i=0;i<N;i++){ const b=pick(HEX,L); const t=(name==='hex')?b:fwd(b,A); tot+=countTokens(t,enc); }
    out.push(`${name}:${(L*N/tot).toFixed(2)}`);
  }
  console.log('len',String(L).padStart(2),'| chars per token ->',out.join(' '));
}
