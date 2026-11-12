import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START } from '../../src/lib/omega/chiron';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for (const p of ['bench/holdout-tbl/psql-output.txt','bench/holdout-x41/node-help.txt']) {
  const text=fs.readFileSync(p,'utf8');
  const r:any=tagstackEncode(text,enc);
  const msg:string=r.message;
  const w=msg.indexOf(CHIRON_START), tEnd=msg.indexOf('\u00b6',w);
  const contract=msg.slice(0,w), tape=msg.slice(w+1,tEnd), body=msg.slice(tEnd+1);
  console.log(`\n##### ${p}  total ${r.messageTokens}  contract ${countTokens(contract,enc)}  tape ${countTokens(tape,enc)}  body ${countTokens(body,enc)}`);
  console.log('--- CONTRACT ---'); console.log(contract);
  console.log('--- TAPE (raw) ---'); console.log(JSON.stringify(tape));
  console.log('--- BODY (first 700) ---'); console.log(JSON.stringify(body.slice(0,700)));
  // classify body tokens: pure-glyph-run vs contains ASCII
  const keys=new Set<string>(); for(const ch of tape) if(ch.codePointAt(0)!>0x370) keys.add(ch);
  const toks=(body.match(/ ?[\s\S]+?(?=[\s]|$)|[\s]/g)??[]);
  let pureGlyph=0, hasAscii=0, pgTok=0, haTok=0;
  for(const c of toks){ const n=countTokens(c,enc); const s=c.replace(/^ /,'');
    if(s.length>0 && [...s].every(ch=>keys.has(ch))){pureGlyph++;pgTok+=n;} else {hasAscii++;haTok+=n;} }
  console.log(`--- BODY TOKEN CLASSES: pure-glyph chunks ${pureGlyph} (${pgTok} tok)  mixed/ascii chunks ${hasAscii} (${haTok} tok)`);
  console.log(`--- distinct glyphs in tape: ${keys.size}`);
}
