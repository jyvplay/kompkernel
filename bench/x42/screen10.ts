/**
 * X42 screen 10 — WHY did the gate reject a 756-token raw saving on vix?
 * Compares the RAW token count of the source against the raw token count of
 * the APOCOPE-cut text, with no stack at all. If the cut text is not even
 * cheaper raw, the mechanism is refuted at the tokenizer level and the stack
 * gate was right to reject it. If it IS cheaper raw, the loss happens inside
 * the stack and that is worth locating.
 */
import { readFileSync } from 'node:fs';
import { encode } from 'gpt-tokenizer';
import { apocopeChoose, apocopeApply, apocopeRender, apocopeUndo } from '@/lib/omega/apocope';

const enc: any = 'o200k_base';
for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  const ch = apocopeChoose(t, enc);
  const raw = ch.reduce((s, x) => s + x.save, 0);
  if (raw < 20) continue;
  const cut = apocopeApply(t, ch);
  console.log(`\n=== ${p.split('/').pop()}`);
  console.log(`  templates : ${ch.map((x) => `${x.keep}:${apocopeRender(x)} (n=${x.count}, save=${x.save})`).join('  ')}`);
  console.log(`  source    : ${t.length} chars, ${encode(t).length} tokens`);
  console.log(`  cut       : ${cut.length} chars, ${encode(cut).length} tokens`);
  console.log(`  raw delta : ${encode(t).length - encode(cut).length} tokens (screen predicted ${raw})`);
  console.log(`  roundtrip : ${apocopeUndo(cut, ch) === t ? 'EXACT' : '***FAIL***'}`);

  // Where does the difference go? Count digit tokens and digit characters both ways.
  for (const [nm, s] of [['source', t], ['cut', cut]] as const) {
    let dchars = 0, druns = 0, dtok = 0, floor = 0;
    for (const m of s.matchAll(/\p{N}+/gu)) {
      dchars += m[0].length; druns++; dtok += encode(m[0]).length; floor += Math.ceil(m[0].length / 3);
    }
    console.log(`  ${nm.padEnd(7)} digitRuns=${String(druns).padStart(5)} digitChars=${String(dchars).padStart(6)} digitTokens=${String(dtok).padStart(5)} floor=${String(floor).padStart(5)} headroom=${dtok - floor}`);
  }
  // sample of the head of each
  console.log(`  source head : ${JSON.stringify(t.slice(0, 110))}`);
  console.log(`  cut head    : ${JSON.stringify(cut.slice(0, 110))}`);
}
