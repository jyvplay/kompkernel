/**
 * X44 screen 6 — HOW MUCH REPEAT MASS SURVIVES IN THE BODY, ON THE LANES WHERE
 * REPETITION IS DENSEST?
 *
 * screen 5 answered two questions on prose. Greedy single-rule pruning gained
 * exactly ZERO on all four lanes, so CHIRON's rule set is already optimal under
 * removal and the "22 of 31 rules have negative marginal value" reading was an
 * artifact of pricing phrases in isolation. But the same screen found repeated
 * multi-token phrases still sitting in the body: "administrator" four times and
 * " Northgate Vault" twice in kb-article, " remittance " three times and
 * " Q3 reconciliation" twice in email-thread.
 *
 * On prose that residual is worth roughly 5-15 tokens, which is not enough. The
 * open question is whether it is bigger on the OPS lanes, where paths, filenames
 * and column headers repeat far more heavily and where compression is weakest:
 * git-numstat sits at 2.4x and find-listing at 3.3x against vix at 6.2x.
 *
 * The scan is deliberately de-duplicated: overlapping windows into one repeated
 * phrase are collapsed to the maximal one, so the reported mass is not inflated
 * by counting "administ", "dministr", "ministra" and "inistrat" as four finds.
 */
import { readFileSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { krisisEncode } from '@/lib/omega/krisis';

const enc = 'o200k_base' as EncodingName;

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const src = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const r: any = krisisEncode(src, enc);
  const wire: string = r.wire;
  const i = wire.indexOf('§');
  const frame = wire.slice(i);
  const sepIdx = frame.indexOf('¶');
  const body = sepIdx >= 0 ? frame.slice(sepIdx + 1) : frame;
  const tape = sepIdx >= 0 ? frame.slice(1, sepIdx) : '';

  console.log(`\n=== ${nm}   src ${src.length}ch/${countTokens(src, enc)}tok   message ${r.messageTokens}`);
  console.log(`    tape ${tape.length}ch/${countTokens(tape, enc)}tok   body ${body.length}ch/${countTokens(body, enc)}tok`);

  // find maximal repeated substrings by scanning candidate lengths downward and
  // suppressing any hit contained in an already-accepted longer one
  const accepted: Array<{ s: string; n: number; tok: number }> = [];
  for (let L = 40; L >= 8; L -= 2) {
    const seen = new Map<string, number>();
    for (let k = 0; k + L <= body.length; k++) {
      const s = body.slice(k, k + L);
      seen.set(s, (seen.get(s) ?? 0) + 1);
    }
    for (const [s, n] of seen) {
      if (n < 2) continue;
      if (accepted.some((a) => a.s.includes(s))) continue;
      accepted.push({ s, n, tok: countTokens(s, enc) });
    }
  }
  accepted.sort((a, b) => (b.n - 1) * (b.tok - 1) - (a.n - 1) * (a.tok - 1));

  let mass = 0;
  for (const a of accepted) mass += (a.n - 1) * (a.tok - 1) - 2;   // minus definition cost
  const positive = accepted.filter((a) => (a.n - 1) * (a.tok - 1) - 2 > 0);
  console.log(`    maximal repeated phrases (L>=8): ${accepted.length} found, ${positive.length} net-positive after a 2-token definition`);
  console.log(`    NET token mass available to an augmentation pass: ${mass}`);
  for (const a of positive.slice(0, 12)) {
    console.log(`      ${String(a.n).padStart(3)}x  ${String(a.tok).padStart(3)} tok  net ${String((a.n - 1) * (a.tok - 1) - 2).padStart(4)}  ${JSON.stringify(a.s.slice(0, 44))}`);
  }
}
