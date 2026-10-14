// Z44 anatomy: where do the tokens actually go in the DAEDALUS wire for prose lanes?
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { tokenStrings, countTokens } from '@/lib/omega/bpe';

const files = (process.env.FILES ?? '').split(',').filter(Boolean);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const r = daedalusEncode(text, 'o200k_base');
  const toks = tokenStrings(r.wire, 'o200k_base').map(x => x.s);
  const n = toks.length;
  const agg = new Map<string, number>();
  for (const t of toks) agg.set(t, (agg.get(t) ?? 0) + 1);
  // classes
  const cls: Record<string, number> = { ws: 0, punct: 0, digits: 0, latinWord: 0, glyph: 0, other: 0 };
  for (const t of toks) {
    const cp = t.codePointAt(0)!;
    if (/^\s+$/.test(t)) cls.ws += 1;
    else if (cp >= 0x3000 || (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x0400 && cp <= 0x04ff && t.length <= 2)) cls.glyph += 1;
    else if (/^[A-Za-z']+$/.test(t)) cls.latinWord += 1;
    else if (/^[0-9.,%:-]+$/.test(t)) cls.digits += 1;
    else if (/^[^\w\s]+$/.test(t)) cls.punct += 1;
    else cls.other += 1;
  }
  // how many tokens are single characters
  const single = toks.filter(t => [...t].length === 1).length;
  // newline-adjacent cost: tokens that start with \n
  const nlTokens = toks.filter(t => t.startsWith('\n')).length;
  // what would the text cost if all "\n" (single, non-paragraph) were spaces?
  const reflowed = text.replace(/([^\n])\n(?=[^\n])/g, '$1 ');
  const reflowTok = countTokens(reflowed, 'o200k_base');
  console.log(`\n== ${f}  raw=${countTokens(text, 'o200k_base')} daeM=${r.messageTokens} wire=${r.outTokens} contract=${r.contractTokens} mode=${r.mode}`);
  console.log(`   wireTokens=${n} single-char=${single} (${(100 * single / n).toFixed(1)}%) newline-led=${nlTokens}`);
  console.log(`   classes`, JSON.stringify(cls));
  console.log(`   hard-wrap reflow prize: raw ${countTokens(text, 'o200k_base')} -> reflowed ${reflowTok} (=${countTokens(text, 'o200k_base') - reflowTok} tok)`);
  const top = [...agg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
  console.log(`   top tokens: ` + top.map(([t, c]) => `${JSON.stringify(t)}x${c}`).join(' '));
}
