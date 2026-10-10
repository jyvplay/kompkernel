import fs from 'node:fs';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { synPlan, renderSynWire, synizesisDecode, synContract, scanSpans, maskOf } from '../src/lib/omega/synizesis';
import { daedalusEncode } from '../src/lib/omega/daedalus';
const ENC: EncodingName = 'o200k_base'; const T=(s:string)=>countTokens(s,ENC);
for (const f of ['bench/holdout-ops/find-listing.txt','bench/holdout-ops/openstack-loghub-26.log']) {
  const t = fs.readFileSync(f,'utf8');
  const d = daedalusEncode(t, ENC, { budgetMs: 3000 });
  console.log('===', f, 'raw', T(t), 'daed msg', d.messageTokens, 'wire', T(d.wire));
  console.log('DAED wire head:', JSON.stringify(d.wire.slice(0, 320)));
  const w = d.wire;
  const spans = scanSpans(w);
  const g = new Map<string, number>();
  for (const s of spans) g.set(maskOf(s.text), (g.get(maskOf(s.text))??0)+1);
  console.log('top masks in daed wire:', [...g.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`${k}x${v}`).join('  '));
  const p = synPlan(w, ENC);
  console.log('plan:', p ? `${p.shapes.length} shapes free=${p.free} inst=${p.instances} wireTok=${T(renderSynWire(p))} (vs ${T(w)}) contract=${T(synContract(p))}` : 'null');
  if (p) console.log('  shapes:', p.shapes.map(s=>(s.sigil??'_')+s.shape).join(' | ').slice(0,300));
}
