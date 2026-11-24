import fs from 'node:fs';import {build} from 'esbuild';
const original=fs.readFileSync('src/lib/omega/bpe.ts','utf8');const start=original.indexOf('  const toks: number[] = new Array(cs.length);'),end=original.indexOf('  const info: TailInfo = { tot, tail, tailTok };',start);if(start<0||end<0)throw Error('anchor');
const replacement=`  let k=cs.length-1, suffixUnits=0;
  while(k>=0 && WHITESPACE_ONLY.test(cs[k]!)){suffixUnits+=cs[k]!.length;k--;}
  if(k<0)k=0;else suffixUnits+=cs[k]!.length;
  let tot=0,tailTok=0;
  const pfx=enc==='cl100k_base'?'\\u0002':'';
  for(let i=0;i<cs.length;i++){const v=chunkCountFast(cs[i]!,enc,pfx);tot+=v;if(i>=k)tailTok+=v;}
  const tail=text.slice(text.length-suffixUnits);
`;
const patched=original.slice(0,start)+replacement+original.slice(end);
for(const arm of ['A','B'])for(const [name,entry] of [['speed','bench/x164/cache-speed.ts'],['count','bench/x163/count-gate.ts'],['vector','bench/x164/speed-unit.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x175/${name}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'tail-no-token-array',setup(b){b.onLoad({filter:/[\\/]bpe\.ts$/},()=>({contents:patched,loader:'ts'}));}}]});
fs.writeFileSync('bench/x175/receipts/speed-patch.json',JSON.stringify({production:false,scope:'tokenTail only: identical chunk counts in same order; eliminate per-chunk token array and suffix concatenation',old:original.slice(start,end),replacement},null,2));
