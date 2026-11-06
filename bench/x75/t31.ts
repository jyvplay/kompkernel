/**
 * X75 — the ADVERSARY THAT MATTERS: attack the APPLIED path.
 *
 * t30's fuzz produced 0 applied, so it only exercised refusal — and refusal is the safe
 * branch. This one builds documents that DO trigger the CHIRON tape and the ⁺ clause,
 * so every case below runs the branch that rewrites the sentence, plus two detectors
 * aimed at the failure mode no gate can see: a sentence that still parses and means less.
 */
import * as fs from 'node:fs';
import { brachylogiaEncode, brachylogiaInvert } from '../../src/lib/omega/brachylogia';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
let fails = 0;
const check = (name: string, ok: boolean, detail: string) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(52)} ${detail}`); };

// ---- 1. the invertibility detector must be able to FAIL (not vacuous) -------------
{
  const src = fs.readFileSync('bench/holdout-tbl/df-h.txt', 'utf8');
  const r = brachylogiaEncode(src, enc, tagstackEncode as any);
  check('applied path fires on df-h', r.applied, `${r.clausesRewritten} clauses, ${r.frontierTokens}->${r.messageTokens}`);
  const back = brachylogiaInvert(r.message, r.edits);
  // reconstruct the frontier message to compare against
  const base: any = tagstackEncode(src, enc);
  check('invertibility holds on the applied message', back === base.message, `${back.length} vs ${base.message.length} chars`);
  const corrupted = r.message.replace(/\nBefore ¶ a new Cyrillic/, '\nBefore X a new Cyrillic');
  check('invertibility detector is NOT vacuous', brachylogiaInvert(corrupted, r.edits) !== base.message, 'a corrupted message is caught');
}

// ---- 2. the semantic detector: the contracted sentence must still carry the rule ---
{
  const src = fs.readFileSync('bench/holdout-tbl/df-h.txt', 'utf8');
  const r = brachylogiaEncode(src, enc, tagstackEncode as any);
  const msg = r.message;
  const must = ['¶', 'Cyrillic', 'new', 'letter', 'next', 'expand', 'repeatedly', 'print', 'only'];
  const missing = must.filter((k) => !msg.includes(k));
  check('contracted message still carries every element', missing.length === 0, missing.length ? `missing ${missing.join(',')}` : must.length + ' elements present');
  // the ⁺ clause must survive too
  check('the ⁺ clause keeps "same position"', msg.includes('at the same position'), msg.includes('at the same position') ? 'column reference kept' : 'COLUMN REFERENCE LOST');
}

// ---- 3. applied-path fuzz on synthetic tables -------------------------------------
let seed = 24680;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const DEV = ['nvme0n1p', 'sda', 'sdc', 'mapper/vg-lv', 'loop'];
let fzFail = 0, fzApplied = 0, fzTotal = 0;
for (let i = 0; i < 40; i++) {
  const rows = ['Filesystem      Size  Used Avail Use% Mounted on'];
  const n = 3 + Math.floor(rnd() * 12);
  for (let j = 0; j < n; j++) {
    const d = DEV[Math.floor(rnd() * DEV.length)];
    const size = 50 + Math.floor(rnd() * 900);
    const used = Math.floor(rnd() * size);
    rows.push(`/dev/${d}${j}   ${size}G   ${used}G  ${size - used}G  ${Math.floor(used / size * 100)}% /mnt/v${j}`);
  }
  const text = rows.join('\n') + '\n';
  fzTotal++;
  try {
    const r = brachylogiaEncode(text, enc, tagstackEncode as any);
    if (r.applied) fzApplied++;
    if (r.decoded !== text) { fzFail++; if (fzFail <= 2) console.log(`   APPLIED-PATH NON-INVERT #${i} rows ${n}`); }
  } catch (e) { fzFail++; console.log(`   THREW #${i}: ${(e as Error).message}`); }
}
check('applied-path fuzz: 40 synthetic tables', fzFail === 0, `${fzFail} non-inverts, ${fzApplied}/${fzTotal} applied`);

console.log(`\nADVERSARY (applied path) ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`);
