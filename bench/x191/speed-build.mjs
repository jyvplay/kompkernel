import fs from 'node:fs';import {build} from 'esbuild';
const original=fs.readFileSync('src/lib/omega/bpe.ts','utf8');
const old='const LUT2 = new Map<number, number>();';
const replacement=`// X191 isolated experiment: lazy 16+16-bit pages; exact key, bounded storage.
const LUT2_PAGES:(Uint8Array|undefined)[]=new Array(65536);let LUT2_USED=0;
const LUT2={
 get(k:number):number|undefined{const p=LUT2_PAGES[k>>>16];if(!p)return undefined;const v=p[k&65535];return v?v-1:undefined;},
 set(k:number,v:number){if(!Number.isInteger(v)||v<0||v>254)throw Error('X191 cache range');let p=LUT2_PAGES[k>>>16];if(!p){if(LUT2_USED>=128)this.clear();LUT2_PAGES[k>>>16]=p=new Uint8Array(65536);LUT2_USED++;}p[k&65535]=v+1;},
 clear(){LUT2_PAGES.fill(undefined);LUT2_USED=0;}
};`;
if(original.split(old).length!==2)throw Error('anchor');
for(const arm of ['A','B'])for(const [name,entry] of [['speed','bench/x164/cache-speed.ts'],['count','bench/x163/count-gate.ts'],['vector','bench/x164/speed-unit.ts'],['merge','bench/x182/merge-attack.ts'],['threshold','bench/x185/threshold-attack.ts'],['pair','bench/x191/pair-attack.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x191/${name}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'paged-pair-count',setup(b){b.onLoad({filter:/[\\/]bpe\.ts$/},()=>({contents:original.replace(old,replacement),loader:'ts'}));}}]});
fs.writeFileSync('bench/x191/receipts/speed-patch.json',JSON.stringify({production:false,old,replacement,maxPageBytes:128*65536,scope:'o200k two-UTF16 chunk counts; exact-key page lookup, capped memory and clear semantics. Not a changed tokenizer.'},null,2));
