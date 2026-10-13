/**
 * Z44 layout experiment: is there anything left in layout (leading whitespace)?
 * For each file: DAEDALUS(text) vs DAEDALUS(layout-elided text), plus the raw
 * token counts of the variants.  The elisions are exact bijections IF the
 * decoder regenerates the layout from structure; this measures the *upside*
 * before any contract/flag cost.
 * Run: ./bench/z44/build.sh bench/z44/layout.ts <file>...
 */
import fs from 'node:fs';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';

const enc: EncodingName = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const files = process.argv.slice(2);

/* V1: newline+indent -> newline (JSON-ish / code-ish layout elision) */
const v1 = (s: string) => s.replace(/\n[ \t]+/g, '\n');
/* V6: every whitespace run -> single space (max layout loss; upper bound) */
const v6 = (s: string) => s.replace(/\s+/g, ' ');
/* V7: every whitespace run -> single newline */
const v7 = (s: string) => s.replace(/\s+/g, '\n');
/* V8: leading whitespace only on code-ish lines (keep blank lines) */
const v8 = (s: string) => s.split('\n').map((l) => l.replace(/^[ \t]+/, '')).join('\n');

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const I = T(text);
  const lineCount = (text.match(/\n/g) ?? []).length;
  const r0 = daedalusEncode(text, enc, { maxArms: 2 });
  const out: string[] = [];
  for (const [name, fn] of [['V1', v1], ['V8', v8], ['V6', v6], ['V7', v7]] as Array<[string, (s: string) => string]>) {
    const tx = fn(text);
    const Ix = T(tx);
    const rx = daedalusEncode(tx, enc, { maxArms: 2 });
    out.push(`${name}: raw ${I}->${Ix} (${(I - Ix)}), DAE ${r0.messageTokens}->${rx.messageTokens} (${r0.messageTokens - rx.messageTokens}, ${(100 * (r0.messageTokens - rx.messageTokens) / Math.max(1, r0.messageTokens)).toFixed(1)}%)`);
  }
  console.log(`\n=== ${f.split('/').slice(-2).join('/')} I=${I} lines=${lineCount} wsTok=${(100 * (I - T(v6(text))) / I).toFixed(1)}%  DAE=${r0.messageTokens} (${r0.mode})`);
  for (const o of out) console.log('   ' + o);
}
