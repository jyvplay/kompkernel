// Separator elision + clause, measured over an AKOLOUTHIA-2 wire instead of a
// LAKONIKOS wire.  Tests whether the clause layer is orthogonal to the grammar layer.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { stigmeElide, stigmeRestore, STIGME_DATE_CLAUSE } from '@/lib/omega/stigme';
import { akolouthia2Encode, akolouthia2Decode, AKOLOUTHIA2_CONTRACT } from '@/lib/omega/akolouthia2';

const enc = 'o200k_base' as const;
const lines = fs.readFileSync('bench/x19/receipts/stigme-lanes.jsonl', 'utf8').trim().split('\n');
const out = fs.createWriteStream('bench/x19/receipts/stigme-ako.jsonl', { flags: 'a' });

for (const f of process.argv.slice(2)) {
  try {
    const text = fs.readFileSync(f, 'utf8');
    const t0 = Date.now();
    const base = akolouthia2Encode(text, enc);
    let M = base.messageTokens, arm = 'identity', clauseTok = 0, dates = 0, exact = base.exact;
    const el = stigmeElide(text, {});
    if (el) {
      const sub = akolouthia2Encode(el.out, enc);
      const prompt = AKOLOUTHIA2_CONTRACT + '\n' + STIGME_DATE_CLAUSE + '\n' + (sub.daedalus?.decoderPrompt ?? '');
      const cand = countTokens(prompt, enc);
      if (cand < base.messageTokens) {
        const wire = sub.arm === 'progression' ? sub.wire : sub.daedalus.wire;
        const back = stigmeRestore(akolouthia2Decode(wire, sub.arm), el.sep, false);
        if (back === text) { M = cand; arm = 'elided'; clauseTok = countTokens(STIGME_DATE_CLAUSE, enc); dates = el.dates; exact = true; }
      }
    }
    out.write(JSON.stringify({ file: f.split('/').pop(), rawTok: base.inTokens, ident: base.messageTokens, M, arm, clauseTok, dates, exact, ms: Date.now() - t0 }) + '\n');
    console.log(`${f.split('/').pop()}: ${base.messageTokens} -> ${M} (${arm})`);
  } catch (e) {
    out.write(JSON.stringify({ file: f.split('/').pop(), error: String(e) }) + '\n');
    console.log(`${f.split('/').pop()}: ERROR ${e}`);
  }
}
out.end();
