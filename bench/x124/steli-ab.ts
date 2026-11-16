/**
 * bench/x124/steli-ab.ts — X124. Balanced A/B of ΣΤΉΛΗ over the canonical 29.
 *
 * Both arms call the SAME shipped `tagstackEncode`; the only difference is
 * `OMEGA_NO_STELI`. Arm order alternates per lane, and the memo and the
 * ΣΥΝΕΔΡΙΑ scope are reset before every arm, exactly as bench/x123/ab.ts does,
 * because this stack shares one deterministic work meter across a process and a
 * lane's price therefore depends on how much work preceded it in that process.
 *
 * Run: CHUNK=0 PARTS=2 OMEGA_DET=1 node --max-old-space-size=6000 <out>.mjs
 * Receipts: bench/x124/receipts-steli-ab.jsonl (+ -messages.jsonl)
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { synedriaReset } from '../../src/lib/omega/synedria';
import { countTokens } from '../../src/lib/omega/bpe';

const enc = 'o200k_base' as const;
const all = fs.readFileSync('bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const CHUNK = Number(process.env.CHUNK ?? '0');
const PARTS = Number(process.env.PARTS ?? '1');
const lanes = all.filter((_, i) => i % PARTS === CHUNK);
const hash = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

function run(path: string, on: boolean) {
  if (on) delete process.env.OMEGA_NO_STELI;
  else process.env.OMEGA_NO_STELI = '1';
  tagstackMemoClear();
  synedriaReset();
  const text = fs.readFileSync(path, 'utf8');
  const t = performance.now(), cpu = process.cpuUsage();
  const r = tagstackEncode(text, enc);
  const dt = performance.now() - t, dc = process.cpuUsage(cpu);
  return {
    on, text,
    tokens: countTokens(r.message, enc),
    reported: r.messageTokens,
    exact: r.decoded === text,
    parent: r.parentCodec,
    messageSHA256: hash(r.message),
    frontierCosts: r.frontierCosts,
    wallMs: dt, cpuMs: (dc.user + dc.system) / 1000,
    notes: r.notes, message: r.message,
  };
}

for (let i = 0; i < lanes.length; i++) {
  const idx = all.indexOf(lanes[i]!);
  const p = lanes[i]!;
  const offFirst = idx % 2 === 0;
  const off = offFirst ? run(p, false) : run(p, true);
  const on = offFirst ? run(p, true) : run(p, false);
  const d = on.tokens - off.tokens;
  const row = {
    path: p, raw: countTokens(off.text, enc),
    offTokens: off.tokens, onTokens: on.tokens, deltaTokens: d,
    offExact: off.exact, onExact: on.exact,
    offReported: off.reported, onReported: on.reported,
    offParent: off.parent, onParent: on.parent,
    offFrontierCosts: off.frontierCosts, onFrontierCosts: on.frontierCosts,
    offWallMs: Math.round(off.wallMs), onWallMs: Math.round(on.wallMs),
    offCpuMs: Math.round(off.cpuMs), onCpuMs: Math.round(on.cpuMs),
    offMessageSHA256: off.messageSHA256, onMessageSHA256: on.messageSHA256,
    armOrder: offFirst ? 'off-first' : 'on-first',
    onNotes: on.notes,
  };
  console.log(`${p.padEnd(42)} off=${String(off.tokens).padStart(5)} on=${String(on.tokens).padStart(5)} Δ=${String(d).padStart(4)} exact=${off.exact && on.exact} offMs=${row.offWallMs} onMs=${row.onWallMs} ${d < 0 ? 'WIN' : d > 0 ? 'LOSS' : 'same'}`);
  fs.appendFileSync('bench/x124/receipts-steli-ab.jsonl', JSON.stringify(row) + '\n');
  fs.appendFileSync('bench/x124/receipts-steli-ab-messages.jsonl', JSON.stringify({ path: p, deltaTokens: d, offTokens: off.tokens, onTokens: on.tokens, message: on.message }) + '\n');
}
