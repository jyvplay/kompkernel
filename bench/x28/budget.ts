import fs from 'node:fs';
import { metathesisEncode, metathesisDecode } from '@/lib/omega/metathesis';
import { chironDecode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const f = process.env.F!;
const t = fs.readFileSync(f, 'utf8');
const MAXE = Number(process.env.MAXE || 400000);
const RS = Number(process.env.RS || 2);
const r: any = metathesisEncode(t, enc, { maxEvals: MAXE, restarts: RS });
const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
const ok = metathesisDecode(r.wire, { stats: r.stats, order: r.order, undo }) === t;
console.log(f.split('/').pop().padEnd(30), 'maxEvals', String(MAXE).padStart(9), 'restarts', String(RS).padStart(3),
  'parentWire', String(r.parentWireTokens).padStart(5), '-> wire', String(r.wireTokens).padStart(5),
  'delta', String(r.wireTokens - r.parentWireTokens).padStart(4), 'exact', ok);
