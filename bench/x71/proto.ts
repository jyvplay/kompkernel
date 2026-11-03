/**
 * Prototype: a hand-built phrase-dictionary codec with 1-token glyph codes.
 * Everything is measured on the COMPLETE message (codebook + text), so BPE
 * boundary effects are counted, not assumed. Reversibility is verified.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const GLYPHS = '§¶¤‡†‡◊◆⌘⌥⌦⌫⏎⌁⌇⍟⍜⍫⍰⎈⎊⎋⏣⏥⏧␀␁␂␃␄␅␆␇␈␉␊␋␌␍␎␏␑␒␓␔␕␖␗'.split('');
const one = GLYPHS.filter((g) => T(g) === 1);
const MAXN = +(process.env.MAXN ?? 6), MAXENT = +(process.env.MAXENT ?? 40);

for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const raw = T(text);
  const words = text.split(/(\s+)/);            // keep separators
  // candidate phrases: word n-grams including their separators
  type Cand = { s: string; c: number; t: number; gain: number };
  const cands: Cand[] = [];
  const wordIdx: number[] = [];
  const toks: string[] = [];
  for (let i = 0; i < words.length; i++) if (words[i].trim()) { wordIdx.push(i); toks.push(words[i]); }
  for (let n = 1; n <= MAXN; n++) {
    const m = new Map<string, number>();
    for (let i = 0; i + n <= wordIdx.length; i++) {
      const a = wordIdx[i], b = wordIdx[i + n - 1];
      const s = text.slice(indexOf(text, words, a), indexOf(text, words, b) + words[b].length);
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    for (const [s, c] of m) { if (c < 2) continue; const t = T(s); const gain = c * (t - 1) - t - 4; if (gain > 0) cands.push({ s, c, t, gain }); }
  }
  cands.sort((a, b) => b.gain - a.gain);
  const chosen: Cand[] = [];
  const seen = new Set<string>();
  for (const c of cands) {
    if (chosen.length >= MAXENT) break;
    if (seen.has(c.s)) continue;
    let overlap = false;
    for (const d of chosen) if (d.s.includes(c.s) || c.s.includes(d.s)) { overlap = true; break; }
    if (overlap) continue;
    seen.add(c.s); chosen.push(c);
  }
  // assign glyphs longest-first so the leftmost-longest match is unambiguous
  chosen.sort((a, b) => b.s.length - a.s.length || b.gain - a.gain);
  const code = new Map<string, string>();
  chosen.forEach((c, i) => code.set(c.s, one[i]));
  let body = text;
  for (const [s, g] of code) body = body.split(s).join(g);
  // codebook: glyph + phrase, one per line
  const book = chosen.map((c) => one[chosen.indexOf(c)] + c.s).join('\n');
  const contract = 'Below is a codebook then body. Each codebook line is one glyph followed by the text it stands for; replace every glyph in the body. Body is literal otherwise.';
  const total = T(contract) + T(book) + T(body);
  // reversibility
  let back = body;
  for (const [s, g] of code) back = back.split(g).join(s);
  const ok = back === text;
  const f: any = tagstackEncode(text, enc);
  console.error(`${p}\n  raw ${raw} frontier ${f.messageTokens} | codec ${total} (contract ${T(contract)} + book ${T(book)} + body ${T(body)}) entries ${chosen.length} glyphs ${one.length} | exact ${ok} | ${total < f.messageTokens ? 'WIN ' + (f.messageTokens - total) : 'lose ' + (total - f.messageTokens)}`);
}
function indexOf(text: string, words: string[], i: number) {
  let k = 0; for (let j = 0; j < i; j++) k += words[j].length; return k;
}
