/**
 * X124 — end-to-end price of ΠΡΌΚΕΝΟ with the gate the module ships: one
 * frontier call on the rewritten text, complete-message comparison against the
 * incumbent, byte-exact undo. Two plans are priced per lane — all elidable
 * junctions, and only the ones whose neighbourhood the grammar cannot reuse
 * (`uniqueOnly`) — because the raw count and the shipped count disagree by an
 * order of magnitude on repetitive tables.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { prokenoEncode, prokenoPlan, prokenoTransform, prokenoUndo, prokenoContract } from '../../src/lib/omega/prokeno';

const enc = 'o200k_base' as const;
const all = fs.readFileSync('bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const ORDER = process.env.LANES ? process.env.LANES.split(',') : null;
const lanes = ORDER
  ? ORDER.flatMap((n) => all.filter((p) => p.split('/').pop()!.replace(/\.(txt|md|csv|tsv|patch)$/, '').startsWith(n)))
  : all;
let sumBase = 0, sumBest = 0;
for (const p of lanes) {
  const name = p.split('/').pop()!.replace(/\.(txt|md|csv|tsv|patch)$/, '');
  const src = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const base = tagstackFrontier(src, enc);
  const baseMs = Date.now() - t0;
  const r = prokenoEncode(src, enc, base.messageTokens);          // uniqueOnly
  // variant: every elidable junction, not only the unique-context ones
  let alt = '', altTok = base.messageTokens;
  const plan2 = prokenoPlan(src, enc, { uniqueOnly: false });
  if (plan2) {
    const set2 = new Set(plan2.classes);
    if (prokenoUndo(plan2.text, set2, plan2.mark) === src) {
      const inner = tagstackFrontier(plan2.text, enc);
      if (inner.decoded === plan2.text && prokenoUndo(inner.decoded, set2, plan2.mark) === src) {
        const msg = prokenoContract(plan2.classes, plan2.mark) + '\n' + inner.message;
        altTok = countTokens(msg, enc);
        alt = `all-sites ${altTok} (${altTok - base.messageTokens >= 0 ? '+' : ''}${altTok - base.messageTokens}) elided ${plan2.elided} marked ${plan2.marked}`;
      } else alt = 'all-sites INEXACT';
    } else alt = 'all-sites G3 fail';
  } else alt = 'all-sites no plan';
  const best = Math.min(r.applied ? r.messageTokens : base.messageTokens, altTok);
  sumBase += base.messageTokens; sumBest += best;
  console.log(`${name.padEnd(22)} base ${String(base.messageTokens).padStart(5)}  unique ${String(r.applied ? r.messageTokens : base.messageTokens).padStart(5)} (${r.applied ? (r.messageTokens - base.messageTokens >= 0 ? '+' : '') + String(r.messageTokens - base.messageTokens) : 'refused'})  ${alt}  exact ${r.exact && base.decoded === src}  ${baseMs}ms  ${r.applied ? r.notes.slice(0, 100) : r.notes.slice(0, 70)}`);
}
console.log(`TOTAL base ${sumBase} best ${sumBest} delta ${sumBest - sumBase}`);
