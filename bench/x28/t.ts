import fs from 'node:fs';
import { syntomosEncode, syntomosDecode } from '@/lib/omega/syntomos';
import { metathesisEncode } from '@/lib/omega/metathesis';
import { chironDecode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const f = process.env.F!;
const t = fs.readFileSync(f, 'utf8');
const m: any = metathesisEncode(t, enc);
const r: any = syntomosEncode(t, enc);
const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
const ok = syntomosDecode(r.wire, { stats: r.stats, order: r.order, undo }) === t;
console.log(f.split('/').pop().padEnd(26), 'rules', String(r.rules).padStart(4), 'nested', String(r.nested).padStart(3),
  '| METATH', String(m.messageTokens).padStart(5), '-> SYNTOMOS', String(r.messageTokens).padStart(5),
  'delta', String(r.messageTokens - m.messageTokens).padStart(4), '| rung', r.rung, 'denest', r.denested, '| exact', ok);
console.log('   METATH contract:', JSON.stringify(m.contract));
console.log('   SYNTOM contract:', JSON.stringify(r.contract));
