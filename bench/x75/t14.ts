/** X75 / t14 — print the instruction lines of the frontier message, JSON-escaped. */
import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const r: any = tagstackFrontier(t, enc);
  const lines = r.message.split('\n');
  console.log(`\n=== ${p} tok ${r.messageTokens} parent ${r.parentCodec} lines ${lines.length}`);
  lines.forEach((l: string, i: number) => {
    const isTape = l.includes('§');
    const prose = l.length > 40 && /\.$/.test(l.trim()) && !/\d/.test(l) && !isTape;
    if (prose) console.log(`  [${i}] ${JSON.stringify(l)}`);
  });
}
