import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
const enc = 'o200k_base';
// GitHub heading slug (gjtorikian/html-pipeline / github-slugger): lowercase, strip chars other than
// letters/numbers/space/hyphen/underscore (unicode-aware), spaces -> '-'. Duplicates get -1, -2 … (not modelled here).
function slug(s: string): string {
  s = s.replace(/<[^>]*>/g, '');                 // inline html stripped by github
  s = s.replace(/\p{Extended_Pictographic}\uFE0F?/gu, ''); // emoji removed
  return s.toLowerCase().replace(/[^\p{L}\p{N}\p{M} \-_]/gu, '').replace(/ /g, '-');
}
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  let anchors = 0, derivable = 0, elidedTok = 0;
  const out = t.replace(/\[([^\]\n]+)\]\(#([^)\s]+)\)/g, (m, text: string, anchor: string) => {
    anchors++;
    if (slug(text) === anchor) { derivable++; elidedTok += countTokens(anchor, enc); return `[${text}](#)`; }
    return m;
  });
  const t0 = Date.now();
  const d0 = daedalusEncode(t, enc).messageTokens;
  const d1 = daedalusEncode(out, enc).messageTokens;
  console.log(`${f.split('/').pop()}: raw=${countTokens(t, enc)} anchors=${anchors} derivable=${derivable} elidedTok=${elidedTok} | D=${d0} D(folded)=${d1} Δ=${d1 - d0} (${((d1 - d0) / d0 * 100).toFixed(1)}%) ms=${Date.now() - t0}`);
}
