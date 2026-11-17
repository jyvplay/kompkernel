/**
 * X133 — DO THE AXES INTERACT?
 *
 * Every codec so far optimizes ONE axis and then hands the result to the next
 * stage: X132 (ΕΥΡΟΣ) moves rule spans with the glyph assignment fixed; X130
 * (ΜΕΤΟΝΟΜΑΣΊΑ) permutes the glyph assignment with the spans fixed. But the two
 * are coupled: extending a rule from "foo" to "foob" removes the "b" that used
 * to sit next to the glyph, and every token boundary that touches the glyph
 * changes with it. A move that is unprofitable at one assignment can be
 * profitable at another.
 *
 * This probe measures the four orderings on the same lanes:
 *   E      euros only            (the X132 result)
 *   R      rename only           (an X130-style re-run)
 *   E;R    euros then rename
 *   R;E;R  rename, euros, rename  (an interleaved joint search)
 * and reports all four, so the size of the COUPLING is visible directly.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { eurosFromFrontier } from '../../src/lib/omega/euros';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1'; process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';
type Rule = { g: string; v: string };

const MARKERS = new Set(['§', '¶', '※', '⁂', 'Δ', 'Ω', 'Σ', 'Φ', 'Λ', 'Π', 'Γ', 'Θ', 'Ξ', 'µ', 'ℵ', '‡', '¤', '°', '◆', '⁞', '␟', '‖', '†', '•', '·', '±', '×', '÷', '≠', '∞', '≈', '≤', '≥']);

function glyphSetFor(srcText: string, msg: string): string[] {
  const src = new Set<string>();
  for (let i = 0; i < srcText.length; i++) src.add(srcText[i]!);
  const out: string[] = []; const seen = new Set<string>();
  for (let i = 0; i < msg.length; i++) {
    const ch = msg[i]!;
    const cp = ch.codePointAt(0)!;
    const inPool = (cp >= 0x0400 && cp <= 0x04ff) || (cp >= 0x0370 && cp <= 0x03ff) ||
      (cp >= 0x0600 && cp <= 0x06ff) || (cp >= 0x0590 && cp <= 0x05ff);
    if (!src.has(ch) && inPool && !MARKERS.has(ch) && !seen.has(ch)) { seen.add(ch); out.push(ch); }
  }
  return out;
}
function parseTape(t: string, G: Set<string>): Rule[] {
  const rs: Rule[] = []; const seen = new Set<string>(); let cur: Rule | null = null;
  for (const ch of t) {
    if (G.has(ch) && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; rs.push(cur); }
    else if (cur) cur.v += ch;
  }
  return rs;
}
const buildTape = (rs: Rule[]) => '§' + rs.map(r => r.g + r.v).join('');
function expandRules(rs: Rule[]): Map<string, string> {
  const names = new Set(rs.map(r => r.g));
  const m = new Map<string, string>();
  for (const r of rs) {
    let o = '';
    for (const ch of r.v) o += (names.has(ch) && m.has(ch)) ? m.get(ch)! : ch;
    m.set(r.g, o);
  }
  return m;
}
function expandContent(rs: Rule[], b: string): string {
  const m = expandRules(rs); const names = new Set(rs.map(r => r.g));
  let o = '';
  for (const ch of (b.startsWith('¶') ? b.slice(1) : b)) o += (names.has(ch) && m.has(ch)) ? m.get(ch)! : ch;
  return o;
}

/** split a message back into pre / rules / body */
function split(M: string, src: string) {
  const i1 = M.indexOf('§'); const i2 = i1 < 0 ? -1 : M.indexOf('¶', i1);
  const G = new Set(glyphSetFor(src, M));
  return {
    pre: i1 < 0 ? M : M.slice(0, i1),
    rules: i1 < 0 ? [] : parseTape(i2 < 0 ? M.slice(i1) : M.slice(i1, i2), G),
    body: i2 < 0 ? '' : M.slice(i2),
    ok: i1 >= 0 && i2 >= 0,
  };
}

