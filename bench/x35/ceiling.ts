import fs from 'node:fs';
import zlib from 'node:zlib';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
console.log('lane'.padEnd(26),'rawTok  gzipB  lzmaB | gzip/raw  lzma/raw | wireTok  wire/gzipBytes');
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const b=fs.readFileSync(f); const t=b.toString('utf8');
  const raw=countTokens(t,enc);
  const gz=zlib.gzipSync(b,{level:9}).length;
  let lz=NaN; try{ lz=zlib.brotliCompressSync(b,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:11}}).length; }catch(e){}
  const wire=Number(process.env['W_'+f.split('/').pop()]||0);
  console.log(f.split('/').pop()!.padEnd(26),String(raw).padStart(6),String(gz).padStart(6),String(lz).padStart(6),
    '|',(gz/b.length*100).toFixed(1).padStart(6)+'%',(lz/b.length*100).toFixed(1).padStart(7)+'%',
    '|',String(wire||'-').padStart(6),' ',wire?(wire/gz).toFixed(2):'-');
}
