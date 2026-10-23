/**
 * X44 screen 1 — WHERE DO PROSE TOKENS LEAK?
 *
 * X42 measured payload densities of 3.16-4.12 chars/token on the fresh prose
 * holdouts, while raw English under o200k_base runs at about 4.2-4.65
 * (arXiv 2505.24689 tabulates English at 0.2152 tokens/char). So on prose the
 * WIRE is measurably worse per character than the untouched source: it wins only
 * by having fewer characters. If density were merely preserved, prose-02's 2,441
 * payload characters would cost far less than the measured 770 tokens.
 *
 * This decomposes a real shipped wire into its parts and prices each one, so the
 * leak is attributed rather than guessed at.
 */
import { readFileSync } from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { krisisEncode } from '@/lib/omega/krisis';

const enc = 'o200k_base' as EncodingName;

const classify = (c: string): string => {
  const cp = c.codePointAt(0)!;
  if (/\p{N}/u.test(c)) return 'digit';
  if (cp === 0x00a7 || cp === 0x00b6) return 'frame';
  if (cp >= 0x0370) return 'glyph';
  if (/[A-Za-z]/.test(c)) return 'latin';
  if (c === ' ' || c === '\n' || c === '\t') return 'space';
  return 'punct';
};

for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const src = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const r: any = krisisEncode(src, enc);
  const wire: string = r.wire;
  const i = wire.indexOf('§');
  const contract = i >= 0 ? wire.slice(0, i) : '';
  const frame = i >= 0 ? wire.slice(i) : wire;

  const srcTok = countTokens(src, enc);
  console.log(`\n=== ${nm}`);
  console.log(`  source  : ${String(src.length).padStart(6)} chars  ${String(srcTok).padStart(5)} tok  ${(src.length / srcTok).toFixed(2)} c/tk`);
  console.log(`  wire    : ${String(wire.length).padStart(6)} chars  ${String(r.messageTokens).padStart(5)} tok  ${(wire.length / r.messageTokens).toFixed(2)} c/tk`);
  console.log(`  contract: ${String(contract.length).padStart(6)} chars  ${String(countTokens(contract, enc)).padStart(5)} tok`);
  console.log(`  frame   : ${String(frame.length).padStart(6)} chars  ${String(countTokens(frame, enc)).padStart(5)} tok  ${(frame.length / Math.max(countTokens(frame, enc), 1)).toFixed(2)} c/tk`);

  const sep = frame.indexOf('¶');
  if (sep < 0) { console.log('  (no rule tape — frame is literal)'); continue; }
  const tape = frame.slice(0, sep + 1), body = frame.slice(sep + 1);
  const tapeTk = countTokens(tape, enc), bodyTk = countTokens(body, enc);
  console.log(`  -- tape : ${String(tape.length).padStart(6)} chars  ${String(tapeTk).padStart(5)} tok  (${(100 * tapeTk / r.messageTokens).toFixed(1)}% of message)`);
  console.log(`  -- body : ${String(body.length).padStart(6)} chars  ${String(bodyTk).padStart(5)} tok  ${(body.length / Math.max(bodyTk, 1)).toFixed(2)} c/tk`);

  const byClass = new Map<string, string>();
  for (const c of body) {
    const k = classify(c);
    byClass.set(k, (byClass.get(k) ?? '') + c);
  }
  console.log(`  -- body by class:`);
  let sumIso = 0;
  for (const [k, v] of [...byClass.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const tk = countTokens(v, enc); sumIso += tk;
    console.log(`       ${k.padEnd(6)} ${String(v.length).padStart(6)} ch  ${String(tk).padStart(5)} tok isolated  ${String((100 * v.length / body.length).toFixed(1)).padStart(5)}% of chars  ${(v.length / Math.max(tk, 1)).toFixed(2)} c/tk`);
  }
  console.log(`       sum isolated ${sumIso} vs whole body ${bodyTk}  (cross-class merging ${sumIso - bodyTk})`);

  const lit = [...body].filter((c) => ['latin', 'space', 'punct'].includes(classify(c))).join('');
  const glyphs = [...body].filter((c) => classify(c) === 'glyph').join('');
  console.log(`  -- literal concatenated : ${String(lit.length).padStart(6)} ch ${String(countTokens(lit, enc)).padStart(5)} tok  ${(lit.length / Math.max(countTokens(lit, enc), 1)).toFixed(2)} c/tk`);
  console.log(`  -- glyphs concatenated  : ${String(glyphs.length).padStart(6)} ch ${String(countTokens(glyphs, enc)).padStart(5)} tok  ${(glyphs.length / Math.max(countTokens(glyphs, enc), 1)).toFixed(2)} c/tk`);
  console.log(`  -- glyph occurrences in body: ${glyphs.length}`);
}
