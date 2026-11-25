import fs from 'node:fs';import {build} from 'esbuild';
const original=fs.readFileSync('src/lib/omega/bpe-fast.ts','utf8');const begin=original.indexOf('  // one anchored exec answers'),end=original.indexOf('\n}\n',begin);if(begin<0||end<0)throw Error('fast anchor');
const replacement=`  let covered = 0, n = 0;
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index !== covered || m[0].length === 0) return null;
    covered += m[0].length;
    n += fastChunkCount(m[0]);
  }
  return covered === text.length ? n : null;`;
const slow=fs.readFileSync('src/lib/omega/bpe.ts','utf8'),anchor=`function countLongRaw(text: string, enc: EncodingName, sink: MarkSink | null): number | null {\n  const re = PRETOK[enc];`;
const stream=`function countLongRaw(text: string, enc: EncodingName, sink: MarkSink | null): number | null {
  const re = PRETOK[enc];
  if (sink === null) {
    re.lastIndex = 0;
    let covered = 0, total = 0;
    const pfx = enc === 'cl100k_base' ? '\\u0002' : '';
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index !== covered || m[0].length === 0) { chunkFallbacks++; return null; }
      covered += m[0].length;
      total += chunkCountFast(m[0], enc, pfx);
    }
    if (covered !== text.length) { chunkFallbacks++; return null; }
    return total;
  }`;
if(slow.split(anchor).length!==2)throw Error('long anchor');
for(const arm of ['A','B'])for(const [name,entry] of [['speed','bench/x164/cache-speed.ts'],['count','bench/x163/count-gate.ts'],['vector','bench/x164/speed-unit.ts'],['merge','bench/x182/merge-attack.ts'],['stream','bench/x184/stream-attack.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x184/${name}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'stream-count',setup(b){b.onLoad({filter:/[\\/]bpe-fast\.ts$/},()=>({contents:original.slice(0,begin)+replacement+original.slice(end),loader:'ts'}));b.onLoad({filter:/[\\/]bpe\.ts$/},()=>({contents:slow.replace(anchor,stream),loader:'ts'}));}}]});
fs.writeFileSync('bench/x184/receipts/speed-patch.json',JSON.stringify({production:false,fast:{old:original.slice(begin,end),replacement},long:{old:anchor,replacement:stream},scope:'Streaming regex scan with contiguous-coverage checks; no candidate removal. Keep tracked-tail path unchanged.'},null,2));
