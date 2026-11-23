import fs from 'node:fs';import {build} from 'esbuild';
const original=fs.readFileSync('src/lib/omega/bpe-fast.ts','utf8'),anchor='const CHUNK_CACHE_MAX = 1 << 21;';if(original.split(anchor).length!==2)throw Error('cache anchor');
const replacement=original.replace(anchor,'const CHUNK_CACHE_MAX = 1 << 16;');
for(const arm of 'AB')for(const [name,entry] of [['cache-speed','bench/x164/cache-speed.ts'],['cache-count','bench/x163/count-gate.ts'],['cache-capacity','bench/x164/cache-capacity.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x164/${name}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'bound-global-fast-chunks',setup(b){b.onLoad({filter:/[\\/]bpe-fast\.ts$/},()=>({contents:replacement,loader:'ts'}));}}]});
fs.writeFileSync('bench/x164/receipts/cache-patch.json',JSON.stringify({production:false,cache:'bpe-fast.CHUNK_CACHE',before:2097152,after:65536,policy:'unchanged clear-on-capacity, exact full-string keys, no search changes'},null,2));
