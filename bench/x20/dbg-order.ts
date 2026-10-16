/** X20: is typosEncode order-dependent across calls in one process? */
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { typosEncode, typosPlans } from '@/lib/omega/typos';
const enc = 'o200k_base' as const;
const L = 'bench/z11/fresh/ops-git-log-stat.txt';
const t = fs.readFileSync(L, 'utf8');
const probe = (tag: string) => {
  const r = typosEncode(t, enc);
  console.log(JSON.stringify({ tag, M: r.messageTokens[enc], rule: r.rule, shapes: r.shapes,
    occ: r.occurrences, ct: r.contractTokens, base: r.baseTokens[enc],
    plans: typosPlans(t, { enc }).map(p => `${p.mode}:${p.est}`) }));
};
probe('alone');
for (const f of ['bench/holdout-tbl/psql-output.txt', 'bench/holdout-tab/aapl-2014.csv']) {
  typosEncode(fs.readFileSync(f, 'utf8'), enc);
  probe('after ' + f.split('/').pop());
}
