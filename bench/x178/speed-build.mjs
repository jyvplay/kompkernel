import fs from 'node:fs';import {build} from 'esbuild';
const original=fs.readFileSync('src/lib/omega/bpe.ts','utf8');
const old='const LUT2 = new Map<number, number>();';if(original.split(old).length!==2)throw Error('patch anchor');
const replacement=`// X178 bench-only exact Latin-1 pair count cache; others retain Map.
const LUT2_DENSE=new Int16Array(65536).fill(-1),LUT2_REST=new Map<number,number>();
const LUT2={
 get(k:number):number|undefined{const a=k>>>16,b=k&65535;if(a<256&&b<256){const v=LUT2_DENSE[(a<<8)|b];return v<0?undefined:v;}return LUT2_REST.get(k);},
 set(k:number,v:number){const a=k>>>16,b=k&65535;if(a<256&&b<256)LUT2_DENSE[(a<<8)|b]=v;else LUT2_REST.set(k,v);},
 clear(){LUT2_DENSE.fill(-1);LUT2_REST.clear();}
};`;
const patched=original.replace(old,replacement);
for(const arm of ['A','B'])for(const [name,entry] of [['speed','bench/x164/cache-speed.ts'],['count','bench/x163/count-gate.ts'],['vector','bench/x164/speed-unit.ts'],['pair','bench/x178/pair-gate.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x178/${name}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'latin1-pair-cache',setup(b){b.onLoad({filter:/[\\/]bpe\.ts$/},()=>({contents:patched,loader:'ts'}));}}]});
fs.writeFileSync('bench/x178/receipts/speed-patch.json',JSON.stringify({production:false,original:old,replacement,scope:'Exact cache storage only, not fewer candidates or weakened fidelity; 128 KiB extra dense storage.'},null,2));
