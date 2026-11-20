/** Three independent mechanism controls; not claimed repository-new codecs. */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {brotliCompressSync,brotliDecompressSync} from 'node:zlib';
import {countTokens} from '../../src/lib/omega/bpe';
const ct=(s:string)=>countTokens(s,'o200k_base');
for(const a of fs.readFileSync('bench/x144/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l))){
 const text=fs.readFileSync(a.path,'utf8'),bytes=Buffer.from(text);
 const packed=brotliCompressSync(bytes),wire='Decode base64, decompress Brotli, output UTF-8 exactly:\n'+packed.toString('base64');
 assert.ok(brotliDecompressSync(Buffer.from(wire.split('\n')[1],'base64')).equals(bytes));
 // Same-message backward references, using Unicode code-point indices.
 const chars=[...text],positions=new Map<string,number[]>(),parts:(string|[number,number])[]=[];let literal='',i=0,copies=0;
 const put=(j:number)=>{const k=chars.slice(j,j+12).join('');const ps=positions.get(k)??[];ps.push(j);positions.set(k,ps);};
 while(i<chars.length){let best=0,start=-1;
  for(const j of (positions.get(chars.slice(i,i+12).join(''))??[]).slice(-64)){
   let n=0;while(j+n<i&&i+n<chars.length&&chars[j+n]===chars[i+n])n++;
   if(n>best){best=n;start=j;}
  }
  if(best>=24){if(literal){parts.push(literal);literal='';}parts.push([start,best]);copies++;for(let j=i;j<i+best;j++)put(j);i+=best;}
  else{literal+=chars[i];put(i++);}
 }
 if(literal)parts.push(literal);
 const message='Concatenate JSON parts: strings are literal; [start,length] copies already produced Unicode characters, zero-based. Print only.\n'+JSON.stringify(parts);
 const out:string[]=[];
 for(const part of JSON.parse(message.slice(message.indexOf('\n')+1))){if(typeof part==='string')out.push(...part);else {assert.ok(part[0]>=0&&part[0]+part[1]<=out.length);out.push(...out.slice(part[0],part[0]+part[1]));}}
 assert.equal(out.join(''),text);
 console.log(JSON.stringify({path:a.path,A:a.tokens,brotliTokens:ct(wire),brotliBytes:packed.length,copyTokens:ct(message),copies,byteExact:true,nativeVerified:false}));
}
// Semantic normalization is not an exact residual-free codec.
const normalize=(s:string)=>s.replace(/\s+/g,' ').trim().toLowerCase();
assert.equal(normalize('Policy A.\n'),normalize('policy  A.'));
fs.writeFileSync('bench/x146/receipts/semantic-collision.json',JSON.stringify({x:'Policy A.\n',y:'policy  A.',sameWire:normalize('Policy A.\n'),injective:false}));
