/** X87 — where do the frontier's remaining tokens actually GO?
 *
 *  Every codec in this stack was built by looking at a source and guessing what the
 *  frontier leaves on the table. This looks at the frontier's own output instead: the
 *  complete one-message wire, token by token, classified. The residual is the only
 *  honest map of remaining headroom, and a mechanism aimed at the biggest bucket is
 *  worth more than one aimed at the most interesting.
 *
 *  For each lane: the message, its token count, a character-class census of the tokens,
 *  the per-line cost profile, and the single most expensive tokens.
 */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';

const enc: any = 'o200k_base';
const outDir = 'bench/x87/receipts/wires';
fs.mkdirSync(outDir, { recursive: true });

function cls(s: string): string {
  if (/^[0-9]+$/.test(s)) return 'digit';
  if (/^[0-9.,:/+\-%]+$/.test(s)) return 'num-punct';
  if (/^[\s]+$/.test(s)) return 'space';
  if (/^[\x20-\x7e]+$/.test(s)) {
    if (/^[A-Za-z]+$/.test(s)) return s === s.toUpperCase() ? 'upper' : 'lower';
    return 'ascii-mix';
  }
  return 'glyph';
}

const summary: any[] = [];
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const name = p.split('/').pop()!.replace(/\.[^.]+$/, '');
  const t0 = Date.now();
  const r: any = tagstackFrontier(text, enc);
  const secs = (Date.now() - t0) / 1000;
  const msg = r.message;
  fs.writeFileSync(`${outDir}/${name}.wire.txt`, msg, 'utf8');
  const toks = tokenStrings(msg, enc).map((t) => t.s);
  const census = new Map<string, { n: number; chars: number }>();
  const tokCount = new Map<string, number>();
  for (const t of toks) {
    const c = cls(t);
    const e = census.get(c) ?? { n: 0, chars: 0 };
    e.n++; e.chars += t.length;
    census.set(c, e);
    tokCount.set(t, (tokCount.get(t) ?? 0) + 1);
  }
  const lines = msg.split('\n');
  const lineCost = lines.map((l, i) => ({ i, n: countTokens(l + '\n', enc), head: l.slice(0, 60) }));
  const top = [...tokCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24);
  const row = {
    lane: name, path: p, srcRaw: countTokens(text, enc), F: r.messageTokens, parent: r.parentCodec,
    exact: r.decoded === text, msgChars: msg.length, msgTokensRecount: toks.length, secs: +secs.toFixed(1),
    census: Object.fromEntries([...census.entries()].sort((a, b) => b[1].n - a[1].n)),
    topTokens: top.map(([t, n]) => ({ t, n, cls: cls(t) })),
    costliestLines: lineCost.sort((a, b) => b.n - a.n).slice(0, 10),
    lines: lines.length,
  };
  summary.push(row);
  console.log(`\n===== ${name}  src raw=${row.srcRaw} F=${row.F} parent=${row.parent} exact=${row.exact} msgChars=${msg.length} lines=${lines.length} ${secs.toFixed(1)}s`);
  console.log('  token census: ' + [...census.entries()].sort((a, b) => b[1].n - a[1].n)
    .map(([c, e]) => `${c}=${e.n}(${(100 * e.n / toks.length).toFixed(1)}%,${e.chars}ch)`).join(' '));
  console.log('  top tokens: ' + top.slice(0, 16).map(([t, n]) => `${JSON.stringify(t)}×${n}`).join(' '));
  console.log('  costliest lines: ' + row.costliestLines.slice(0, 6).map((l) => `#${l.i}:${l.n}`).join(' '));
  console.log('  first 3 lines: ' + JSON.stringify(lines.slice(0, 3).map((l) => l.slice(0, 90)).join(' | ')).slice(0, 300));
  fs.writeFileSync('bench/x87/receipts/anatomy.json', JSON.stringify({ rows: summary }, null, 1) + '\n');
}
console.log('\n--- headroom ranking (F, and the digit+glyph share of the residual) ---');
for (const r of summary) {
  const c: any = r.census;
  const dg = (c.digit?.n ?? 0) + (c.glyph?.n ?? 0) + (c['num-punct']?.n ?? 0);
  console.log(`${r.lane.padEnd(20)} F=${String(r.F).padStart(5)}  digit+num+glyph=${String(dg).padStart(5)} (${(100 * dg / r.F).toFixed(1)}%)  lower=${c.lower?.n ?? 0} upper=${c.upper?.n ?? 0} mix=${c['ascii-mix']?.n ?? 0} space=${c.space?.n ?? 0}`);
}
