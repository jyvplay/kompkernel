import fs from 'node:fs';import {build} from 'esbuild';
const replacements=[
 ['let i = k & H3_MASK;','let i = (Math.imul(k, 0x9e3779b1) >>> (32-H3_BITS)) & H3_MASK;'],
 ['let i = (b[s] * 65536 + b[s + 1] * 256 + b[s + 2]) & H3_MASK;','let i = (Math.imul((b[s] << 16) | (b[s + 1] << 8) | b[s + 2], 0x9e3779b1) >>> (32-H3_BITS)) & H3_MASK;'],
 ['let i = (hi * 31 + lo) & H4_MASK;','let i = (Math.imul((hi << 16) | lo, 0x9e3779b1) >>> (32-H4_BITS)) & H4_MASK;']
];
fs.writeFileSync('bench/x154/receipts/speed-patch.json',JSON.stringify(replacements,null,2));
for(const entry of ['speed','bpe-gate','frontier'])for(const arm of ['A','B'])await build({entryPoints:[`bench/x154/${entry}.ts`],bundle:true,platform:'node',format:'esm',outfile:`bench/x154/${entry}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'rank-hash',setup(b){b.onLoad({filter:/[\\/]bpe-fast\.ts$/},args=>{let s=fs.readFileSync(args.path,'utf8');for(const [a,c] of replacements){const expected=a.includes('hi * 31')?2:1;if(s.split(a).length!==expected+1)throw Error('patch mismatch');s=s.split(a).join(c);}return {contents:s,loader:'ts'};});}}]});
