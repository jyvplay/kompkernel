/**
 * CONTROLLED A/B — is the frontier still exactly last turn's configuration?
 *
 * The stack's searches are bounded by a WALL-CLOCK budget (budgetMs), so a lane whose
 * search does not converge within the budget can return a different (larger) wire on a
 * slower machine. That makes "the frontier is unchanged" a claim that must be tested in
 * ONE process, back to back, on the SAME input: X73 identity (`tagstackEncodeUncached`)
 * versus the X74 chain, with and without the memo.
 */
import * as fs from 'node:fs';
import { tagstackEncodeUncached, tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const out: string[] = [];
  for (let i = 0; i < 2; i++) {
    tagstackMemoClear();
    const a: any = tagstackEncodeUncached(t, 'o200k_base' as any);
    const b: any = tagstackEncode(t, 'o200k_base' as any);
    out.push(`run${i}: X73 ${a.messageTokens} X74 ${b.messageTokens} same ${a.messageTokens === b.messageTokens} exact73 ${a.decoded === t} exact74 ${b.decoded === t}`);
  }
  console.log(`${p.split('/').pop()!.padEnd(18)} ${out.join(' | ')}`);
}
