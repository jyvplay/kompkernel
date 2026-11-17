/**
 * X133 — ALPHABET SWEEP.
 *
 * X130 (ΜΕΤΟΝΟΜΑΣΊΑ) permutes the glyph alphabet but keeps its SCRIPT: it
 * tested exactly one alternative (Hebrew/Arabic, +63 tokens) and concluded the
 * alphabet is near-optimal. What it never tested is the hypothesis that the
 * glyph's script should be chosen against the script of the text it is
 * EMBEDDED IN, not against the other glyphs.
 *
 * X129's one-token floor says gain = c*(t-1) - (1+t), i.e. -2 for every c when
 * t = 1. That floor prices a glyph reference at exactly one token. X129 itself
 * names the escape: if a reference is absorbed into a neighbouring token it
 * costs ZERO, and then a one-token value with c >= 3 becomes profitable. The
 * frontier's glyph-glyph merges are already exploited (71 of 82 pairs merge on
 * kb-article). The untested half is the glyph-LITERAL boundary: in prose a
 * glyph is far more often adjacent to ordinary text than to another glyph.
 *
 * This sweep answers, per lane, one question: does ANY script beat the shipped
 * one? It is a pure relabelling — a bijection on the glyph set — so the tape's
 * "first occurrence defines" structure, the expansion, and therefore the
 * decoded source are all untouched.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1'; process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';

const MARKERS = new Set(['§', '¶', '¦', '†', '‡', '•', '·', '±', '×', '÷', '≠', '∞', '≈', '≤', '≥']);

/** characters the format itself emits; a glyph may never be one of them */
function structuralOf(msg: string): Set<string> {
  const s = new Set<string>(MARKERS);
  for (const c of ['※', '⁂', '⟪', '⟫', 'Δ', 'Ω', 'Σ', 'Φ', 'Λ', 'Π', 'Γ', 'Θ', 'Ξ', 'µ', 'ℵ', '‡', '¤', '°', '◆', '⁞', '␟', '‖']) s.add(c);
  return s;
}
function glyphSetFor(srcText: string, msg: string): string[] {
  const src = new Set<string>();
  for (let i = 0; i < srcText.length; i++) src.add(srcText[i]!);
  const struct = structuralOf(msg);
  const out: string[] = []; const seen = new Set<string>();
  for (let i = 0; i < msg.length; i++) {
    const ch = msg[i]!;
    if (!src.has(ch) && !struct.has(ch) && !seen.has(ch)) { seen.add(ch); out.push(ch); }
  }
  return out;
}

type Block = { name: string; lo: number; hi: number };
const BLOCKS: Block[] = [
  { name: 'SHIPPED', lo: -1, hi: -1 },
  { name: 'Cyrillic', lo: 0x0400, hi: 0x04FF },
  { name: 'CyrillicSup', lo: 0x0500, hi: 0x052F },
  { name: 'Greek', lo: 0x0386, hi: 0x03FF },
  { name: 'GreekExt', lo: 0x1F00, hi: 0x1FFF },
  { name: 'LatinExtA', lo: 0x0100, hi: 0x017F },
  { name: 'LatinExtB', lo: 0x0180, hi: 0x024F },
  { name: 'IPA', lo: 0x0250, hi: 0x02AF },
  { name: 'Hebrew', lo: 0x05D0, hi: 0x05EA },
  { name: 'Arabic', lo: 0x0621, hi: 0x064A },
  { name: 'ArabicExt', lo: 0x0750, hi: 0x077F },
  { name: 'Armenian', lo: 0x0531, hi: 0x0556 },
  { name: 'ArmenianLc', lo: 0x0561, hi: 0x0587 },
  { name: 'Georgian', lo: 0x10D0, hi: 0x10FA },
  { name: 'Devanagari', lo: 0x0904, hi: 0x0939 },
  { name: 'Bengali', lo: 0x0985, hi: 0x09B9 },
  { name: 'Thai', lo: 0x0E01, hi: 0x0E2E },
  { name: 'Hiragana', lo: 0x3042, hi: 0x3093 },
  { name: 'Katakana', lo: 0x30A2, hi: 0x30F3 },
  { name: 'HangulJamo', lo: 0x1100, hi: 0x1159 },
  { name: 'HangulSyl', lo: 0xAC00, hi: 0xAC7F },
  { name: 'FullwidthLat', lo: 0xFF21, hi: 0xFF3A },
  { name: 'FullwidthLc', lo: 0xFF41, hi: 0xFF5A },
  { name: 'CJK', lo: 0x4E00, hi: 0x4E7F },
  { name: 'Superscript', lo: 0x2071, hi: 0x207F },
  { name: 'MathAlnumLat', lo: 0x1D400, hi: 0x1D44F },
  { name: 'Braille', lo: 0x2800, hi: 0x283F },
  { name: 'Ogham', lo: 0x1680, hi: 0x169B },
  { name: 'Runic', lo: 0x16A0, hi: 0x16ED },
  { name: 'Cherokee', lo: 0x13A0, hi: 0x13F4 },
];

function poolFor(b: Block, src: Set<string>, struct: Set<string>, need: number): string[] {
  if (b.lo < 0) return [];
  const out: string[] = [];
  for (let cp = b.lo; cp <= b.hi && out.length < need; cp++) {
    const ch = String.fromCodePoint(cp);
    if (src.has(ch) || struct.has(ch)) continue;
    out.push(ch);
  }
  return out;
}

for (const p of (process.env.LANES ?? '').split(',').filter(Boolean)) {
  const text = fs.readFileSync(p, 'utf8');
  const a: any = tagstackEncode(text, enc);
  const M = a.message as string;
  const G = glyphSetFor(text, M);
  const name = p.split('/').pop()!;
  if (G.length === 0) { console.log(`${name.padEnd(20)} no glyphs`); continue; }
  const srcSet = new Set<string>();
  for (let i = 0; i < text.length; i++) srcSet.add(text[i]!);
  const struct = structuralOf(M);
  const base = a.messageTokens;
  const results: { name: string; tok: number }[] = [];
  for (const b of BLOCKS) {
    if (b.lo < 0) { results.push({ name: 'SHIPPED', tok: base }); continue; }
    const pool = poolFor(b, srcSet, struct, G.length);
    if (pool.length < G.length) continue;
    const map = new Map<string, string>();
    for (let i = 0; i < G.length; i++) map.set(G[i]!, pool[i]!);
    let out = '';
    for (const ch of M) out += map.get(ch) ?? ch;
    results.push({ name: b.name, tok: countTokens(out, enc) });
  }
  results.sort((x, y) => x.tok - y.tok);
  const best = results[0]!;
  console.log(`${name.padEnd(20)} base=${String(base).padStart(5)} glyphs=${String(G.length).padStart(3)} | best=${best.name.padEnd(13)} ${String(best.tok).padStart(5)} (Δ${best.tok - base >= 0 ? '+' : ''}${best.tok - base}) | ${results.slice(0, 6).map(r => `${r.name}:${r.tok - base >= 0 ? '+' : ''}${r.tok - base}`).join(' ')}`);
}
