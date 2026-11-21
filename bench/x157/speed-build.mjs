import fs from 'node:fs';import {build} from 'esbuild';
const anchor='function countLongRaw(text: string, enc: EncodingName, sink: MarkSink | null): number | null {';
const replacement=`const X157_SCAN:Record<EncodingName,RegExp>={o200k_base:new RegExp(PRETOK.o200k_base.source,PRETOK.o200k_base.flags),cl100k_base:new RegExp(PRETOK.cl100k_base.source,PRETOK.cl100k_base.flags)};
${anchor}
  if(sink===null){
    const scan=X157_SCAN[enc];scan.lastIndex=0;let total=0,covered=0,m:RegExpExecArray|null;
    const prefix=enc==='cl100k_base'?'\\u0002':'';
    while((m=scan.exec(text))!==null){if(!m[0].length||m.index!==covered){chunkFallbacks++;return null;}covered+=m[0].length;total+=chunkCountFast(m[0],enc,prefix);}
    if(covered!==text.length){chunkFallbacks++;return null;}return total;
  }`;
for(const entry of ['speed','bpe-gate'])for(const arm of ['A','B'])await build({entryPoints:[entry==='speed'?'bench/x155/speed.ts':'bench/x157/bpe-gate.ts'],bundle:true,platform:'node',format:'esm',outfile:`bench/x157/${entry}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'stream-count-chunks',setup(b){b.onLoad({filter:/[\\/]bpe\.ts$/},a=>{const s=fs.readFileSync(a.path,'utf8');if(s.split(anchor).length!==2)throw Error('anchor');return {contents:s.replace(anchor,replacement),loader:'ts'};});}}]});
fs.writeFileSync('bench/x157/receipts/speed-patch.json',JSON.stringify({anchor,replacement,description:'Stream no-mark chunk counts with a separate regex cursor; retain original marked traversal. Not deployed. OOM trace suggests a hypothesis, not a diagnosis.',production:false},null,2));
