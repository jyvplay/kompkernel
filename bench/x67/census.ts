import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const path = process.argv[2];
const text = fs.readFileSync(path, 'utf8');
const t0 = Date.now();
const tag = tagstackEncode(text, enc);
const wire = tag.applied || tag.message !== undefined ? tag.wire : tag.wire;
const toks = tokenStrings(wire, enc).map((t) => t.s);
const freq = new Map<string, number>();
for (const s of toks) freq.set(s, (freq.get(s) ?? 0) + 1);
const singles = [...freq.values()].filter((n) => n === 1).reduce((a, b) => a + b, 0);
const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
const alpha = toks.filter((s) => /^ ?[A-Za-z]+$/.test(s)).length;
const digit = toks.filter((s) => /\d/.test(s)).length;
const punct = toks.filter((s) => /^ ?[^A-Za-z0-9]+$/.test(s)).length;
console.log(JSON.stringify({
  path, chars: text.length, rawTokens: countTokens(text, enc),
  frontierM: Math.min(...Object.values(tag.frontierCosts).map(Number)),
  winner: tag.parentCodec, applied: tag.applied, frontierCosts: tag.frontierCosts,
  wireTokens: toks.length, distinct: freq.size, singletonTokens: singles,
  singletonShare: +(singles / toks.length).toFixed(3),
  alpha, digit, punct,
  top: top.map(([s, n]) => [JSON.stringify(s), n]),
  ms: Date.now() - t0,
}, null, 1));
fs.writeFileSync(`/tmp/wire-${path.replace(/\W+/g, '_')}.txt`, wire);
