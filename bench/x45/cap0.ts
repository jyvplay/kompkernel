/** X45 screen 5 — is there anything below inCap=1? */
import { readFileSync } from 'node:fs';
import { chunkCacheStats, chunkCacheClear, countTokens, type EncodingName } from '@/lib/omega/bpe';
import { analepsisEncode, analepsisDecode } from '@/lib/omega/analepsis';
import { chironDecode } from '@/lib/omega/chiron';
const enc = 'o200k_base' as EncodingName;
const calls = () => { const s = chunkCacheStats(); return s.shortHits+s.shortMisses+s.longHits+s.longMisses; };
for (const p of (process.env.LANES||'').split(',').map(s=>s.trim()).filter(Boolean)) {
  const t = readFileSync(p,'utf8');
  console.log(`\n=== ${p.split('/').pop()} (${t.length} ch, ${countTokens(t,enc)} raw)`);
  for (const [nm,cfg] of [['inCap=1 (ref)',{inCap:1,inGate:1}],['inCap=0',{inCap:0,inGate:1}],['inCap=0,gate=0',{inCap:0,inGate:0}]] as Array<[string,any]>) {
    chunkCacheClear(); const b=calls(); const t0=Date.now();
    let r:any; try { r = analepsisEncode(t,enc,cfg); } catch(e:any){ console.log(`  ${nm} THREW ${String(e).slice(0,50)}`); continue; }
    const ms=Date.now()-t0, n=calls()-b;
    let rt='?'; try { rt = analepsisDecode(r.wire,{stats:r.stats,order:r.order,undo:r.parent==='identity'?(w:string)=>w:chironDecode} as any,{alphabet:r.alphabet,marker:r.marker,marker2:r.marker2,group:r.syncopeGroup,framing:r.framing,ouraShape:r.ouraShape,ouraMode:r.ouraMode,ouraSentinel:r.ouraSentinel,antistrophePair:r.antistrophePair,peritropePairs:r.peritropePairs,systoleTemplates:r.systoleTemplates,apocopeTemplates:r.apocopeTemplates} as any)===t?'OK':'FAIL'; } catch { rt='THREW'; }
    console.log(`  ${nm.padEnd(14)} msg=${String(r.messageTokens).padStart(5)}  ${String(ms).padStart(7)}ms  ${(n/1e6).toFixed(2)}M calls  rt=${rt}`);
  }
}
