import fs from 'node:fs';import {build} from 'esbuild';
const declarations=`
// X154 experiment: allocation-free exact 5..8-byte rank keys.
const R58_MASK=(1<<19)-1;
const R58_HI=new Uint32Array(1<<19),R58_LO=new Uint32Array(1<<19);
const R58_LEN=new Uint8Array(1<<19),R58_VAL=new Int32Array(1<<19);
function rank58(b:Uint8Array,s:number,e:number,put:number=-1):number {
 const n=e-s,hi=((b[s]<<24)|(b[s+1]<<16)|(b[s+2]<<8)|b[s+3])>>>0;
 let lo=0;for(let j=s+4;j<e;j++)lo=((lo<<8)|b[j])>>>0;
 let i=(Math.imul(hi,0x9e3779b1)^Math.imul(lo,0x85ebca6b)^n)&R58_MASK;
 for(;;){const len=R58_LEN[i];if(!len){if(put<0)return Infinity;R58_LEN[i]=n;R58_HI[i]=hi;R58_LO[i]=lo;R58_VAL[i]=put;return put;}
  if(len===n&&R58_HI[i]===hi&&R58_LO[i]===lo){if(put>=0)R58_VAL[i]=put;return R58_VAL[i];}i=(i+1)&R58_MASK;}
}
`;
const replacements=[['let READY = false;',declarations+'\nlet READY = false;'],['    LONG.clear();','    LONG.clear(); R58_LEN.fill(0);'],['      LONG.set(latin1(bytes, 0, n), rank);','      if(n<=8){rank58(bytes,0,n,rank);return;}\n      LONG.set(latin1(bytes, 0, n), rank);'],['  const v = LONG.get(latin1(b, s, e));','  if(n<=8)return rank58(b,s,e);\n  const v = LONG.get(latin1(b, s, e));']];
fs.writeFileSync('bench/x154/receipts/rank58-patch.json',JSON.stringify(replacements,null,2));
for(const entry of ['speed','bpe-gate'])for(const arm of ['A','B'])await build({entryPoints:[`bench/x154/${entry}.ts`],bundle:true,platform:'node',format:'esm',outfile:`bench/x154/${entry}58-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'rank58',setup(b){b.onLoad({filter:/[\\/]bpe-fast\.ts$/},args=>{let s=fs.readFileSync(args.path,'utf8');for(const [a,c] of replacements){if(s.split(a).length!==2)throw Error('patch mismatch');s=s.replace(a,c);}return {contents:s,loader:'ts'};});}}]});
