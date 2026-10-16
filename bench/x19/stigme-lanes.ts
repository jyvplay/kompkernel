// X19: full STIGME encode over a lane list. usage: node bundle.mjs <lane...>
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { stigmeEncode, stigmeDecode } from '@/lib/omega/stigme';

const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2).filter(Boolean)) {
  const text = fs.readFileSync(f, 'utf8');
  const rawTok = countTokens(text, enc);
  let r: any;
  try { r = stigmeEncode(text, enc); }
  catch (e: any) { console.log(JSON.stringify({ file: f, status: 'ERR', err: String(e?.message ?? e).slice(0, 140) })); continue; }
  const decoded = stigmeDecode(r.wire, r.arm, r.plan, r.armState);
  console.log(JSON.stringify({
    file: f, raw: rawTok, M: r.messageTokens, base: r.baseTokens,
    exact: r.decoded === text, decodeExact: decoded === text,
    delta: r.messageTokens - r.baseTokens, vsRaw: r.messageTokens - rawTok,
    mode: r.mode, arm: r.arm, shapes: r.shapes, packed: r.packed, escapes: r.escapes,
    rawDelta: r.rawDelta, contract: r.contractTokens, notes: r.notes,
  }));
}
