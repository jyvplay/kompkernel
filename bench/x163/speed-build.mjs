import fs from 'node:fs';import {build} from 'esbuild';
const before=fs.readFileSync('src/lib/omega/bpe.ts','utf8');const start=before.indexOf('function countLongRaw('),end=before.indexOf('\nexport function countTokensExact',start);if(start<0||end<0)throw Error('anchor');
const replacement=`function countLongRaw(text: string, enc: EncodingName, sink: MarkSink | null): number | null {
  const re = PRETOK[enc]; re.lastIndex = 0;
  const wsCp = sink !== null ? wsTable() : null;
  const pfx = enc === 'cl100k_base' ? '\\u0002' : '';
  let n = 0, pos = 0, tailStart = 0, tailTokens = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const c = m[0];
    if (!c.length || m.index !== pos) { chunkFallbacks++; return null; }
    const v = chunkCountFast(c, enc, pfx); n += v;
    if (sink !== null) {
      const ws = wsCp![c.charCodeAt(0)] === 1 && wsCp![c.charCodeAt(c.length-1)] === 1 && WHITESPACE_ONLY.test(c);
      if (!ws) { tailStart = pos; tailTokens = v; } else tailTokens += v;
      pos += c.length;
      if (pos >= sink.next) {
        if (pos-tailStart <= 64) sink.out.push({pos,total:n,tail:text.slice(tailStart,pos),tailTok:tailTokens});
        sink.next = pos + sink.stride;
      }
    } else pos += c.length;
  }
  if (pos !== text.length) { chunkFallbacks++; return null; }
  return n;
}
`;
for(const entry of ['speed','count-gate'])for(const arm of 'AB')await build({entryPoints:[entry==='speed'?'bench/x155/speed.ts':'bench/x163/count-gate.ts'],bundle:true,platform:'node',format:'esm',outfile:`bench/x163/${entry}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'stream-chunks',setup(b){b.onLoad({filter:/[\\/]bpe\.ts$/},()=>({contents:before.slice(0,start)+replacement+before.slice(end),loader:'ts'}));}}]});
fs.writeFileSync('bench/x163/receipts/speed-patch.json',JSON.stringify({production:false,original:before.slice(start,end),replacement},null,2));
