import fs from 'node:fs';import {build} from 'esbuild';
const old='    if (ascii) return mergeCount(SB, L);\n    bytes = TE.encode(chunk);';
const replacement='    if (ascii) return mergeCount(SB, L);\n    if (L * 3 <= SCRATCH_MAX) {\n      const { read, written } = TE.encodeInto(chunk, SB);\n      if (read === L) return mergeCount(SB, written);\n    }\n    bytes = TE.encode(chunk);';
fs.writeFileSync('bench/x153/receipts/speed-patch.json',JSON.stringify({old,replacement},null,2));
for(const entry of ['speed','bpe-gate'])for(const arm of ['A','B'])await build({entryPoints:[`bench/x153/${entry}.ts`],bundle:true,platform:'node',format:'esm',outfile:`bench/x153/${entry}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'utf8-into-scratch',setup(b){b.onLoad({filter:/[\\/]bpe-fast\.ts$/},args=>{const s=fs.readFileSync(args.path,'utf8');if(s.split(old).length!==2)throw Error('patch mismatch');return {contents:s.replace(old,replacement),loader:'ts'};});}}]});