/** RENAME hill-climb: reassign glyph characters, priced on the whole message. */
function rename(M: string, src: string, budgetMs: number): string {
  const s = split(M, src);
  if (!s.ok || s.rules.length === 0) return M;
  const glyphs = s.rules.map(r => r.g);
  const srcSet = new Set<string>(); for (let i = 0; i < src.length; i++) srcSet.add(src[i]!);
  const used = new Set(glyphs);
  // pool: unused characters from the same blocks the miners draw from
  const pool: string[] = [];
  for (const [lo, hi] of [[0x0400, 0x04ff], [0x0370, 0x03ff]] as [number, number][])
    for (let cp = lo; cp <= hi; cp++) {
      const ch = String.fromCodePoint(cp);
      if (!srcSet.has(ch) && !used.has(ch) && !MARKERS.has(ch)) pool.push(ch);
    }
  if (!pool.length) return M;
  const price = (cur: string[]) => {
    const map = new Map<string, string>();
    for (let i = 0; i < glyphs.length; i++) map.set(glyphs[i]!, cur[i]!);
    let out = '';
    for (const ch of M) out += map.get(ch) ?? ch;
    return { out, tok: countTokens(out, enc) };
  };
  let cur = glyphs.slice();
  let { tok: curTok } = price(cur);
  const deadline = Date.now() + budgetMs;
  for (let sweep = 0; sweep < 30 && Date.now() < deadline; sweep++) {
    let improved = false;
    for (let i = 0; i < cur.length && Date.now() < deadline; i++) {
      const orig = cur[i]!;
      let bestCh = orig, bestTok = curTok;
      for (const ch of pool) {
        if (cur.includes(ch)) continue;
        cur[i] = ch;
        const t = price(cur).tok;
        if (t < bestTok) { bestTok = t; bestCh = ch; }
      }
      cur[i] = bestCh;
      if (bestCh !== orig) { curTok = bestTok; improved = true; }
    }
    // swap moves
    for (let i = 0; i < cur.length && Date.now() < deadline; i++) {
      for (let j = i + 1; j < cur.length; j++) {
        const a = cur[i]!, b = cur[j]!;
        cur[i] = b; cur[j] = a;
        const t = price(cur).tok;
        if (t < curTok) { curTok = t; improved = true; }
        else { cur[i] = a; cur[j] = b; }
      }
    }
    if (!improved) break;
  }
  return price(cur).out;
}

let tot: Record<string, number> = { base: 0, E: 0, R: 0, ER: 0, RER: 0 };
for (const p of (process.env.LANES ?? '').split(',').filter(Boolean)) {
  const src = fs.readFileSync(p, 'utf8');
  const a: any = tagstackEncode(src, enc);
  const base = a.messageTokens;
  const BUD = +(process.env.BUD ?? '4000');

  const e: any = eurosFromFrontier(a, src, enc);
  const mE = e ? e.message : a.message;
  const r = rename(a.message, src, BUD);
  const mER = rename(mE, src, BUD);
  // R;E;R — euros needs a frontier-shaped object, so rebuild one
  const rTok = countTokens(r, enc);
  const eFromR: any = eurosFromFrontier({ message: r, messageTokens: rTok, decoded: src }, src, enc);
  const mRE = eFromR ? eFromR.message : r;
  const mRER = rename(mRE, src, BUD);

  const vals: Record<string, number> = {
    base, E: countTokens(mE, enc), R: countTokens(r, enc),
    ER: countTokens(mER, enc), RER: countTokens(mRER, enc),
  };
  for (const k of Object.keys(tot)) tot[k]! += vals[k]!;
  console.log(`${p.split('/').pop()!.padEnd(20)} base=${String(base).padStart(5)}  E=${String(vals.E! - base).padStart(4)}  R=${String(vals.R! - base).padStart(4)}  E;R=${String(vals.ER! - base).padStart(4)}  R;E;R=${String(vals.RER! - base).padStart(4)}`);
}
console.log(`\nTOTALS  base=${tot.base}  E=${tot.E! - tot.base}  R=${tot.R! - tot.base}  E;R=${tot.ER! - tot.base}  R;E;R=${tot.RER! - tot.base}`);
