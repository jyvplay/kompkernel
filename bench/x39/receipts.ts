import * as fs from 'node:fs';
import { apographeEncode, apographeDecode, apographeArmOf } from '@/lib/omega/apographe';
import { chironDecode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc:any='o200k_base';
const dest = process.env.RECEIPTS || 'bench/x39/receipts/x39-lanes.jsonl';
fs.writeFileSync(dest, '');
for (const p of (process.env.LANES||'').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p,'utf8');
  const name = p.split('/').pop()!;
  const t0 = Date.now();
  const r:any = apographeEncode(t, enc);
  const ms = Date.now()-t0;
  let back='', ok=false;
  try {
    back = apographeDecode(r.wire, { stats: r.stats, order: r.order,
      undo: apographeArmOf(r.wire)==='tape' ? chironDecode : (w:string)=>w } as any,
      { alphabet:r.alphabet, marker:r.marker, marker2:r.marker2, group:r.syncopeGroup, framing:r.framing } as any);
    ok = back === t;
  } catch(e:any) { back = 'THREW:'+e.message; }
  const row = { lane:name, chars:t.length, rawTokens:countTokens(t,enc),
    parentTokens:r.apographeParentTokens, apographeTokens:r.messageTokens,
    delta:r.messageTokens-r.apographeParentTokens, fired:r.apographe,
    exact:ok, modelled:r.apographeModelled, literal:r.apographeLiteral,
    header:r.apographeHeader, lifts:r.apographeLifts?.map((l:any)=>`${l.col+1}:${l.model.kind}${l.model.src!==undefined?(''+(l.model.src+1)):''}${l.model.step!==undefined?l.model.step:''}`)??[],
    clause:r.apographeClause, contractTokens:countTokens(r.contract,enc),
    tapeTokens: (()=>{const a=r.wire.indexOf('\u00b6'); const b=r.wire.indexOf('\u00b6',a+1); return a<0?0:countTokens(b<0?r.wire.slice(a):r.wire.slice(a,b),enc);})(), ms };
  fs.appendFileSync(dest, JSON.stringify(row) + '\n');
  console.log(name.padEnd(26), 'parent='+String(row.parentTokens).padStart(5),
    'apo='+String(row.apographeTokens).padStart(5), 'd='+String(row.delta).padStart(5),
    (ok?'EXACT':'***MISMATCH***'), (ms/1000).toFixed(0)+'s', row.header);
}

