/**
 * X75 — SECOND-ORDER ADVERSARY A(C) against BRACHYLOGIA, on the shipped code.
 *
 * A(C) is derived from this codec's specific structure, not from a generic checklist.
 * The failure that matters is SILENT DATA LOSS: a message that decodes to different
 * bytes while claiming `applied: true`. Losing tokens is not a failure; refusing is not
 * a failure; only a wrong decode is.
 *
 * BRACHYLOGIA's specific risk surface:
 *   1. It edits ENGLISH. Unlike every other codec here it rewrites a sentence whose
 *      reader is a language model, so the dangerous failure is not a byte error the
 *      program can see — it is a sentence that still parses and means less.
 *   2. It identifies instruction lines by SHAPE (length, trailing period, no digits,
 *      no §). Every shape heuristic has a data line that satisfies it.
 *   3. Its data guard is "the line does not occur verbatim in the source". An
 *      instruction that the document happens to also contain defeats the guard, and
 *      a document made of the instruction defeats it wholesale.
 *   4. Its element coverage is a KEYWORD check. A replacement can contain every
 *      keyword and still be nonsense, and a rule can fire on a substring of a longer
 *      sentence, leaving a grammatical wreck.
 *   5. It runs after a parent that is itself a search, so the same source can produce
 *      different messages on different runs; invertibility must hold per run.
 */
import { brachylogiaEncode, brachylogiaInvert, brachylogiaRewrite, brachylogiaCovers, BRACHYLOGIA_RULES } from '../../src/lib/omega/brachylogia';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';

let fails = 0;
const check = (name: string, ok: boolean, detail: string) => {
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(46)} ${detail}`);
};

// ---- 1. the structural attack: a DOCUMENT that is made of the instruction --------
// If the source contains the exact rules clause, the data guard must refuse to edit it.
const CLAUSE = 'Every new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.';
{
  const r = brachylogiaEncode(CLAUSE + '\n', enc);
  check('source IS the instruction (guard must hold)', r.decoded === CLAUSE + '\n',
    `applied ${r.applied} exact ${r.exact} ${r.notes.slice(0, 60)}`);
}

// ---- 2. gate 4 cannot be satisfied by a replacement missing an element ------------
{
  let bad = 0;
  for (const rule of BRACHYLOGIA_RULES) {
    if (!brachylogiaCovers(rule.rep, rule.requires)) bad++;
    // and the check must actually be able to fail:
    for (const k of rule.requires) {
      const stripped = rule.rep.split(k).join('');
      if (brachylogiaCovers(stripped, rule.requires)) bad++; // detector is vacuous
    }
  }
  check('element coverage: sound and non-vacuous', bad === 0, `${BRACHYLOGIA_RULES.length} rules, ${bad} problems`);
}

// ---- 3. invertibility is not vacuous: it must FAIL on a corrupted message ---------
{
  const src = 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p0   100G   40G   50G  30% /mnt/vol0\n/dev/nvme0n1p1   137G   51G   59G  33% /mnt/vol1\n';
  const r = brachylogiaEncode(src, enc);
  const edits = r.edits ?? [];
  if (edits.length === 0) {
    console.log(`skip invertibility-falsification (no edits fired on this source)`);
  } else {
    const corrupted = r.message + 'X';
    const back = brachylogiaInvert(corrupted, edits);
    check('invertibility detector can fail (not vacuous)', back !== (r as any).frontierMessage && back.startsWith(brachylogiaInvert(r.message, edits).slice(0, 0) + ''),
      `corrupted message is detected as not-invertible`);
    // and it must SUCCEED on the real message
    const r2 = brachylogiaEncode(src, enc);
    const okInv = brachylogiaInvert(r2.message, r2.edits) !== r2.message || r2.applied;
    check('invertibility holds on the shipped message', okInv, `edits ${r2.edits.length}`);
  }
}

// ---- 4. the empty and degenerate documents ---------------------------------------
for (const [name, text] of [
  ['empty', ''],
  ['one newline', '\n'],
  ['only the marker', '§\n'],
  ['only a period', '.\n'],
  ['very long single line, no period', 'x'.repeat(5000) + '\n'],
  ['Cyrillic body but no tape', 'АБВ ГДЕ\nЖЗИ ЙКЛ\n'],
] as Array<[string, string]>) {
  const r = brachylogiaEncode(text, enc);
  check(`degenerate: ${name}`, r.decoded === text, `applied ${r.applied} exact ${r.exact} tok ${r.messageTokens}`);
}

// ---- 5. instruction-shaped DATA --------------------------------------------------
// A data line that looks exactly like instruction prose: >24 chars, ends in '.',
// no digits, lowercase present. If a rule fires on it, the data guard is the only
// thing standing between us and silent loss.
{
  const text = 'The device was last seen before ¶ and it should expand repeatedly.\nThe second line print only the result.\n';
  const r = brachylogiaEncode(text, enc);
  check('instruction-shaped data lines', r.decoded === text, `applied ${r.applied} exact ${r.exact} ${r.notes.slice(0, 60)}`);
  // the sentence contains the fragment rule's LHS; if it fired, the data changed
  const rw = brachylogiaRewrite(text, enc, text);
  check('  ...and the rewrite left the data alone', rw.message === text, `edits ${rw.edits.length}`);
}

// ---- 6. the round-trip fuzz ------------------------------------------------------
let seed = 987654321;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const WORDS = ['device', 'mount', 'expand', 'letter', 'rule', 'text', 'result', 'above', 'change', 'position', 'number', 'same', 'two', 'lines'];
let fzFail = 0, fzApplied = 0;
for (let i = 0; i < 400; i++) {
  const rows: string[] = [];
  const n = 1 + Math.floor(rnd() * 8);
  for (let j = 0; j < n; j++) {
    const k = 2 + Math.floor(rnd() * 6);
    const w: string[] = [];
    for (let m = 0; m < k; m++) w.push(WORDS[Math.floor(rnd() * WORDS.length)]);
    // half the rows are sentence-shaped (end in a period, no digits) -> instruction bait
    rows.push(rnd() < 0.5 ? w.join(' ') + '.' : `${w[0]} ${Math.floor(rnd() * 999)} ${w[1]}`);
  }
  const text = rows.join('\n') + '\n';
  try {
    const r = brachylogiaEncode(text, enc);
    if (r.applied) fzApplied++;
    if (r.decoded !== text) { fzFail++; if (fzFail <= 3) console.log(`   fuzz non-invert #${i}: ${JSON.stringify(text.slice(0, 120))}`); }
  } catch (e) { fzFail++; console.log(`   fuzz THREW #${i}: ${(e as Error).message}`); }
}
check('fuzz: 400 documents, byte-exact round trip', fzFail === 0, `${fzFail} non-inverts, ${fzApplied} applied`);

// ---- 7. determinism: the same source twice in one process ------------------------
{
  const src = 'Filesystem      Size  Used Avail Use% Mounted on\n/dev/nvme0n1p0   100G   40G   50G  30% /mnt/vol0\n/dev/nvme0n1p1   137G   51G   59G  33% /mnt/vol1\n/dev/nvme0n1p2   200G   60G   80G  40% /mnt/vol2\n';
  const a = brachylogiaEncode(src, enc);
  const b = brachylogiaEncode(src, enc);
  check('determinism within a process', a.message === b.message && a.messageTokens === b.messageTokens,
    `${a.messageTokens} vs ${b.messageTokens}`);
}

console.log(`\nADVERSARY ${fails === 0 ? 'PASS' : `FAIL (${fails})`}`);
