// X40 verification: PERITROPE vs ANTISTROPHE, with an independent reference
// decode.  The decoder applies the stack, then ANTISTROPHE's exchange if any,
// then PERITROPE's (disjoint, so order within the set does not matter), and the
// result must equal the source byte for byte.
import * as fs from 'node:fs';
import { peritropeEncode, peritropeDecode } from '@/lib/omega/peritrope';
import { chironDecode } from '@/lib/omega/chiron';
const enc: any = 'o200k_base';
const show = (c: string) => (c === ' ' ? '␠' : c === '\t' ? '\\t' : c);
for (const p of (process.env.LANES || '').split(',').filter(Boolean)) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  let r: any;
  const so: any = {};
  if (process.env.PERI_W) so.width = Number(process.env.PERI_W);
  if (process.env.PERI_D) so.depth = Number(process.env.PERI_D);
  if (process.env.PERI_CAP) so.cap = Number(process.env.PERI_CAP);
  try { r = peritropeEncode(t, enc, { peritropeSearch: so }); } catch (e: any) {
    console.log(p.split('/').pop()!.padEnd(26), 'THREW', String(e).slice(0, 70)); continue;
  }
  const back = peritropeDecode(r.wire, {
    stats: r.stats, order: r.order,
    undo: r.parent === 'identity' ? (w: string) => w : chironDecode,
  } as any, {
    alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup,
    framing: r.framing, ouraShape: r.ouraShape, ouraMode: r.ouraMode,
    ouraSentinel: r.ouraSentinel, antistrophePair: r.antistrophePair,
    peritropePairs: r.peritropePairs,
  } as any);
  const ch = r.peritropePairs.length
    ? r.peritropePairs.map((x: [string, string]) => show(x[0]) + show(x[1])).join(',') : '-';
  console.log(
    p.split('/').pop()!.padEnd(26),
    'tok=' + String(r.messageTokens).padStart(5),
    'peri=' + (r.peritrope ? 'Y' : 'n'),
    'gain=' + String(r.peritropeGain).padStart(4),
    'k=' + r.peritropePairs.length,
    'chain=' + ch.padEnd(14),
    'anti=' + (r.antistrophe ? 'Y' : 'n'),
    (back === t ? 'EXACT' : '***MISMATCH***'),
    ((Date.now() - t0) / 1000).toFixed(0) + 's',
  );
}
