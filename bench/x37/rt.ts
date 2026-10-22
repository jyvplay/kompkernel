import * as fs from 'node:fs';
import { anadiplosisEncode, anadiplosisRoundTrip, anadiplosisDecode } from '@/lib/omega/anadiplosis';
import { chironDecode } from '@/lib/omega/chiron';
const enc:any='o200k_base';
const LANES=process.env.LANES!.split(',').filter(Boolean);
for (const p of LANES) {
  if(!fs.existsSync(p)) { console.log('MISSING',p); continue; }
  const t = fs.readFileSync(p,'utf8');
  const r:any = anadiplosisEncode(t, enc);
  const undo = r.parent==='identity' ? (w:string)=>w : chironDecode;
  const back = anadiplosisDecode(r.wire, { stats:r.stats, order:r.order, undo } as any,
    { alphabet:r.alphabet, marker:r.marker, marker2:r.marker2, group:r.syncopeGroup, framing:r.framing } as any);
  console.log(p.split('/').pop()!.padEnd(26),'fire='+(r.anadiplosis?'Y':'n'),
    'frm='+JSON.stringify((r.framing||[]).join('')),'spans='+String(r.anadiplosisSpans).padStart(4),
    'chars='+String(r.anadiplosisChars).padStart(6),
    'tok='+String(r.messageTokens).padStart(5),
    (back===t?'EXACT':'***MISMATCH***'), 'rt='+anadiplosisRoundTrip(t,enc));
}
