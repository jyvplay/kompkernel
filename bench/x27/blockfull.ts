/**
 * X27 probe 5: is the block gain REAL end-to-end?
 *
 * chironFindBlocks reports a `gain` computed against the raw text, before the
 * phrase grammar runs and before the REP/LIST contract clauses are paid for.
 * Both of those can eat it: the phrase grammar may already be capturing part of
 * the repetition, and `xbtn: t written n times.` plus the `…a..b` clause cost
 * real tokens. So the finder's number is an upper bound, not a result.
 *
 * This probe builds the ACTUAL wire through chironEncode (which runs the block
 * pass) and counts the honest one-chat total: wire + its own generated contract.
 */
import fs from 'node:fs';
import { chironEncode, chironDecode, chironOpsUsed, chironDecoderPrompt } from '@/lib/omega/chiron';
import { symplokeEncode } from '@/lib/omega/symploke';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);

const files = (process.env.F || '').split(',').filter(Boolean);
const WU = Number(process.env.WU || 0);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const t0 = Date.now();
  const c: any = WU ? chironEncode(text, enc, { workUnits: WU }) : chironEncode(text, enc);
  const dt = Date.now() - t0;
  const wire = String(c.wire);
  const total = c.messageTokens;      // wire + this wire's own generated contract
  const ok = chironDecode(wire) === text && c.exact;
  const u = chironOpsUsed(wire);
  const s = symplokeEncode(text, enc);
  console.log(f.split('/').pop()!.padEnd(36),
    'symploke', String(s.messageTokens).padStart(5),
    '| chiron', String(total).padStart(5), '=', String(T(wire)).padStart(5), '+', String(c.contractTokens).padStart(3),
    '| delta', String(total - s.messageTokens).padStart(5),
    '| exact', String(ok).padStart(5),
    '| rep', String(u.rep).padStart(5), 'list', String(u.range || u.split).padStart(5),
    '| blocks', String(c.blocks).padStart(3), 'lists', String(c.lists).padStart(3), '|', dt + 'ms');
}
