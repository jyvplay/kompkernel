// X53 probe2: anchor-slug elision headroom over parents on real ToC-heavy md lanes;
// plus X52 task 3: markdown pretty-table padding mass through DAEDALUS.
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
const ENC = 'o200k_base' as const; const T = (s: string) => countTokens(s, ENC);

function daed(s: string): number | null { const d = daedalusEncode(s, ENC); return d.exact && d.decoded === s ? d.messageTokens : null; }
function ako2(s: string): number | null { const a = akolouthia2Encode(s, ENC); return a.exact && a.decoded === s ? T(a.decoderPrompt) : null; }

export function ghSlug(s: string): string {
  return s.trim().toLowerCase().replace(/[^\p{L}\p{N}\- ]/gu, '').replace(/ /g, '-');
}
function elideAnchors(s: string): { out: string; n: number } {
  let n = 0;
  const out = s.replace(/\[([^\]]*)\]\(#([^)\s]+)\)/g, (m, text: string, slug: string) => {
    if (ghSlug(text) === slug) { n++; return `[${text}](·)`; }
    return m;
  });
  return { out, n };
}
const CONTRACT = '◈(anchor-test) In links written [text](·), the target is "#"+slug(text): lowercase the text, delete every character that is not a letter, digit, hyphen or space, then replace each space with a hyphen.\n';

for (const lane of process.argv.slice(2)) {
  const s = fs.readFileSync(lane, 'utf8');
  const { out, n } = elideAnchors(s);
  const cTok = T(CONTRACT);
  const t0 = Date.now();
  const dOrig = daed(s), dRed = daed(out);
  const t1 = Date.now();
  console.log(`${lane} chars=${s.length} raw=${T(s)} elided=${n} contractTok=${cTok}`);
  console.log(`  DAED orig=${dOrig} red+c=${dRed === null ? null : dRed + cTok} delta=${dOrig !== null && dRed !== null ? dOrig - dRed - cTok : 'n/a'} (${Math.round((t1 - t0) / 1000)}s)`);
}
{
  const p = 'bench/z57/lanes/prose-readme-2.md';
  const s = fs.readFileSync(p, 'utf8');
  let tableLines = 0; let padChars = 0;
  for (const ln of s.split('\n')) if (/^\|.*\|$/.test(ln.trim())) { tableLines++; padChars += ln.length - ln.replace(/ {2,}/g, ' ').length; }
  console.log(`\n${p}: tableLines=${tableLines} multiSpacePadChars=${padChars} rawTok=${T(s)} DAED=${daed(s)}`);
}
