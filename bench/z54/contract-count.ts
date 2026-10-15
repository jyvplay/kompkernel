// z54: exact o200k cost of the one-chat message (wire + contract) for candidate contract wordings.
// The wire is DAEDALUS's own (unchanged); only the English contract sentence varies. Analysis + measurement.
import fs from 'node:fs';
import { daedalusEncode, daedalusDecoderPrompt } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const V: Record<string, string> = {
  V0: 'Every new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.',
  V1: 'Every new Cyrillic letter before ¶ starts a rule that runs to the next new letter or to ¶. In the text after ¶, expand every rule and print only the result.',
  V2: 'Each new Cyrillic letter before ¶ starts a rule running to the next new letter or ¶. Expand the rules after ¶ and print only the result.',
  V3: 'Cyrillic letters before ¶ start rules that run to the next new letter or ¶. Expand them after ¶ and print only the result.',
  V4: 'Before ¶: each new Cyrillic letter starts a rule until the next new letter or ¶. After ¶: expand the rules and print only the result.',
  V5: 'New Cyrillic letters before ¶ start rules, each running to the next new letter or ¶. Print the text after ¶ with every rule expanded, nothing else.',
  V6: 'Each new Cyrillic letter before ¶ starts a rule up to the next new letter or ¶. Print the text after ¶ with rules expanded.',
  V7: 'Cyrillic letters before ¶ are rules, each running to the next new letter or ¶. Output the text after ¶ with them expanded.',
  V8: 'Expand the Cyrillic rules before ¶ in the text after ¶.',
  V9: 'Each new Cyrillic letter before ¶ starts a rule up to the next new letter or ¶; expand all rules after ¶ and print only that.',
};
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const r: any = daedalusEncode(text, enc);
  const body = r.wire;
  const row: any = { lane: f.split('/').pop(), raw: r.inTokens, frontierM: r.messageTokens, wire: r.outTokens, arm: r.winningArm };
  for (const k of Object.keys(V)) row[k] = countTokens(body + '\n' + V[k], enc);
  row.contractV0check = countTokens(body + '\n' + V.V0, enc) === r.messageTokens;
  console.log(JSON.stringify(row));
}
