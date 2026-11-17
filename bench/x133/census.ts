/**
 * X133 — WHAT IS ACTUALLY LEFT? A census of the frontier message.
 *
 * The headroom probe showed the body is mined out (1 n-gram candidate) and the
 * dictionary is well-pruned (0 net-negative rules). So the remaining mass is
 * NOT more dictionary. This tool prints what the mass IS:
 *   - the preamble verbatim
 *   - the tape parsed into rules (glyph -> value), with each value's token cost
 *   - the body's most frequent tokens, by class, with counts
 * so the next mechanism can be aimed at something real.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { encode, decode } from 'gpt-tokenizer/encoding/o200k_base';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1'; process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0'; process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';

/** structural markers emitted by the format itself, not content */
const MARKERS = new Set(['§', '¶', '¦', '†', '‡', '•', '·', '±', '×', '÷', '≠', '∞', '≈', '≤', '≥', '※', '⁂', '⟪', '⟫']);

function glyphSetFor(srcText: string, msg: string): Set<string> {
  const src = new Set<string>();
  for (let i = 0; i < srcText.length; i++) src.add(srcText[i]!);
  const g = new Set<string>();
  for (let i = 0; i < msg.length; i++) {
    const ch = msg[i]!;
    if (!src.has(ch) && !MARKERS.has(ch)) g.add(ch);
  }
  return g;
}
function parseTape(t: string, G: Set<string>): { g: string; v: string }[] {
  const rs: { g: string; v: string }[] = []; const seen = new Set<string>(); let cur: any = null;
  for (const ch of t) {
    if (G.has(ch) && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; rs.push(cur); }
    else if (cur) cur.v += ch;
  }
  return rs;
}

for (const p of (process.env.LANES ?? '').split(',').filter(Boolean)) {
  const text = fs.readFileSync(p, 'utf8');
  const a: any = tagstackEncode(text, enc);
  const M = a.message as string;
  const G = glyphSetFor(text, M);
  const i1 = M.indexOf('§');
  const i2 = i1 < 0 ? -1 : M.indexOf('¶', i1);
  const pre = i1 < 0 ? M : M.slice(0, i1);
  const tape = i1 < 0 ? '' : (i2 < 0 ? M.slice(i1) : M.slice(i1, i2));
  const body = i2 < 0 ? '' : M.slice(i2);
  const rules = parseTape(tape, G);
  const name = p.split('/').pop()!;

  console.log(`\n${'='.repeat(78)}\n### ${name}   raw=${countTokens(text, enc)}  out=${a.messageTokens}  pre=${countTokens(pre, enc)} tape=${countTokens(tape, enc)} body=${countTokens(body, enc)}`);
  if (process.env.SHOWPRE === '1') console.log(`PRE: ${JSON.stringify(pre)}`);
  console.log(`--- TAPE: ${rules.length} rules, ${countTokens(tape, enc)} tokens ---`);
  if (process.env.SHOWTAPE === '1') {
    for (const r of rules) {
      console.log(`  ${r.g} = ${JSON.stringify(r.v)}   [${countTokens(r.v, enc)} tok]`);
    }
  } else {
    const costs = rules.map(r => countTokens(r.v, enc));
    costs.sort((x, y) => y - x);
    console.log(`  value token costs: ${costs.slice(0, 24).join(',')}   (sum ${costs.reduce((s, x) => s + x, 0)})`);
    console.log(`  tape overhead = ${countTokens(tape, enc)} - ${costs.reduce((s, x) => s + x, 0)} = ${countTokens(tape, enc) - costs.reduce((s, x) => s + x, 0)} tokens of glyphs+structure`);
  }

  // body token census
  const btoks = encode(body).map(i => decode([i]));
  const freq = new Map<string, number>();
  const cls = new Map<string, string>();
  for (const t of btoks) {
    freq.set(t, (freq.get(t) ?? 0) + 1);
    if (!cls.has(t)) {
      let isG = false;
      for (const ch of t) if (G.has(ch)) { isG = true; break; }
      cls.set(t, isG ? 'glyph' : /^[\s]*[0-9][0-9.,:%\/]*$/.test(t) ? 'num'
        : /[A-Za-zÀ-ɏ]/.test(t) ? 'word' : 'other');
    }
  }
  const byClass: Record<string, number> = { glyph: 0, num: 0, word: 0, other: 0 };
  for (const t of btoks) byClass[cls.get(t)!]!++;
  console.log(`--- BODY ${btoks.length} tokens: glyph=${byClass.glyph} word=${byClass.word} num=${byClass.num} other=${byClass.other} ---`);
  for (const c of ['other', 'word', 'num', 'glyph']) {
    const top = [...freq.entries()].filter(([t]) => cls.get(t) === c)
      .sort((x, y) => y[1] - x[1]).slice(0, 14);
    if (!top.length) continue;
    const tot = top.reduce((s, x) => s + x[1], 0);
    console.log(`  top ${c} (${tot} tok): ${top.map(([t, n]) => `${JSON.stringify(t)}x${n}`).join(' ')}`);
  }
  if (process.env.SHOWBODY === '1') console.log(`BODY:\n${body.slice(0, +(process.env.BODYLEN ?? '1600'))}`);
}
