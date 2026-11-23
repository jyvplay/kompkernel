import fs from 'node:fs';import {build} from 'esbuild';
const original=fs.readFileSync('src/lib/omega/ariadne.ts','utf8'),anchor='const cache = new Map<string, number>();';if(original.split(anchor).length!==2)throw Error('cache anchor');
const code=`const X163_CACHE_STATS={evictions:0,maxEntries:0};(globalThis as any).__x163RunCacheStats=X163_CACHE_STATS;
class X163RunCache extends Map<string,number>{override set(k:string,v:number):this{if(this.size>=50000){this.clear();X163_CACHE_STATS.evictions++;}super.set(k,v);X163_CACHE_STATS.maxEntries=Math.max(X163_CACHE_STATS.maxEntries,this.size);return this;}}
(globalThis as any).__x163RunCacheClass=X163RunCache;
`+original.replace(anchor,'const cache = new X163RunCache();');
for(const entry of ['speed','number-trial','memory-trial','cache-unit'])for(const arm of (entry==='speed'?['A','B']:['B']))await build({entryPoints:[entry==='speed'?'bench/x163/cache-speed.ts':`bench/x163/${entry}.ts`],bundle:true,platform:'node',format:'esm',outfile:`bench/x163/cache-${entry}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'bounded-pure-run-cache',setup(b){b.onLoad({filter:/[\\/]ariadne\.ts$/},()=>({contents:code,loader:'ts'}));}}]});
fs.writeFileSync('bench/x163/receipts/cache-patch.json',JSON.stringify({production:false,anchor,replacement:'new X163RunCache; clear at50000entries; pure exact number values; original search/work limits unchanged',scope:'ARIADNE per-assignment run-cost lookup, not token memo or search pruning'},null,2));
