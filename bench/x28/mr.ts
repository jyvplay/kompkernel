import fs from 'node:fs';
import { metathesisEncode, metathesisDecode } from '@/lib/omega/metathesis';
import { chironDecode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const f = process.env.F!;
const t = fs.readFileSync(f, 'utf8');
const r: any = metathesisEncode(t, enc);
const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
console.log('maxRules=' + (process.env.OMEGA_MAXRULES || '220'), f.split('/').pop().padEnd(26),
  'rules', String(r.rules).padStart(4), 'msg', String(r.messageTokens).padStart(5),
  'exact', metathesisDecode(r.wire, { stats: r.stats, order: r.order, undo }) === t);
