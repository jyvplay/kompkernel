import * as fs from 'node:fs';
import { apographeEncode, apographeDecode, apographeArmOf } from '@/lib/omega/apographe';
import { chironDecode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc:any='o200k_base';
const BASE: Record<string,number> = {
 'aapl-2014.csv':1450,'vix-daily-1990.csv':579,'openstack-loghub-26.log':898,'find-listing.txt':1279,
 'git-numstat.txt':1992,'ls-full-iso.txt':367,'npm-ls.txt':901,'dump.sql':608,'kb-article.txt':622,
 'readme.txt':646,'page.html':547,'chart.svg':417,'bibliography.txt':671,'email-thread.txt':488,
 'meeting-transcript.txt':385,'component.jsx':264,'pom.xml':242,
 'psql-output.txt':null,'kubectl-get-pods.txt':null,'df-h.txt':null,'package-lock-head.json':null,
 'markdown-table.md':null,'llm-answer.md':null,'unified-diff.patch':null,'paper.tex':null,
};
for (const p of (process.env.LANES||'').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p,'utf8');
  const name = p.split('/').pop()!;
  const t0 = Date.now();
  const r:any = apographeEncode(t, enc);
  const ms = Date.now()-t0;
  let back='';
  try {
    back = apographeDecode(r.wire, { stats: r.stats, order: r.order,
      undo: apographeArmOf(r.wire)==='tape' ? chironDecode : (w:string)=>w } as any,
      { alphabet:r.alphabet, marker:r.marker, marker2:r.marker2, group:r.syncopeGroup, framing:r.framing } as any);
  } catch(e:any) { back = 'THREW:'+e.message; }
  const base = BASE[name];
  console.log(name.padEnd(26),
    'apo='+(r.apographe?'Y':'n'),
    'M='+String(r.messageTokens).padStart(5),
    base!==null? ('prev='+String(base).padStart(5)+' d='+String(r.messageTokens-base).padStart(5)) : 'prev=    -     -',
    (back===t?'EXACT':'***MISMATCH***'),
    'rows='+r.apographeModelled+'/'+(r.apographeModelled+r.apographeLiteral),
    (ms/1000).toFixed(0)+'s',
    r.apographe? ('hdr='+r.apographeHeader) : '');
}
