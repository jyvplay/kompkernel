import fs from 'node:fs';import {build} from 'esbuild';
const budget=`class X168BudgetMap extends Map<string,number> {
 chars=0; clears=0; skipped=0;
 override clear(){super.clear();this.chars=0;this.clears++;}
 override set(key:string,value:number){if(key.length>4000000){this.skipped++;return this;}if(this.has(key))return super.set(key,value);if(this.chars+key.length>4000000)this.clear();this.chars+=key.length;return super.set(key,value);}
 override delete(key:string){if(!this.has(key))return false;this.chars-=key.length;return super.delete(key);}
}
`;
for(const arm of 'ABC')for(const [name,entry] of [['speed','bench/x164/cache-speed.ts'],['count','bench/x163/count-gate.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x168/${name}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'joint-chunk-key-budget',setup(b){b.onLoad({filter:/[\\/]bpe(?:-fast)?\.ts$/},a=>{let s=fs.readFileSync(a.path,'utf8');const anchor='const CHUNK_CACHE = new Map<string, number>();';if(s.split(anchor).length!==2)throw Error('cache anchor');let cls=budget;
if(arm==='C'){cls=cls.replace('return super.set(key,value);}', 'return super.set(key.length>12?Buffer.from(key,"utf16le").toString("utf16le"):key,value);}');s=s.replace('sc = new Map<string, number>();','sc = new X168BudgetMap();');}
s=cls+s.replace(anchor,'const CHUNK_CACHE = new X168BudgetMap();');return {contents:s,loader:'ts'};});}}]});
fs.writeFileSync('bench/x168/receipts/cache-patch.json',JSON.stringify({production:false,policy:'4M UTF16 key units each in bpe and bpe-fast CHUNK_CACHE; original entry limits retained; oversize keys bypass; no search changes',armC:'also use budget map for each SHORT_CACHE encoding; UTF16LE detached inserted keys above 12 units; rerun all gates',hardHeapBound:false},null,2));
