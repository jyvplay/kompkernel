import fs from 'node:fs';import {build} from 'esbuild';
const start='  for (let id = 0; id < limit; id++) {';
const end='  vocabCache.set(enc, out);';
const replacement=`  const module:any=enc==='o200k_base'?X160_O:X160_C;
  const core=module.default?.bytePairEncodingCoreProcessor??module.bytePairEncodingCoreProcessor;
  const vocabulary=core?.bytePairRankDecoder;
  if(!Array.isArray(vocabulary))throw Error('X160 installed tokenizer rank decoder unavailable');
  const minimum=Math.min(...CHIRON_SCRIPTS.flatMap(sc=>sc.ranges?sc.ranges.map(r=>r[0]):[sc.lo]));
  for(let id=0;id<limit;id++){
    let str:string;
    // Non-string slots retain the original flushed decoder path (including BOM).
    if(typeof vocabulary[id]==='string')str=vocabulary[id];
    else {try{str=decodeIds([id],enc);}catch{continue;}}
    if(!str||str.codePointAt(0)!<minimum)continue;
    const cps=[...str].map(c=>c.codePointAt(0)!);
    for(const sc of CHIRON_SCRIPTS){
      if(cps.every(c=>chironInScript(sc,c))){out.get(sc.name)!.push(str);break;}
    }
  }
`;

for(const entry of ['speed','pools'])for(const arm of ['A','B'])await build({entryPoints:[entry==='speed'?'bench/x155/speed.ts':'bench/x160/pools.ts'],bundle:true,platform:'node',format:'esm',outfile:`bench/x160/${entry}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'vocabulary-direct-index',setup(b){b.onLoad({filter:/[\\/]ariadne\.ts$/},a=>{let s=fs.readFileSync(a.path,'utf8');const i=s.indexOf(start),j=s.indexOf(end,i);if(i<0||j<0)throw Error('anchor');s=s.slice(0,i)+replacement+s.slice(j);return {contents:"import * as X160_O from 'gpt-tokenizer/encoding/o200k_base';\nimport * as X160_C from 'gpt-tokenizer/encoding/cl100k_base';\n"+s,loader:'ts'};});}}]});
fs.writeFileSync('bench/x160/receipts/speed-patch.json',JSON.stringify({start,end,replacement,production:false,scope:'same ordered script-pool contents from installed rank decoder plus non-string fallback; decoder semantics unchanged; API-version dependent'},null,2));
