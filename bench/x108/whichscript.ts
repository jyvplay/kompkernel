import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { chironOpsUsed, CHIRON_START } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for (const p of ['bench/holdout-tbl/psql-output.txt','bench/holdout-x41/node-help.txt','bench/holdout-work/kb-article.txt','bench/holdout-x41/df-real.txt']) {
  const text=fs.readFileSync(p,'utf8');
  const r:any=tagstackEncode(text,enc);
  const w=(r.message as string).indexOf(CHIRON_START);
  const u:any=chironOpsUsed((r.message as string).slice(w));
  const glyphs=new Set<string>();
  for(const ch of (r.message as string).slice(w)) if(ch.codePointAt(0)!>0x370 && u.script && ch.codePointAt(0)!>=0x370) glyphs.add(ch);
  console.log(`${p.split('/').pop()!.padEnd(20)} parent ${String(r.parentCodec).padEnd(14)} script=${u.script?u.script.name:'none'} rules=${u.rules} glyphsInWire=${glyphs.size}`);
}
