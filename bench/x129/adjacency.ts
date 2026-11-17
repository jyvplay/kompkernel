/**
 * X130 — how many ADJACENT GLYPH PAIRS are there in a real frontier body?
 * This is the gating number for glyph relabelling: relabelling can only save
 * tokens on pairs of glyphs that actually sit next to each other.
 *
 * Tape parse: after '§', the FIRST occurrence of a glyph starts its rule; later
 * occurrences of an already-defined glyph are back-references inside a value.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
// the stack's glyph alphabet is 0x0386..0x044f (Greek + Cyrillic)
function isGlyph(ch: string): boolean { const c = ch.codePointAt(0)!; return c >= 0x0386 && c <= 0x044f; }

for (const p of (process.env.LANES ?? '').split(',').filter(Boolean)) {
  const text = fs.readFileSync(p, 'utf8');
  const a: any = tagstackEncode(text, enc);
  const M = a.message as string;
  const i1 = M.indexOf('\u00a7');
  const i2 = i1 < 0 ? -1 : M.indexOf('\u00b6', i1);
  if (i1 < 0) { console.log(`${p.split('/').pop()!.padEnd(20)} M=${String(a.messageTokens).padStart(4)}  NO TAPE (passthrough)`); continue; }
  const tape = i2 < 0 ? M.slice(i1) : M.slice(i1, i2);
  const body = i2 < 0 ? '' : M.slice(i2);
  // parse tape -> defined glyph set
  const defined = new Set<string>();
  for (const ch of tape) if (isGlyph(ch)) defined.add(ch);
  // count glyphs and adjacent glyph-glyph pairs in the body
  let g = 0, adj = 0, adjRun = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i]!;
    if (isGlyph(c) && defined.has(c)) { g++; if (i + 1 < body.length && isGlyph(body[i + 1]!) && defined.has(body[i + 1]!)) { adj++; adjRun++; } }
  }
  console.log(`${p.split('/').pop()!.padEnd(20)} M=${String(a.messageTokens).padStart(4)}  rules=${String(defined.size).padStart(4)}  bodyGlyphs=${String(g).padStart(5)}  ADJACENT PAIRS=${String(adj).padStart(5)}  (max save if all merged=${adj})`);
}
