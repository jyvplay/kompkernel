/**
 * Consult the WHOLE exact registry, not the eight parents TAGSTACK compares.
 * For each lane: does any registered exact codec emit a complete message
 * strictly below the shipped frontier? Every candidate is required to decode
 * back to the source before it is counted.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { codecEntries } from '../../src/lib/omega/registry';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
const rows: any[] = [];
(async () => {
  const entries = (codecEntries() as any[]).filter((e) => e.family === 'exact' && e.fidelity === 'exact');
  console.error(`registry exact codecs: ${entries.length}`);
  for (const p of process.argv.slice(2)) {
    const text = fs.readFileSync(p, 'utf8');
    const f: any = tagstackEncode(text, enc);
    const best: any = { key: '(frontier)', tok: f.messageTokens };
    const scored: Array<[string, number]> = [];
    for (const e of entries) {
      if (only && !only.has(e.key)) continue;
      const t0 = Date.now();
      try {
        const r: any = await e.run(text, enc);
        if (r.decoded === text && typeof r.output === 'string') {
          const tok = countTokens(r.output, enc);
          scored.push([e.key, tok]);
          if (tok < best.tok) { best.key = e.key; best.tok = tok; }
        }
      } catch { /* fail closed */ }
      if (Date.now() - t0 > 120000) console.error(`  (slow: ${e.key} ${Date.now() - t0}ms)`);
    }
    scored.sort((a, b) => a[1] - b[1]);
    rows.push({ path: p, raw: countTokens(text, enc), frontier: f.messageTokens, frontierWinner: f.parentCodec, best });
    console.error(`${p}\n  raw ${countTokens(text, enc)} frontier ${f.messageTokens} (${f.parentCodec}) | registry best ${best.key} ${best.tok} | below frontier: ${scored.filter(s => s[1] < f.messageTokens).map(s => s[0] + '=' + s[1]).join(' ') || 'none'}`);
    fs.mkdirSync('bench/x71/receipts', { recursive: true });
    fs.writeFileSync('bench/x71/receipts/sweep.json', JSON.stringify(rows, null, 1) + '\n');
  }
})();
