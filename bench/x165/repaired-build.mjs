import fs from 'node:fs';import {build} from 'esbuild';
const original=fs.readFileSync('src/lib/omega/ariadne.ts','utf8');
const helper=`
// X165 repaired numeric pages: direct array addressing, bounded no-eviction pages.
const x165O:Array<Uint8Array|undefined>=new Array(65536),x165C:Array<Uint8Array|undefined>=new Array(65536);
const x165SingleO=new Uint8Array(65536),x165SingleC=new Uint8Array(65536);
let x165NO=0,x165NC=0;
function x165Short(slots:number[],values:string[],enc:EncodingName):number|undefined {
 const n=slots.length;if(n<1||n>2)return undefined;
 const a=values[slots[0]];if(a.length!==1)return undefined;const c=a.charCodeAt(0),o=enc==='o200k_base';
 if(n===1){const one=o?x165SingleO:x165SingleC;let v=one[c];if(!v){v=countTokens(a,enc);one[c]=v;}return v;}
 const b=values[slots[1]];if(b.length!==1)return undefined;const d=b.charCodeAt(0),pages=o?x165O:x165C,page=((c>>>8)<<8)|(d>>>8),i=((c&255)<<8)|(d&255);
 let p=pages[page];if(!p){if((o?x165NO:x165NC)>=128)return undefined;p=new Uint8Array(65536);pages[page]=p;if(o)x165NO++;else x165NC++;}
 let v=p[i];if(!v){v=countTokens(a+b,enc);p[i]=v;}return v;
}
`;
let patched=original+helper;
for(const arr of ['after']){
 const old=`    let s = '';\n    for (const slot of state.patternSlots[i]) s += ${arr}[slot];\n    let v = cache.get(s);\n    if (v === undefined) { v = countTokens(s, enc); cache.set(s, v); }`;
 const next=`    let v = x165Short(state.patternSlots[i],${arr},enc);
    if(v===undefined){let s='';for(const slot of state.patternSlots[i])s+=${arr}[slot];v=cache.get(s);if(v===undefined){v=countTokens(s,enc);cache.set(s,v);}}`;
 if(patched.split(old).length!==3)throw Error('expected two scorer anchors');patched=patched.replaceAll(old,next);
}
for(const arm of 'AB')for(const [entry,file] of [['cache-speed','bench/x163/cache-speed.ts'],['speed-unit','bench/x164/speed-unit.ts'],['speed-target','bench/x165/speed-target.ts']])await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',outfile:`bench/x165/repaired-${entry}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'paged-short-runs',setup(b){b.onLoad({filter:/[\\/]ariadne\.ts$/},()=>({contents:patched,loader:'ts'}));}}]});
fs.writeFileSync('bench/x165/receipts/repaired-speed-patch.json',JSON.stringify({production:false,helper,scope:'two delta scorers, ≤2 one-UTF16-unit glyph runs; all other calls unchanged',maxPagesPerEncoding:128,pageBytes:65536},null,2));
