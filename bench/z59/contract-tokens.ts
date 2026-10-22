// X14: token cost of candidate HEMERA contract sentences (o200k). Exact tokenizer count.
import { countTokens } from '@/lib/omega/bpe';
const cands: Record<string, string> = {
  daysOnly: '※dN = the previous date plus N days (N may be negative); write dates as YYYY-MM-DD.',
  msOnly_HORA: '※N = previous timestamp + N ms (N may be negative; same date; keep 3 ms digits).',
  bothLong: '※dN = the previous date plus N days (N may be negative); write dates as YYYY-MM-DD. ※N = previous timestamp + N ms (N may be negative; same date; keep 3 ms digits).',
  bothShortA: '※dN = previous date + N days; ※N = previous timestamp + N ms (same date, 3 ms digits). N may be negative.',
  bothShortB: '※dN = previous date + N days. ※N = previous timestamp + N ms (same date). N may be negative.',
  bothFinal: '※dN = previous date + N days (YYYY-MM-DD). ※N = previous timestamp + N ms (same date; 3 ms digits). N may be negative.',
  bothShortC: '※dN = prev date+N days; ※N = prev time+N ms (same date). N may be negative.',
};
for (const [k, v] of Object.entries(cands)) console.log(JSON.stringify({ k, tokens: countTokens(v, 'o200k_base'), chars: v.length }));
