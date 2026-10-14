// Z44 session prize probe: cross-message redundancy measured with the repo's own CTXCOPY.
import { buildSessions } from './sessions';
import { ctxEncode, ctxDecode } from '@/lib/omega/ctxcopy';
import { countTokens } from '@/lib/omega/bpe';

for (const s of buildSessions()) {
  console.log(`\n== ${s.name}  messages=${s.messages.length}`);
  console.log(`   how: ${s.how}`);
  let rawTot = 0, ctxTot = 0, ok = 0, refused = 0;
  for (let k = 0; k < s.messages.length; k++) {
    const T = s.messages[k];
    const raw = countTokens(T, 'o200k_base');
    rawTot += raw;
    if (k === 0) { ctxTot += raw; console.log(`   m${k} raw=${raw} (first: no earlier context)`); continue; }
    const C = s.messages.slice(0, k).join('\n');
    let r;
    try { r = ctxEncode(T, C, {}); } catch { r = null; }
    if (!r) { ctxTot += raw; refused++; console.log(`   m${k} raw=${raw} CTX REFUSED (forbidden char in T or C)`); continue; }
    const dec = ctxDecode(r.wire, C);
    const exact = dec === T;
    const w = countTokens(r.wire, 'o200k_base');
    ctxTot += w; if (exact) ok++;
    console.log(`   m${k} raw=${raw} ctxWire=${w} (${(100 * (1 - w / raw)).toFixed(1)}%) copies=${r.copies} copiedChars=${r.copiedChars} exact=${exact}`);
  }
  console.log(`   TOTAL raw=${rawTot} ctx=${ctxTot} saving=${(100 * (1 - ctxTot / rawTot)).toFixed(1)}% exact=${ok}/${s.messages.length - 1} refused=${refused}`);
}
