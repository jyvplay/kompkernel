import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';
const env = { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0', OMEGA_OURA_MEMO: '0',
  OMEGA_NO_OROTHESIA: '1', OMEGA_SYNEDRIA: '1', OMEGA_SYNEDRIA_CHAIN: '1', OMEGA_ENALLAGE: '1',
  OMEGA_MEKOS: '1', OMEGA_SYNTHESIS: '1' };
Object.assign(process.env, env);
function scriptOf(cp:number){for(const s of CHIRON_SCRIPTS) if(chironInScript(s,cp)) return s; return null;}
for (const lane of (process.argv[2]||'kb-article,email-thread,llm-answer').split(',')) {
  const p = 'bench/holdout-work/'+lane+'.txt';
  const path = fs.existsSync(p) ? p : 'bench/holdout-x41/'+lane+'.txt';
  const text = fs.readFileSync(path,'utf8');
  const r = tagstackEncode(text, 'o200k_base');
  const m = r.message;
  const raw = countTokens(text,'o200k_base');
  const s = m.indexOf(CHIRON_START), q = s>=0 ? m.indexOf(CHIRON_SEP, s+1) : -1;
  let info = `raw=${raw} msg=${r.messageTokens} parent=${r.parentCodec}`;
  if (s>=0 && q>=0) {
    const tape=m.slice(s+1,q), body=m.slice(q+1);
    const sc=scriptOf(tape.codePointAt(0)!)!;
    const inS=(c:string)=>chironInScript(sc,c.codePointAt(0)!);
    const used=new Set<string>(); let i=0, nr=0;
    while(i<tape.length){const g=tape[i]; if(!inS(g)||used.has(g))break; used.add(g); nr++;
      let j=i+1; while(j<tape.length&&!(inS(tape[j])&&!used.has(tape[j]))) j++; i=j;}
    let gh=0; for(const c of body) if(used.has(c)) gh++;
    info += ` rules=${nr} tape=${countTokens(tape,'o200k_base')} body=${countTokens(body,'o200k_base')} glyphCharsInBody=${gh} bodyChars=${body.length} contract=${r.messageTokens-countTokens(m.slice(s),'o200k_base')}`;
  } else info += ' NO-FRAME';
  console.log(lane.padEnd(16), info);
  // token histogram of the top-25 most frequent tokens
  const toks = tokenStrings(m,'o200k_base');
  const h = new Map<string,number>(); for(const t of toks) h.set(t.s,(h.get(t.s)||0)+1);
  console.log('   top tokens:', [...h.entries()].sort((a,b)=>b[1]-a[1]).slice(0,22).map(([s,n])=>`${JSON.stringify(s)}x${n}`).join(' '));
}
