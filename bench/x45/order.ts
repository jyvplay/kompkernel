/**
 * X45 screen 6 — DOES `order` PREDICT WHETHER THE CAP MATTERS?
 *
 * screen 5 found the counterexample that kills a static cap: dump.sql regresses
 * 60 tokens (608 -> 668) at inCap=1 while chart.svg, page.html, ls-full-iso,
 * component.jsx, kb-article and pom.xml are all unchanged. So the cap is dead
 * weight on six lanes and worth 60 tokens on one, and shipping a static cap of 1
 * would be a regression, not an improvement.
 *
 * SymplokeResult exposes `order: 'out' | 'in'`, which says which of SYMPLOKE's two
 * search orders actually produced the wire. If the cheap cap-1 run reports 'out',
 * the 'in' shape trials never won, so truncating them cannot have cost anything --
 * that is a proof, not a heuristic. If it reports 'in', the trials did win and a
 * cap of 1 may have cut a search short. This measures whether that signal
 * separates dump.sql from the six lanes where the cap is free.
 */
import { readFileSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { metronEncode } from '@/lib/omega/metron';
const enc = 'o200k_base' as EncodingName;
const KNOWN: Record<string,string> = {
  'dump.sql':'REGRESSES 60 (608->668)','page.html':'unchanged 547','chart.svg':'unchanged 417',
  'ls-full-iso.txt':'unchanged 364','component.jsx':'unchanged 264','kb-article.txt':'unchanged 622',
  'pom.xml':'unchanged 242','prose-01.txt':'unchanged 736','readme.txt':'?','bibliography.txt':'?',
  'email-thread.txt':'?','meeting-transcript.txt':'?',
};
for (const p of (process.env.LANES||'').split(',').map(s=>s.trim()).filter(Boolean)) {
  const t = readFileSync(p,'utf8'); const nm = p.split('/').pop()!;
  const t0=Date.now();
  let r:any; try { r = metronEncode(t,enc,{inCap:1,inGate:1}); } catch(e:any){ console.log(`${nm} THREW ${String(e).slice(0,50)}`); continue; }
  const ms=Date.now()-t0;
  console.log(`${nm.padEnd(24)} order=${String(r.order).padEnd(4)} parent=${String(r.parent).padEnd(12)} msg=${String(r.messageTokens).padStart(5)}  ${String(ms).padStart(7)}ms  cap1-effect: ${KNOWN[nm]??'?'}`);
}
