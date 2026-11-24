import fs from 'node:fs';import {build} from 'esbuild';
const anchor='function countLongRaw(text: string, enc: EncodingName, sink: MarkSink | null): number | null {';
const patch=`
  // X171 bench: stream the no-mark path; tracked-prefix path remains unchanged.
  if(sink===null){const re=PRETOK[enc];re.lastIndex=0;let covered=0,n=0,m:RegExpExecArray|null;const pfx=enc==='cl100k_base'?'\\u0002':'';
    while((m=re.exec(text))!==null){if(m.index!==covered||m[0].length===0){chunkFallbacks++;return null;}covered+=m[0].length;n+=chunkCountFast(m[0],enc,pfx);}
    if(covered!==text.length){chunkFallbacks++;return null;}return n;
  }
`;
for(const arm of ['A','B'])for(const [name,entry] of [['speed','bench/x164/cache-speed.ts'],['count','bench/x163/count-gate.ts'],['target','bench/x170/count-target.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x171/${name}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'streaming-untracked-fold',setup(b){b.onLoad({filter:/[\\/]bpe\.ts$/},a=>{const s=fs.readFileSync(a.path,'utf8');if(s.split(anchor).length!==2)throw Error('anchor');return {contents:s.replace(anchor,anchor+patch),loader:'ts'};});}}]});
