import fs from 'node:fs';import {build} from 'esbuild';
const original=fs.readFileSync('src/lib/omega/ariadne.ts','utf8');
const helper=`
// X165 benchmark-only: exact paged short-run counts, no string allocation on hits.
const x165Pages=new Map<string,Map<number,Uint8Array>>();
function x165Short(slots:number[],values:string[],enc:EncodingName):number|undefined {
 if(slots.length<1||slots.length>2)return undefined;
 const a=values[slots[0]],b=slots.length===2?values[slots[1]]:'';
 if(a.length!==1||b.length!==(slots.length===2?1:0))return undefined;
 const c=a.charCodeAt(0),d=b?b.charCodeAt(0):0;
 const page=(c>>>8)*512+(b?(d>>>8):256),index=((c&255)<<8)|(d&255);
 let pages=x165Pages.get(enc);if(!pages){pages=new Map();x165Pages.set(enc,pages);}
 let p=pages.get(page);if(!p){if(pages.size>=128)pages.clear();p=new Uint8Array(65536);pages.set(page,p);}
 const hit=p[index];if(hit)return hit;
 const n=countTokens(a+b,enc);if(n>0&&n<256)p[index]=n;return n;
}
`;
let patched=original+helper;
for(const arr of ['after']){
 const old=`    let s = '';\n    for (const slot of state.patternSlots[i]) s += ${arr}[slot];\n    let v = cache.get(s);\n    if (v === undefined) { v = countTokens(s, enc); cache.set(s, v); }`;
 const next=`    let v = x165Short(state.patternSlots[i],${arr},enc);
    if(v===undefined){let s='';for(const slot of state.patternSlots[i])s+=${arr}[slot];v=cache.get(s);if(v===undefined){v=countTokens(s,enc);cache.set(s,v);}}`;
 if(patched.split(old).length!==3)throw Error('expected two scorer anchors');patched=patched.replaceAll(old,next);
}
for(const arm of 'AB')for(const [entry,file] of [['cache-speed','bench/x163/cache-speed.ts'],['speed-unit','bench/x164/speed-unit.ts']])await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',outfile:`bench/x165/${entry}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'paged-short-runs',setup(b){b.onLoad({filter:/[\\/]ariadne\.ts$/},()=>({contents:patched,loader:'ts'}));}}]});
fs.writeFileSync('bench/x165/receipts/speed-patch.json',JSON.stringify({production:false,helper,scope:'two delta scorers, ≤2 one-UTF16-unit glyph runs; all other calls unchanged',maxPagesPerEncoding:128,pageBytes:65536},null,2));
