import fs from 'node:fs';import {build} from 'esbuild';
// Bench-only: avoid re-pretokenizing strings already emitted by PRETOK.
// Short arbitrary strings retain fastCount, including the 1/2-unit LUT path.
const old="const t = (FAST_BPE && enc === 'o200k_base' ? fastCount(c) : null) ?? API[enc].encode(c).length;";
const replacement="const t = (FAST_BPE && enc === 'o200k_base' ? (c.length > 2 && fastReady() ? fastChunkCount(c) : fastCount(c)) : null) ?? API[enc].encode(c).length;";
for(const arm of ['A','B'])for(const [name,entry] of [['speed','bench/x164/cache-speed.ts'],['count','bench/x163/count-gate.ts'],['target','bench/x170/count-target.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x172/${name}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'known-pretoken',setup(b){b.onLoad({filter:/[\\/]bpe\.ts$/},a=>{let s=fs.readFileSync(a.path,'utf8');if(s.split(old).length!==2)throw Error('anchor');s=s.replace("import { fastCount } from './bpe-fast';","import { fastCount, fastChunkCount, fastReady } from './bpe-fast';");return {contents:s.replace(old,replacement),loader:'ts'};});}}]});
