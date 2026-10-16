// X13: token cost of candidate HORA contract sentences (o200k). Exact tokenizer count.
import { countTokens } from '@/lib/omega/bpe';
const cands = {
  current: 'Timestamps: "§N" stands for the previous timestamp in this text plus N milliseconds (N may be negative); same date, format YYYY-MM-DD HH:MM:SS.mmm with 3 millisecond digits. Copy everything else exactly.',
  short: '§N = previous timestamp + N ms (N may be negative; same date; keep 3 ms digits).',
  shorter: '§N = previous timestamp + N ms, same date, 3 ms digits.',
};
for (const [k, v] of Object.entries(cands)) console.log(JSON.stringify({ k, tokens: countTokens(v, 'o200k_base') }));
