import fs from 'node:fs';import {build} from 'esbuild';
const anchor='  const ids = encodeIds(text, enc);\n  const out: { id: number; s: string }[] = [];';
const replacement=`  const ids = encodeIds(text, enc);
  const mod:any=enc==='o200k_base'?X162_O:X162_C;
  const ranks=mod.default?.bytePairEncodingCoreProcessor?.bytePairRankDecoder;
  // Whole-call fast path only: mixed UTF8 fragments retain original streaming semantics.
  if(Array.isArray(ranks)&&ids.every(id=>typeof ranks[id]==='string')&&
      (!ids.length||!ranks[ids[0]].startsWith('\\ufeff'))){
    flushDecoder();return ids.map(id=>({id,s:ranks[id]}));
  }
  const out: { id: number; s: string }[] = [];`;
for(const entry of ['speed','token-gate'])for(const arm of ['A','B'])await build({entryPoints:[entry==='speed'?'bench/x155/speed.ts':'bench/x162/token-gate.ts'],bundle:true,platform:'node',format:'esm',outfile:`bench/x162/${entry}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'valid-token-stream',setup(b){b.onLoad({filter:/[\\/]bpe\.ts$/},a=>{let s=fs.readFileSync(a.path,'utf8');if(s.split(anchor).length!==2)throw Error('anchor');return {contents:"import * as X162_O from 'gpt-tokenizer/encoding/o200k_base';\nimport * as X162_C from 'gpt-tokenizer/encoding/cl100k_base';\n"+s.replace(anchor,replacement),loader:'ts'};});}}]});
fs.writeFileSync('bench/x162/receipts/speed-patch.json',JSON.stringify({anchor,replacement,production:false},null,2));
