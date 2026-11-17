/** End-to-end: encode -> decode through the stack's own decoder -> compare to source. */
import * as fs from 'node:fs';
import { tagstackEncode, tagstackDecode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0';
process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
for(const p of (process.env.LANES??'').split(',').filter(Boolean)){
  const text=fs.readFileSync(p,'utf8');
  const a:any=tagstackEncode(text,'o200k_base' as any);
  let out=''; try{ out=tagstackDecode(a.message,'o200k_base' as any); }catch(e:any){ out='<throw '+e.message+'>'; }
  console.log(`${p.split('/').pop()!.padEnd(20)} A=${String(a.messageTokens).padStart(6)} decode==source? ${out===text}  (len ${out.length} vs ${text.length})`);
}
