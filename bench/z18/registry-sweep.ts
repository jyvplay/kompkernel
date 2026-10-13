// Full registry sweep on one file: every codec entry, its output's non-ASCII count, one-chat tokens, decode check.
// Rows are appended as they finish, so a timeout keeps the partial receipt.
import fs from 'node:fs';
import { codecEntries } from '@/lib/omega/registry';
import { countTokens } from '@/lib/omega/bpe';
const file = process.argv[2];
const out = process.argv[3];
const t = fs.readFileSync(file, 'utf8');
const nonAscii = (s: string) => { let n = 0; for (const ch of s) if (ch.codePointAt(0)! > 127) n++; return n; };
fs.writeFileSync(out, '');
const identity = countTokens(t, 'o200k_base');
fs.appendFileSync(out, JSON.stringify({ kind: 'identity', tokens: identity, nonAscii: 0 }) + '\n');
(async () => {
  for (const e of codecEntries()) {
    const t0 = Date.now();
    let row: any;
    try {
      const r: any = await e.run(t, 'o200k_base');
      const wire: string = r.output ?? t;
      row = { key: e.key, ms: Date.now() - t0, oneChat: r.oneChat ?? countTokens(wire, 'o200k_base'), outTokens: countTokens(wire, 'o200k_base'), nonAscii: nonAscii(wire), decodedOk: (r.decoded ?? t) === t, fidelity: e.fidelity };
    } catch (err: any) {
      row = { key: e.key, ms: Date.now() - t0, error: String(err?.message ?? err).slice(0, 120) };
    }
    fs.appendFileSync(out, JSON.stringify(row) + '\n');
  }
  fs.appendFileSync(out, '{"kind":"done"}\n');
})();
