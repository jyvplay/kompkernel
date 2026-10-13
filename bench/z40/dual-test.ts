// Z40: baseline DAEDALUS vs DAEDALUS with dual-tokenizer glyph pool. Reports o200k and cl100k message tokens and exactness.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
const files = process.argv.slice(2);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const row: any = { f: f.split('/').slice(-2).join('/'), in: { o: countTokens(text, 'o200k_base'), c: countTokens(text, 'cl100k_base') } };
  for (const [tag, dual] of [['base', false], ['dual', true]] as const) {
    const t0 = Date.now();
    const r = daedalusEncode(text, 'o200k_base', { dualTokenizer: dual });
    const ms = Date.now() - t0;
    const wire = r.mode === 'raw' ? text : r.wire;
    row[tag] = { o: countTokens(wire, 'o200k_base') + (r.mode === 'raw' ? 0 : r.contractTokens), c: countTokens(wire, 'cl100k_base') + (r.mode === 'raw' ? 0 : r.contractTokens), arm: r.winningArm, exact: r.exact, ms };
  }
  console.log(JSON.stringify(row));
}
