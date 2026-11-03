/**
 * X73 probe 3 — the decisive one.
 *
 * Probe 2 killed transposition: column-major is worth ~0.2 % over the same cells
 * in row order, so the tokenizer does not care where a cell sits in the message.
 * But probe 2 also showed that collapsing the whitespace between cells to a single
 * TAB is worth 8-13 % of RAW on listings — and more importantly it changes WHICH
 * PARENT can fire: a space-aligned listing is prose to this stack, while a
 * TAB-separated one is the shape its strongest family (the table fold) is built
 * for.
 *
 * So this probe asks the only question that matters: does the frontier produce a
 * cheaper message for the TAB normal form than for the source, ON THE SAME LANE,
 * in the same process? A contract that restores the gaps is charged separately and
 * is NOT included here — so a normal form that is not already far below the
 * frontier's own message cannot pay for one.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';

function tabNormal(text: string): { normal: string; K: number; rows: number; literal: number } {
  const lines = text.split('\n');
  const counts = new Map<number, number>();
  for (const l of lines) if (l.trim()) { const n = l.trim().split(/ +/).length; counts.set(n, (counts.get(n) ?? 0) + 1); }
  const K = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
  const out: string[] = [];
  let rows = 0, literal = 0;
  for (const l of lines) {
    const cs = l.trim() ? l.trim().split(/ +/) : [];
    if (cs.length === K) { out.push(cs.join('\t')); rows++; }
    else { out.push('\\' + l); literal++; }
  }
  return { normal: out.join('\n'), K, rows, literal };
}

for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const { normal, K, rows, literal } = tabNormal(t);
  const t0 = Date.now();
  const base: any = tagstackEncode(t, enc);
  const baseMs = Date.now() - t0;
  const t1 = Date.now();
  const f: any = tagstackEncode(normal, enc);
  const fMs = Date.now() - t1;
  const normRaw = countTokens(normal, enc);
  const delta = f.messageTokens - base.messageTokens;
  console.log(
    `${p.split('/').pop().padEnd(24)} K=${String(K).padStart(2)} rows=${String(rows).padStart(3)} lit=${String(literal).padStart(2)} | ` +
    `raw ${String(countTokens(t, enc)).padStart(5)} frontier ${String(base.messageTokens).padStart(5)} (${base.parentCodec}) | ` +
    `normalRaw ${String(normRaw).padStart(5)} frontierOnNormal ${String(f.messageTokens).padStart(5)} (${f.parentCodec}) | ` +
    `delta ${String(delta).padStart(5)} ${baseMs}ms/${fMs}ms`
  );
}
