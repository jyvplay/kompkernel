import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { symplokeEncode, symplokeDecode } from '@/lib/omega/symploke';
import { polytroposEncode, polytroposDecode } from '@/lib/omega/polytropos';
import { SymplokeParent } from '@/lib/omega/symploke';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const f = process.env.F!;
const t = fs.readFileSync(f, 'utf8');
const HUGE = Number(process.env.HUGE || 0);
const start = process.hrtime.bigint();
let r: any;
if (HUGE) {
  const cut = (x: any) => ({ wire: String(x.wire), contract: String(x.decoderPrompt).slice(String(x.wire).length + 1) });
  const parents: SymplokeParent[] = [
    { name: 'polytropos', run: (x: string) => cut(polytroposEncode(x, enc, { budgetMs: 1e9, configBudgetMs: 1e9 })), undo: (w: string) => polytroposDecode(w) },
  ];
  r = symplokeEncode(t, enc, parents);
} else {
  r = symplokeEncode(t, enc);
}
const ms = Number(process.hrtime.bigint() - start) / 1e6;
const msg = r.messageTokens;
console.log((HUGE ? 'HARDENED' : 'default ').padEnd(9), f.split('/').pop().padEnd(26),
  'msg', String(msg).padStart(5), 'wire', String(T(r.wire)).padStart(5), 'ctr', String(T(r.contract)).padStart(3),
  'ms', ms.toFixed(0).padStart(6), 'exact', symplokeDecode(r.wire, { stats: r.stats, order: r.order, undo: (w:string)=>polytroposDecode(w) }) === t);
