/**
 * X73 probe 8 — is the frontier actually the frontier on the lanes where it
 * compresses NOTHING?
 *
 * uptime -w (80 tok), free -m (76), lsblk (60): the frontier returns the source
 * unchanged on all three, because its 11-token contract plus its wire is not
 * cheaper than the text. If ANY registered codec beats the source on those lanes,
 * then the frontier is not the minimum of the stack there, and a codec that
 * simply takes the minimum would win a lane outright.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { codecEntries } from '../../src/lib/omega/registry';
const enc: any = 'o200k_base';
const entries = codecEntries();
console.error(`codecs ${entries.length}`);
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const raw = countTokens(t, enc);
  const rows: Array<[string, number, boolean, number]> = [];
  for (const e of entries) {
    const t0 = Date.now();
    try {
      const r: any = await e.run(t, enc);
      const tok = r.oneChat ?? countTokens(r.output ?? '', enc);
      const ok = r.decoded === t;
      rows.push([e.key, tok, ok, Date.now() - t0]);
    } catch { /* codec refused */ }
  }
  rows.sort((a, b) => a[1] - b[1]);
  const winners = rows.filter(r => r[1] < raw && r[2]).slice(0, 6);
  console.log(`${p.split('/').pop().padEnd(18)} raw/frontier ${raw} | best 6 exact-below: ${winners.map(w => `${w[0]}:${w[1]}(${w[3]}ms)`).join(' ') || 'NONE'}`);
}
